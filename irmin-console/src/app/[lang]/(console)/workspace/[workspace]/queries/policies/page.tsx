import QueryPoliciesSection from '@/components/query/QueryPoliciesSection';

/**
 * Query Policies page in the workspace
 */
export default async function QueriesPoliciesPage(props: {
  searchParams: Promise<{ queryID?: string }>;
}) {
  const searchParams = await props.searchParams;

  return <QueryPoliciesSection queryID={searchParams.queryID} />;
}
