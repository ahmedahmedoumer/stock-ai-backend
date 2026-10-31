import { Embeddings } from '@langchain/core/embeddings';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';

export function llmProvider() {
  return (process.env.LLM_PROVIDER ?? 'openai').trim().toLowerCase();
}

export function embeddingProvider() {
  return (process.env.EMBEDDING_PROVIDER ?? llmProvider()).trim().toLowerCase();
}

export function embeddingDimensions() {
  if (process.env.EMBEDDING_DIMENSIONS) {
    return Number(process.env.EMBEDDING_DIMENSIONS);
  }
  // text-embedding-3-small default
  return 1536;
}

export function supportDocsTable() {
  if (process.env.SUPPORT_DOCS_TABLE) return process.env.SUPPORT_DOCS_TABLE;
  return 'support_docs_openai';
}

export function createChatModel(): BaseChatModel {
  return new ChatOpenAI({
    model: process.env.OPENAI_CHAT_MODEL ?? 'gpt-4o',
    temperature: 0.2,
    apiKey: process.env.OPENAI_API_KEY,
  });
}

export function createEmbeddings(): Embeddings {
  return new OpenAIEmbeddings({
    model: process.env.OPENAI_EMBEDDING_MODEL ?? 'text-embedding-3-small',
    apiKey: process.env.OPENAI_API_KEY,
    dimensions: embeddingDimensions(),
  });
}
