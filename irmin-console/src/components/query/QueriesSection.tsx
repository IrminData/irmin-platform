'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { MdPlayArrow } from 'react-icons/md';
import { TbChevronRight, TbFile, TbPencil, TbTrash, TbX } from 'react-icons/tb';

import { createQuery, deleteQuery, updateQuery } from '@/lib/actions/query';

import CodeMirrorEditor from '@/components/editor/ide/CodeMirrorEditor';
import QueryResults from '@/components/query/QueryResults';
import { Badge } from '@/components/ui/badge';
import Button from '@/components/ui/button';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useQuery } from '@/context/QueryContext';

import { Query } from '@/types/core/StoredQuery';

import CreateSavedQueryModal from './CreateQueryModal';
import UpdateQueryModal from './UpdateQueryModal';

/**
 * Queries section
 *
 * Provides a section to edit queries and view query results
 *
 * @param props - The component props
 * @param props.initialQueries - The saved queries of the workspace
 */
export default function QueriesSection({
  initialQueries,
}: {
  initialQueries: Query[];
}) {
  const { dict } = useLocale();
  const { irminModal, irminAlert, irminConfirm } = usePopup();
  const [queries, setQueries] = useState<Query[]>(initialQueries);
  const query = useQuery();

  const [selectedQuery, setSelectedQuery] = useState<Query | null>(null);
  const [editorContent, setEditorContent] = useState<string>('');
  const [edited, setEdited] = useState<boolean>(false);

  const queryContentId = useRef<string>(null);
  useEffect(() => {
    if (!selectedQuery) return;
    if (queryContentId.current === selectedQuery.id) return;
    queryContentId.current = selectedQuery.id;
    setEditorContent(selectedQuery.content);
    setEdited(false);
    // If the selected query has a stored result, display it
    if (selectedQuery.stored) query.getQueryResult(selectedQuery.id, 1);
  }, [selectedQuery, query]);

  /**
   * Hook to create a new query by showing a modal to input the query name and description
   * and then creating the query.
   */
  const handleCreateQuery = useMemo(
    () => async () => {
      irminModal.show(
        dict.query.newQuery,
        <CreateSavedQueryModal
          createQuery={async (queryName: string, queryDescription: string) => {
            const res = await createQuery(
              'sql',
              editorContent,
              queryName,
              queryDescription,
              true,
              false
            );
            if (!res.data) {
              irminAlert('error', res.message ?? 'Failed to create query');
              return;
            }
            irminAlert('success', res.message ?? 'Query created successfully');
            irminModal.close();
            setQueries((prev) => {
              if (!res.data) return prev;
              return [...prev, res.data];
            });
            setSelectedQuery(res.data);
            setEdited(false);
          }}
        />,
        () => irminModal.close()
      );
    },
    [irminModal, dict, irminAlert, editorContent]
  );

  /**
   * Hook to save the currently selected query with the updated content
   */
  const handleSaveQuery = useMemo(
    () => async () => {
      try {
        if (!selectedQuery) throw new Error('No query selected');
        const res = await updateQuery(selectedQuery.id, 'sql', editorContent);
        if (!res.data) throw new Error(res.message ?? 'Query not found');
        setQueries((prev) => {
          if (!res.data) return prev;
          const idx = prev.findIndex((q) => q.id === selectedQuery?.id);
          if (idx === -1) return prev;
          prev[idx] = res.data;
          return [...prev];
        });
        setEdited(false);
        irminAlert('success', res.message ?? 'Query updated successfully');
      } catch (error) {
        irminAlert(
          'error',
          (error as Error).message ?? 'Failed to update query'
        );
        console.error(error);
      }
    },
    [selectedQuery, editorContent, irminAlert]
  );

  /**
   * Hook to run the current editor content as a query
   * and display the results in the results section
   */
  const handleRunQuery = useMemo(
    () => async () => {
      query.executeScript('sql', editorContent);
    },
    [query, editorContent]
  );

  /**
   * Hook to edit the currently selected query by showing a modal to input the new query name and description
   * and then updating the query.
   */
  const handleEditQuery = useMemo(
    () => async () => {
      if (!selectedQuery) return;
      irminModal.show(
        dict.query.newQuery,
        <UpdateQueryModal
          currentName={selectedQuery.name}
          currentDescription={selectedQuery.description}
          updateQuery={async (queryName: string, queryDescription: string) => {
            try {
              const res = await updateQuery(
                selectedQuery.id,
                'sql',
                editorContent,
                queryName,
                queryDescription
              );
              if (!res.data) throw new Error(res.message ?? 'Query not found');
              setQueries((prev) => {
                if (!res.data) return prev;
                const idx = prev.findIndex((q) => q.id === selectedQuery?.id);
                if (idx === -1) return prev;
                prev[idx] = res.data;
                return [...prev];
              });
              setEdited(false);
              irminAlert(
                'success',
                res.message ?? 'Query updated successfully'
              );
              irminModal.close();
            } catch (error) {
              irminAlert(
                'error',
                (error as Error).message ?? 'Failed to update query'
              );
              console.error(error);
              irminModal.close();
            }
          }}
        />,
        () => irminModal.close()
      );
    },
    [irminModal, dict, irminAlert, selectedQuery, editorContent]
  );

  /**
   * Hook to delete the currently selected query
   */
  const handleDeleteQuery = useMemo(
    () => async () => {
      if (!selectedQuery) return;
      const confirmed = await irminConfirm(
        'warning',
        `${dict.common.areYouSureYouWantToDelete}: ${selectedQuery.name}`
      );
      if (!confirmed) return;
      try {
        const res = await deleteQuery(selectedQuery.id);
        setQueries((prev) => prev.filter((q) => q.id !== selectedQuery.id));
        setSelectedQuery(null);
        setEdited(false);
        irminAlert('success', res.message ?? 'Query deleted successfully');
      } catch (error) {
        irminAlert(
          'error',
          (error as Error).message ?? 'Failed to delete query'
        );
        console.error(error);
      }
    },
    [selectedQuery, dict, irminAlert, irminConfirm]
  );

  /**
   * Hook to update the editor content and set the edited flag
   *
   * @param content - The new content of the editor
   */
  const updateEditorContent = useMemo(
    () => (content: string) => {
      setEditorContent(content);
      setEdited(true);
    },
    []
  );

  return (
    <div className='bg-background flex h-full w-full flex-col'>
      <div className='flex h-full flex-col lg:flex-row lg:overflow-y-scroll'>
        <div className='border-border order-3 flex min-h-80 w-full flex-col overflow-y-scroll border-t lg:order-1 lg:w-80 lg:border-0 lg:border-r'>
          <div className='p-4'>
            <Button className='w-full' onClick={handleCreateQuery}>
              {dict.query.newQuery}
            </Button>
          </div>
          {queries.map((query, idx) => (
            <div
              className={`border-border hover:bg-card flex cursor-pointer flex-row items-center justify-between gap-2 border-b p-4 transition-all ${selectedQuery?.id === query.id ? 'bg-card' : ''} `}
              key={`query-${idx}`}
              onClick={() => setSelectedQuery(query)}
            >
              <div className='flex flex-col gap-1'>
                <p className='text-sm'>{query.name}</p>
                <p className='text-foreground/50 text-xs'>
                  {query.description}
                </p>
              </div>
              <div>
                <TbChevronRight size={22} />
              </div>
            </div>
          ))}
        </div>
        <div className='order-1 h-full lg:order-2 lg:grow lg:overflow-y-scroll'>
          <CodeMirrorEditor
            language='sql'
            content={editorContent}
            updateEditorContent={updateEditorContent}
          />
        </div>
        {selectedQuery && (
          <div className='border-border relative order-2 flex w-full flex-col gap-2 border-t p-4 lg:order-3 lg:w-80 lg:overflow-y-scroll lg:border-0 lg:border-l'>
            <Button
              size={'icon'}
              variant={'ghost'}
              onClick={() => setSelectedQuery(null)}
              icon={<TbX size={22} />}
              className='absolute top-2 right-2'
            ></Button>
            <Badge className='mt-2'>{dict.query.selectedQuery}</Badge>
            <p className='text-sm'>{selectedQuery.name}</p>
            <p className='text-foreground/50 mb-2 pb-2 text-xs'>
              {selectedQuery.description}
            </p>
            <Button
              variant='default'
              size='sm'
              className='w-full'
              icon={<TbFile />}
              onClick={handleSaveQuery}
              disabled={!edited}
            >
              {dict.common.save}
            </Button>
            <Button
              variant='accent'
              size='sm'
              className='w-full'
              icon={<MdPlayArrow />}
              onClick={handleRunQuery}
              disabled={query.loading}
            >
              {dict.query.run}
            </Button>
            <Button
              variant='secondary'
              size='sm'
              className='w-full'
              icon={<TbPencil />}
              onClick={handleEditQuery}
            >
              {dict.list.edit}
            </Button>
            <Button
              variant='secondary'
              size='sm'
              className='w-full'
              icon={<TbTrash />}
              onClick={handleDeleteQuery}
            >
              {dict.list.delete}
            </Button>
          </div>
        )}
      </div>
      <div className='h-full'>
        <QueryResults
          title={`${dict.query.results} ${selectedQuery ? `(${selectedQuery.name})` : ''}`}
          result={query.result}
          onRun={handleRunQuery}
          loading={query.loading}
        />
      </div>
    </div>
  );
}
