/**
 * Synchronous catalog accessors for marketing pages.
 *
 * These wrap the read-model's sync functions for use at module level
 * in client components where async/await isn't available. Only the
 * marketing surface should use these — app routes use the async
 * DataProvider via useProviderQuery.
 */

export {
  listMarketplaceAgentTemplates,
  listMarketplaceWorkflowTemplates,
  listPackTemplates,
} from '@/lib/demo/read-model';
