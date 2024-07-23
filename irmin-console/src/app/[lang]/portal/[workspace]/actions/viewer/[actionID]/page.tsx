'use client';

// import React, { useEffect, useState } from 'react';

// import { useParams } from 'next/navigation';

// import ActionEditor from '@/components/action-editor/actionEditor';

// import ActionResultsAndTabs from '@/components/actionResultsAndTabs';
// import LoadingSkeleton from '@/components/misc/LoadingSkeleton';

// import { useLocale } from '@/context/LocaleContext';

export default function ActionEditorPage() {
  // const { locale, dict } = useLocale();
  // const { actionID } = useParams();
  // const [editorHeight, setEditorHeight] = useState('400px');

  return <></>;
  // TODO: Fetch action by ID
  // TODO: Implement the action results and editor

  // if (!action) {
  //   return (
  //     <div className='p-4'>
  //       <LoadingSkeleton className='h-52 w-full' />
  //     </div>
  //   );
  // }
  // return (
  //   <div className='w-full overflow-auto bg-white'>
  //     {action?.source !== 'connection' && action?.sourceScript ? (
  //       <ActionEditor
  //         content={action.sourceScript}
  //         language={action.source}
  //         editorHeight={editorHeight}
  //         setEditorHeight={setEditorHeight}
  //       />
  //     ) : (
  //       <div className='p-4'>
  //         <span className='text-lg text-irmin_blue'>
  //           {dict.connection.connection}: {action?.sourceConnection}
  //         </span>
  //       </div>
  //     )}
  //     {/* {action && (
  //       <ActionResultsAndTabs editorHeight={editorHeight} action={action} />
  //     )} */}
  //   </div>
  // );
}
