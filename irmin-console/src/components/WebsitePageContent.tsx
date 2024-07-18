export default function WebsitePageContent({
  content = '',
  full_width = false,
}: {
  content?: string;
  full_width?: boolean;
}) {
  if (content && content.length > 3) {
    return (
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
    );
  }
}
