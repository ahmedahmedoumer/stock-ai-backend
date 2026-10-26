import { tool } from 'langchain';
import { z } from 'zod';

export type LiveApi = {
  searchDocs: (query: string) => Promise<unknown>;
  dashboard: () => Promise<unknown>;
  products: () => Promise<unknown>;
  product: (id: number) => Promise<unknown>;
  warehouses: () => Promise<unknown>;
  warehouse: (id: number) => Promise<unknown>;
  stock: () => Promise<unknown>;
  sales: () => Promise<unknown>;
  purchases: () => Promise<unknown>;
};

const live = z.object({
  confirm: z
    .boolean()
    .optional()
    .describe('Set true to fetch current live data from the stock APIs'),
});

async function asJson(run: () => Promise<unknown>) {
  try {
    return JSON.stringify(await run());
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return JSON.stringify({ error: message });
  }
}

export function buildSupportTools(api: LiveApi) {
  return [
    tool(
      async ({ query }) => asJson(() => api.searchDocs(query)),
      {
        name: 'search_help_docs',
        description:
          'Search static help articles (how-to, shipping, refunds, passwords). Never use this for live stock, sales, or product counts.',
        schema: z.object({
          query: z.string().describe('Help-article search query'),
        }),
      },
    ),
    tool(
      async () => asJson(api.dashboard),
      {
        name: 'get_dashboard',
        description:
          'Call GET /dashboard for live product/warehouse counts, units on hand, sales and purchase totals, low stock, and recent activity.',
        schema: live,
      },
    ),
    tool(
      async () => asJson(api.products),
      {
        name: 'list_products',
        description:
          'Call GET /products for the live catalog: SKU, prices, and quantity on hand.',
        schema: live,
      },
    ),
    tool(
      async ({ id }) => asJson(() => api.product(Number(id))),
      {
        name: 'get_product',
        description:
          'Call GET /products/:id for one product plus stock by warehouse.',
        schema: z.object({
          id: z.number().int().describe('Product id'),
        }),
      },
    ),
    tool(
      async () => asJson(api.warehouses),
      {
        name: 'list_warehouses',
        description: 'Call GET /warehouses for live warehouses and units in each.',
        schema: live,
      },
    ),
    tool(
      async ({ id }) => asJson(() => api.warehouse(Number(id))),
      {
        name: 'get_warehouse',
        description:
          'Call GET /warehouses/:id for one warehouse and the products stored there.',
        schema: z.object({
          id: z.number().int().describe('Warehouse id'),
        }),
      },
    ),
    tool(
      async () => asJson(api.stock),
      {
        name: 'list_stock',
        description:
          'Call GET /stock for live quantity of every product in every warehouse.',
        schema: live,
      },
    ),
    tool(
      async () => asJson(api.sales),
      {
        name: 'list_sales',
        description: 'Call GET /sales for live sales history.',
        schema: live,
      },
    ),
    tool(
      async () => asJson(api.purchases),
      {
        name: 'list_purchases',
        description: 'Call GET /purchases for live purchase / receiving history.',
        schema: live,
      },
    ),
  ];
}

export const LIVE_API_TOOLS = new Set([
  'get_dashboard',
  'list_products',
  'get_product',
  'list_warehouses',
  'get_warehouse',
  'list_stock',
  'list_sales',
  'list_purchases',
]);
