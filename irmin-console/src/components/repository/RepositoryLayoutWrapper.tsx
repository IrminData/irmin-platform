import RepositoryHeader from './RepositoryHeader';

/**
 * Component to wrap the Repository pages in.
 *
 * Uses {@link RepositoryHeader} to display the header and tabs.
 *
 * @param props - The component properties
 * @param props.children - The children to render
 */
export default function RepositoryLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <RepositoryHeader />
      <div>{children}</div>
    </>
  );
}
