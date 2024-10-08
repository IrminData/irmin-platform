'use client';

import { useCallback, useMemo } from 'react';

import { TbFile, TbFolder, TbTable } from 'react-icons/tb';

import { Badge } from '@/components/ui/badge';
import NormalList from '@/components/ui/list/NormalList';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useRepository } from '@/context/RepositoryContext';

import { Collection } from '@/types/core/Collection';
import { GridRow } from '@/types/internal/ListProps';

import LastModificationModalContent from '../commits/LastModificationModalContent';

/**
 * Component to display a list of collections
 *
 * @param props - The props
 * @param props.collections - The list of collections to display
 * @param props.selectedCollectionID - The currently selected collection
 * @param props.setSelectedCollectionID - The function to set the selected collection
 * @param props.loading - Whether the collections are loading
 */
export default function CollectionList({
  collections,
  selectedCollectionID,
  setSelectedCollectionID,
  loading,
}: {
  collections: Collection[];
  selectedCollectionID: string | null;
  setSelectedCollectionID: (collection: string | null) => void;
  loading?: boolean;
}) {
  const { dict, locale } = useLocale();
  const { irminModal } = usePopup();
  const { fetchLastModification, viewRef } = useRepository();

  const showLastModification = useCallback(
    async (collection: Collection) => {
      const lastModification = await fetchLastModification(collection.id);
      if (!lastModification) return;
      irminModal.show(
        `${dict.repository.collections.lastModification} - ${collection.type} ${collection.name}`,
        <LastModificationModalContent
          closeModal={irminModal.close}
          viewRef={viewRef}
          commit={lastModification}
        />
      );
    },
    [dict, fetchLastModification, irminModal, viewRef]
  );

  const getIconByType = (type: string) => {
    switch (type) {
      case 'folder':
        return <TbFolder size={22} className='text-blue-500' />;
      case 'file':
        return <TbFile size={22} className='text-gray-500' />;
      case 'table':
        return <TbTable size={22} className='text-green-500' />;
      default:
        return <TbFile size={22} />;
    }
  };

  const rows: GridRow[] = useMemo(
    () =>
      collections.map((item, i) => ({
        columns: [
          <div
            key={`collection-${i}-type-and-name`}
            className='inline-flex flex-row items-center gap-4 py-1'
          >
            {getIconByType(item.type)}
            <div className='flex flex-col gap-1'>
              <div className='flex flex-row items-center gap-1'>
                <span className='text-sm'>{item.name}</span>
                {item.is_immutable && (
                  <Badge variant='secondary'>{dict.list.immutable}</Badge>
                )}
              </div>
              <span className='text-xs opacity-70'>
                {dict.repository.schema.type}: {item.type}
              </span>
            </div>
          </div>,
          <div
            key={`collection-${i}-last-modified-and-size`}
            className='inline-flex flex-col gap-1'
          >
            <span className='text-xs opacity-70'>
              {new Date(item.last_modified).toLocaleString(locale)}
            </span>
            {item.size && (
              <span className='text-xs opacity-70'>
                {dict.misc.size}: {item.size / 1024} KB
              </span>
            )}
          </div>,
        ],
        actions: (() => {
          const newActions: GridRow['actions'] = [
            {
              label: dict.repository.collections.lastModification,
              onClick: () => showLastModification(item),
              primary: false,
            },
          ];
          if (item.id === selectedCollectionID) {
            newActions.push({
              label: dict.misc.selected,
              onClick: () => setSelectedCollectionID(null),
              primary: true,
            });
          } else {
            newActions.push({
              label: dict.list.view,
              onClick: () => setSelectedCollectionID(item.id),
              primary: true,
            });
          }
          return newActions;
        })(),
      })) ?? [],
    [
      dict,
      locale,
      showLastModification,
      setSelectedCollectionID,
      selectedCollectionID,
      collections,
    ]
  );

  return (
    <div id='collections-list' className='mb-4'>
      <NormalList
        headers={[
          dict.list.description,
          `${dict.misc.lastModified} & ${dict.misc.size}`,
          dict.list.actions,
        ]}
        hideHeaders={false}
        loading={loading}
        rows={rows}
      />
    </div>
  );
}
