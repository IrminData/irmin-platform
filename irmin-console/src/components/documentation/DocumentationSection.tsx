'use client';

import { useRef } from 'react';

import Image from 'next/image';

import { WorkspaceLayoutParams } from '@/app/[lang]/portal/[workspace]/layout';
import { usePDF } from 'react-to-pdf';

import { BsFilePdf } from 'react-icons/bs';

import Button from '@/components/common/button/Button';
import PortalTitle from '@/components/portal/PortalTitle';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';
import { useWorkspace } from '@/context/workspace';

/**
 * Page UI to show the full documentation for the workspace
 */
export default function DocumentationSection({
  params,
}: {
  params: WorkspaceLayoutParams;
}) {
  const { profile } = useIAM();
  const { dict, locale } = useLocale();
  const { toPDF, targetRef } = usePDF({
    filename: `${params.workspace}-documentation-${new Date().toISOString()}.pdf`,
  });
  const {
    workspaces: { currentWorkspace },
    connections: { connections },
    exports: { exports },
    actions: { actions },
    repositories: { repositories },
  } = useWorkspace();

  const pdfHeaderRef = useRef<HTMLDivElement | null>(null);

  const downloadPDF = () => {
    pdfHeaderRef.current?.classList.remove('hidden');
    toPDF();
    pdfHeaderRef.current?.classList.add('hidden');
  };

  return (
    <div className='flex flex-col px-2 md:px-4'>
      <div className='flex flex-row items-center justify-between'>
        <PortalTitle title={dict.documentation.documentation} />
        <Button
          variant='solid'
          colorScheme='primary'
          size='sm'
          className='h-6'
          icon={<BsFilePdf />}
          onClick={downloadPDF}
        >
          {dict.documentation.downloadPDF}
        </Button>
      </div>
      <div
        className='flex flex-col bg-white px-2 py-4 md:px-4 dark:bg-irmin_black'
        ref={targetRef}
      >
        <div
          ref={pdfHeaderRef}
          className='hidden border-b-2 py-4 dark:border-gray-800'
        >
          <div className='flex w-full flex-row items-center justify-between pb-4'>
            <h1 className='font-display text-2xl font-bold text-irmin_black sm:text-3xl lg:text-5xl dark:text-white'>
              {dict.documentation.documentation}
            </h1>
            <Image
              className='block h-8 w-auto dark:hidden'
              src='/irmin-logo.svg'
              alt='Irmin logo'
              width={100}
              height={100}
            />
            <Image
              className='hidden h-8 w-auto dark:block'
              src='/irmin-logo-light.svg'
              alt='Irmin logo'
              width={100}
              height={100}
            />
          </div>
          <div className='flex w-full flex-col justify-start pb-4 text-sm text-irmin_black dark:text-gray-200'>
            <p>
              <b>{dict.documentation.workspace}: </b>
              {currentWorkspace?.name ?? 'Unknown'}
            </p>
            <p>
              <b>{dict.documentation.createdBy}: </b>
              {profile?.name ?? 'Unknown'}
            </p>
            <p>
              <b>{dict.documentation.timestamp}: </b>
              {new Date().toLocaleString(locale ?? 'en')}
            </p>
          </div>
        </div>
        {repositories.length > 0 && (
          <div className='flex flex-col border-b-2 py-4 dark:border-gray-800'>
            <h2 className='font-display text-xl font-bold text-irmin_black dark:text-white'>
              {dict.documentation.sections.repositories}
            </h2>
            <ul className='list-disc pl-4'>
              {repositories.map((item, index) => (
                <li key={index}>{item.name}</li>
              ))}
            </ul>
          </div>
        )}
        {connections.length > 0 && (
          <div className='flex flex-col border-b-2 py-4 dark:border-gray-800'>
            <h2 className='font-display text-xl font-bold text-irmin_black dark:text-white'>
              {dict.documentation.sections.connections}
            </h2>
            <ul className='list-disc pl-4'>
              {connections.map((item, index) => (
                <li key={index}>{item.name}</li>
              ))}
            </ul>
          </div>
        )}
        {exports.length > 0 && (
          <div className='flex flex-col border-b-2 py-4 dark:border-gray-800'>
            <h2 className='font-display text-xl font-bold text-irmin_black dark:text-white'>
              {dict.documentation.sections.exports}
            </h2>
            <ul className='list-disc pl-4'>
              {exports.map((item, index) => (
                <li key={index}>{item.name}</li>
              ))}
            </ul>
          </div>
        )}
        {actions.length > 0 && (
          <div className='flex flex-col border-b-2 py-4 dark:border-gray-800'>
            <h2 className='font-display text-xl font-bold text-irmin_black dark:text-white'>
              {dict.documentation.sections.actions}
            </h2>
            <ul className='list-disc pl-4'>
              {actions.map((item, index) => (
                <li key={index}>{item.name}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
