'use client';

// import { useEffect, useState } from 'react';

// import Link from 'next/link';
// import { useParams } from 'next/navigation';

// import { IoChevronBack } from 'react-icons/io5';

// import LoadingSkeleton from '@/components/misc/LoadingSkeleton';
// import List from '@/components/tables/elements/list';
// import StatusElement from '@/components/tables/elements/statusElement';

// import { useLocale } from '@/context/LocaleContext';

export default function ActionViewerLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <ActionToolbar />
      <div className='w-full overflow-auto'>{children}</div>
    </>
  );
}

function ActionToolbar() {
  return <></>;
  // const { locale, dict } = useLocale();
  // const { actionID, workspace } = useParams();

  // if (!action) {
  //   return (
  //     <div className='w-full px-4'>
  //       <LoadingSkeleton className='my-0 h-10 w-full' />
  //     </div>
  //   );
  // }

  // const tableActions = [
  //   {
  //     label: dict.list.actions.view,
  //     primary: true,
  //     href: `/portal/${workspace}/actions/viewer/${action.id}`,
  //   },
  //   {
  //     label: dict.list.actions.logs,
  //     primary: false,
  //     href: `/portal/${workspace}/actions/viewer/${action.id}/logs`,
  //   },
  // ];
  // if (action.status === 'connected') {
  //   tableActions.push(
  //     {
  //       label: dict.list.actions.viewInfo,
  //       primary: false,
  //       href: `/portal/${workspace}/actions/viewer/${action.id}/settings`,
  //     },
  //     {
  //       label: dict.list.actions.disconnect,
  //       primary: false,
  //       href: `/portal/${workspace}/actions/viewer/${action.id}/settings`,
  //     }
  //   );
  // } else {
  //   tableActions.push({
  //     label: dict.list.actions.edit,
  //     primary: false,
  //     href: `/portal/${workspace}/actions/viewer/${action.id}/settings`,
  //   });
  // }

  // return (
  //   <List
  //     hideHeaders={true}
  //     headers={[
  //       dict.list.actions.name,
  //       dict.list.actions.status,
  //       dict.list.actions.actions,
  //     ]}
  //     rows={[
  //       {
  //         columns: [
  //           <div className='flex flex-row' key={'action-details'}>
  //             <Link href={`/portal/${workspace}/actions/`} title='Back'>
  //               <IoChevronBack size={40} className='text-irmin_blue' />
  //             </Link>
  //             <div className='min-w-44 px-4 py-0 pr-5 text-base md:pr-10 xl:text-base'>
  //               {action?.name ?? ''}
  //               <br />
  //               {action?.status === 'connected' ? (
  //                 <span className='text-xs text-irmin_blue'>
  //                   {dict.list.actions.source}: {action?.sourceWorkspace}
  //                 </span>
  //               ) : action?.source === 'connection' ? (
  //                 <span className='text-xs text-irmin_blue'>
  //                   {dict.list.actions.source}: {action?.sourceConnection}
  //                 </span>
  //               ) : (
  //                 <span className='text-xs text-irmin_blue'>
  //                   {dict.list.actions.source}: {action?.scriptFile}
  //                 </span>
  //               )}
  //             </div>
  //           </div>,
  //           <StatusElement
  //             accessStatus={action?.status}
  //             statusLabel={action?.status ?? ''}
  //             key={'action-status'}
  //           />,
  //         ],
  //         actions: tableActions,
  //       },
  //     ]}
  //   />
  // );
}
