import CardOrNormalList from '@/components/ui/list/CardOrNormalList';

/**
 * List shell skeleton.
 *
 * Renders the same `<CardOrNormalList>` shell as the real list component
 * with `loading=true`, so the route-level `loading.tsx` produces
 * byte-identical markup to the client-side `<CardOrNormalList loading>`
 * render on hydration. This eliminates the "three skeletons flash"
 * symptom on list pages.
 *
 * @param props.columnCount - Number of columns the real table will have
 *   (only used to size the loading `<tr colSpan>`). Pass the same count
 *   you'd pass as `headers.length` on the real list.
 */
const ListShellSkeleton = ({ columnCount = 4 }: { columnCount?: number }) => {
  return (
    <CardOrNormalList
      loading
      rows={[]}
      headers={Array.from({ length: columnCount }, () => '')}
    />
  );
};

export default ListShellSkeleton;
