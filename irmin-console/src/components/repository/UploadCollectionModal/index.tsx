import { initCore } from '@/lib/initCore';
import { initDict } from '@/lib/initDict';

import UploadCollectionModalContent from './UploadCollectionModalContent';

/**
 * Upload collection modal component
 *
 * @param props - The component props
 * @param props.currentRepository - The current repository slug
 * @param props.currentRef - The current ref (e.g., branch)
 */
export default async function UploadCollectionModal({
  currentRepository,
  currentRef,
}: {
  currentRepository?: string;
  currentRef?: string;
}) {
  const irminCore = await initCore();
  const { dict } = await initDict();

  return (
    <UploadCollectionModalContent
      irminCore={irminCore}
      dict={dict}
      currentRepository={currentRepository}
      currentRef={currentRef}
    />
  );
}
