/**
 * Wordpress Gutenberg content component (website)
 *
 * @remarks
 *
 * This component is used to display content from Wordpress Gutenberg editor.
 * The content is wrapped in a container and rendered as HTML.
 *
 * The stylesheet for Gutenberg content is loaded from WordPress.
 * It has been moved there from this repository.
 *
 * See this {@link https://github.com/IrminData/irmin-frontend/commit/cef8f6d4864035e01e36623a2cf333a92d249590 | commit} for more details.
 */
export default function PageContent({
  content = '',
  full_width = false,
}: {
  content?: string;
  full_width?: boolean;
}) {
  const wpURL =
    process.env.NEXT_PUBLIC_WORDPRESS_URL ?? 'https://cms.irmin.dev';
  if (content && content.length > 3) {
    return (
      <>
        <div className='wp-content bg-gray-50'>
          {full_width ? (
            <div
              dangerouslySetInnerHTML={{ __html: content }}
              className={'editor-styles-wrapper bg-white'}
            />
          ) : (
            <div className='p-2 lg:p-6'>
              <div className='mx-auto max-w-7xl rounded-lg bg-white p-2 shadow-md lg:p-8'>
                <div
                  dangerouslySetInnerHTML={{ __html: content }}
                  className={'editor-styles-wrapper'}
                />
              </div>
            </div>
          )}
        </div>
        <div
          dangerouslySetInnerHTML={{
            __html: `
          <link
            rel='stylesheet'
            href='${wpURL}/wp-content/uploads/2024/07/wordpress.css'
          />
          `,
          }}
        />
      </>
    );
  }
}
