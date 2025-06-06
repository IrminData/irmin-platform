import ConnectionPoliciesSection from '@/components/connection/ConnectionPoliciesSection';

import { SingleConnectionLayoutParams } from '../layout';

/**
 * Page for the Connection policies
 */
export default async function ConnectionPoliciesPage(props: {
  params: Promise<SingleConnectionLayoutParams>;
}) {
  const params = await props.params;
  return <ConnectionPoliciesSection connectionID={params.connection} />;
}
