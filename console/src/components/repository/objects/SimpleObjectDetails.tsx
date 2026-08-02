'use client';

import type { ObjectSchema } from '@/types/core/ObjectSchema';
import type { RepositoryObject } from '@/types/core/RepositoryObject';

import ObjectDetails from './ObjectDetails';

/**
 * Simplified ObjectDetails component for use on the single object page.
 * This component hides the "view" button since the user is already viewing the object.
 *
 * @param props - The component props
 * @param props.selectedObject - The selected object to display details for
 * @param props.setCurrentPath - (optional) The function to set the current path
 * @param props.selectedObjectSchema - (optional) The schema of the selected object
 */
export default function SimpleObjectDetails({
  setCurrentPath,
  selectedObject,
  selectedObjectSchema,
}: {
  setCurrentPath?: (_path: string) => void;
  selectedObject?: RepositoryObject;
  selectedObjectSchema?: ObjectSchema;
}) {
  return (
    <ObjectDetails
      selectedObject={selectedObject}
      selectedObjectSchema={selectedObjectSchema}
      setCurrentPath={setCurrentPath}
      hideViewButton={true}
    />
  );
}
