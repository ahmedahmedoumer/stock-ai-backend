import 'dotenv/config';
import { Injectable, Logger } from '@nestjs/common';
import { ChatBedrockConverse, BedrockEmbeddings } from '@langchain/aws';
import { PGVectorStore } from '@langchain/community/vectorstores/pgvector';
import {
  AIMessage,
  BaseMessage,
  HumanMessage,
  SystemMessage,
  ToolMessage,
  isAIMessage,
} from '@langchain/core/messages';
import { DashboardService } from '../dashboard/dashboard.service.js';
import { ProductService } from '../product/product.service.js';
import { PurchaseService } from '../purchase/purchase.service.js';
import { SaleService } from '../sale/sale.service.js';
import { StockService } from '../stock/stock.service.js';
import { WarehouseService } from '../warehouse/warehouse.service.js';
import { LIVE_API_TOOLS, buildSupportTools } from './chat-tools.js';

const memoryStore = new Map<string, BaseMessage[]>();

const SYSTEM_PROMPT = `You are a helpful customer support agent for Stock Manager (products, warehouses, sales, and purchases).

Use search_help_docs only for how-to questions and policies (password reset, shipping times, refunds, how to record a sale).

For any current system data — counts, quantities, prices, product lists, warehouse contents, sales, purchases, low stock, "how many", "what do we have" — you MUST call the matching live API tool (get_dashboard, list_products, get_product, list_warehouses, get_warehouse, list_stock, list_sales, list_purchases). Never invent numbers and never use help articles as live inventory.

Call tools first, then answer in plain language from the tool results.`;

function messageText(message: BaseMessage): string {
  const content = message.content;
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content
    .map((part) => {
      if (typeof part === 'string') return part;
      if (part && typeof part === 'object' && 'text' in part) {
        return String((part as { text?: string }).text ?? '');
      }
      return '';
    })
    .join('');
}

function lastAssistantText(messages: BaseMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i];
    if (!isAIMessage(message)) continue;
    if (message.tool_calls && message.tool_calls.length > 0) continue;
    const text = messageText(message).trim();
    if (text) return text;
  }
  return 'I could not produce an answer from the available data.';
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private vectorStore: PGVectorStore;
  private embeddings: BedrockEmbeddings;
  private model: ChatBedrockConverse;

  constructor(
    private readonly products: ProductService,
    private readonly warehouses: WarehouseService,
    private readonly stock: StockService,
    private readonly sales: SaleService,
    private readonly purchases: PurchaseService,
    private readonly dashboard: DashboardService,
  ) {
    // 1. Amazon Bedrock Embeddings (Titan Embeddings V2 / 1024 or 1536 dims)
    this.embeddings = new BedrockEmbeddings({
      model: 'amazon.titan-embed-text-v2:0',
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });

    // 2. Amazon Bedrock Chat Model (Claude 3.5 Sonnet / Nova Pro via Converse API)
    this.model = new ChatBedrockConverse({
      model: 'anthropic.claude-3-5-sonnet-20240620-v1:0', // or amazon.nova-pro-v1:0
      temperature: 0.2,
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
  }

  async initVectorStore() {
    this.vectorStore = await PGVectorStore.initialize(this.embeddings, {
      postgresConnectionOptions: {
        connectionString: process.env.DATABASE_URL,
      },
      tableName: 'support_docs',
      columns: {
        idColumnName: 'id',
        contentColumnName: 'content',
        vectorColumnName: 'embedding',
        metadataColumnName: 'metadata',
      },
      dimensions: 1024, // Matches Titan Embed Text V2 default output dimension
    });
  }

  async seedInitialDocs() {
    if (!this.vectorStore) await this.initVectorStore();

    const { rows } = await this.vectorStore.pool.query<{ n: number }>(
      'SELECT count(*)::int AS n FROM support_docs',
    );
    if ((rows[0]?.n ?? 0) === 0) {
      await this.vectorStore.addDocuments([
        { pageContent: 'To reset your password, click on "Forgot Password" on the login screen and follow the email link.', metadata: { category: 'auth' } },
        { pageContent: 'Our standard shipping takes 3-5 business days within the country.', metadata: { category: 'shipping' } },
        { pageContent: 'You can request a full refund within 30 days of purchase through your account dashboard.', metadata: { category: 'billing' } },
      ]);
    }

    const inventory = await this.vectorStore.pool.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM support_docs WHERE metadata->>'category' = 'inventory'`,
    );
    if ((inventory.rows[0]?.n ?? 0) === 0) {
      await this.vectorStore.addDocuments([
        { pageContent: 'To add a product, open Products, enter SKU, name, selling price and cost price, then save. Stock starts at zero until you record a purchase into a warehouse.', metadata: { category: 'inventory' } },
        { pageContent: 'Record a purchase to receive stock into a warehouse. Record a sale to ship stock out of a warehouse. A sale is rejected if that warehouse does not have enough quantity.', metadata: { category: 'inventory' } },
        { pageContent: 'The dashboard shows product count, warehouse count, units on hand, sales revenue, purchase cost, and low-stock rows (fewer than 5 units). For live numbers, the assistant calls the stock APIs.', metadata: { category: 'inventory' } },
      ]);
    }
  }

  private async searchDocs(query: string) {
    const docs = await this.vectorStore.asRetriever({ k: 2 }).invoke(query);
    if (!docs.length) return { articles: [] as string[] };
    return { articles: docs.map((doc) => doc.pageContent) };
  }

  private supportTools() {
    return buildSupportTools({
      searchDocs: (query) => this.searchDocs(query),
      dashboard: () => this.dashboard.summary(),
      products: () => this.products.findAll(),
      product: (id) => this.products.findOne(id),
      warehouses: () => this.warehouses.findAll(),
      warehouse: (id) => this.warehouses.findOne(id),
      stock: () => this.stock.findAll(),
      sales: () => this.sales.findAll(),
      purchases: () => this.purchases.findAll(),
    });
  }

  private async runToolAgent(history: BaseMessage[], userQuery: string) {
    const tools = this.supportTools();
    const llm = this.model.bindTools(tools);
    const messages: BaseMessage[] = [
      new SystemMessage(SYSTEM_PROMPT),
      ...history,
      new HumanMessage(userQuery),
    ];
    const used: string[] = [];

    for (let step = 0; step < 6; step += 1) {
      const ai = await llm.invoke(messages);
      messages.push(ai);
      const calls = ai.tool_calls ?? [];
      if (!calls.length) break;

      for (const call of calls) {
        const selected = tools.find((item) => item.name === call.name) as
          | { invoke: (input: Record<string, unknown>) => Promise<unknown> }
          | undefined;
        this.logger.log(`Calling live tool ${call.name}`);
        used.push(call.name);
        const output = selected
          ? await selected.invoke((call.args ?? {}) as Record<string, unknown>)
          : JSON.stringify({ error: `Unknown tool ${call.name}` });
        messages.push(
          new ToolMessage({
            content: typeof output === 'string' ? output : JSON.stringify(output),
            tool_call_id: call.id ?? call.name,
            name: call.name,
          }),
        );
      }
    }

    return {
      answer: lastAssistantText(messages),
      tools: [...new Set(used)],
    };
  }

  async handleChatMessage(sessionId: string, userQuery: string) {
    await this.seedInitialDocs();

    if (!memoryStore.has(sessionId)) {
      memoryStore.set(sessionId, []);
    }
    const chatHistory = memoryStore.get(sessionId)!;

    const { answer, tools } = await this.runToolAgent(chatHistory, userQuery);
    const usedLiveData = tools.some((name) => LIVE_API_TOOLS.has(name));

    chatHistory.push(new HumanMessage(userQuery));
    chatHistory.push(new AIMessage(answer));

    return {
      answer,
      sessionId,
      usedLiveData,
      tools,
    };
  }
}