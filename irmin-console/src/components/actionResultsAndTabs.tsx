/*
 * TODO
 * This componnent looks nice, but is basiaclly redundant and needs to be reworked.
 * Previously this used to be something between WorkspaceDB datatable widget for Datasets
 * and ActionWorkflow result section.
 */

export default function ActionResultsAndTabs() {
  return <div></div>;
}

// 'use client';

// import React, { useEffect, useRef, useState } from 'react';

// import DataTable from 'react-data-table-component';

// import { AiOutlineDownload, AiOutlineSave } from 'react-icons/ai';
// import { MdPlayArrow } from 'react-icons/md';

// import MDXEditor from '@/components/mdx-editor/MDXEditor';
// import Button from '@/components/misc/Button';
// import BarChart from '@/components/widgets/barChart';
// import LineChart from '@/components/widgets/lineChart';
// import ScrollableTable from '@/components/widgets/scrollableTable';

// import { useLocale } from '@/context/LocaleContext';

// import WidgetCreationForm from './widgetCreationForm';

// const ActionResultsAndTabs: React.FC<{
//   editorHeight: string;
//   dataset: Dataset;
// }> = ({ editorHeight, dataset }) => {
//   const { dict } = useLocale();

//   const [activeTab, setActiveTab] = useState('actionResults');

//   const tableRef = useRef<HTMLDivElement>(null);
//   const [tableMaxHeight, setTableMaxHeight] = useState('0px');

//   const [documentationTab, setDocumentationTab] = useState<'mdx' | 'plain'>(
//     'mdx'
//   );

//   const updateTableHeight = () => {
//     const rect = tableRef.current?.getBoundingClientRect();
//     if (rect) {
//       const offsetTop = rect.top + window.scrollY; // Distance from the top of the document to the element
//       const windowHeight = window.innerHeight; // Height of the viewport
//       const maxHeight = windowHeight - offsetTop; // Remaining height below the element
//       setTableMaxHeight(`${maxHeight - 20}px`);
//     }
//   };

//   useEffect(() => {
//     updateTableHeight(); // Update on mount
//     window.addEventListener('resize', updateTableHeight); // Update on window resize
//     return () => window.removeEventListener('resize', updateTableHeight); // Cleanup on unmount
//   }, [editorHeight]);

//   return (
//     <>
//       {/* Tab Buttons */}
//       <div className='scrollbar-hide mb-4 flex w-full justify-start gap-6 overflow-y-scroll px-2 pt-2 md:gap-4'>
//         <Button
//           onClick={() => setActiveTab('actionResults')}
//           size='sm'
//           className={`rounded-none border-b-2 ${
//             activeTab === 'actionResults'
//               ? 'border-irmin_green'
//               : 'border-transparent'
//           }`}
//         >
//           {dict.actionResults.actionResults}
//         </Button>
//         <Button
//           onClick={() => setActiveTab('widget')}
//           size='sm'
//           className={`rounded-none border-b-2 ${
//             activeTab === 'widget'
//               ? 'border-irmin_green'
//               : 'border-transparent'
//           }`}
//         >
//           {dict.actionResults.widget}
//         </Button>
//         <Button
//           onClick={() => setActiveTab('documentation')}
//           size='sm'
//           className={`rounded-none border-b-2 ${
//             activeTab === 'documentation'
//               ? 'border-irmin_green'
//               : 'border-transparent'
//           }`}
//         >
//           {dict.actionResults.widget}
//         </Button>
//         <div className='ml-auto flex gap-2 text-right'>
//           {activeTab === 'documentation' && (
//             <Button
//               onClick={() =>
//                 setDocumentationTab(
//                   documentationTab === 'mdx' ? 'plain' : 'mdx'
//                 )
//               }
//               variant='link'
//               colorScheme={'gray'}
//               size='sm'
//               className='w-[120px]'
//             >
//               {documentationTab === 'mdx'
//                 ? dict.actionResults.switchToPlainText
//                 : dict.actionResults.switchToMarkdownEditor}
//             </Button>
//           )}
//           <Button
//             icon={<AiOutlineSave />}
//             colorScheme='secondary'
//             variant='outline'
//             size='sm'
//             className='w-[120px]'
//           >
//             {dict.actionResults.save}
//           </Button>
//           {dataset.source !== 'connection' && (
//             <Button
//               icon={<MdPlayArrow />}
//               colorScheme='secondary'
//               variant='outline'
//               size='sm'
//               className='w-[120px]'
//             >
//               {dict.actionResults.run}
//             </Button>
//           )}
//         </div>
//       </div>

//       <div ref={tableRef}>
//         {activeTab === 'widget' && (
//           <div
//             className='grid grid-cols-2 px-2 py-0'
//             style={{ maxHeight: tableMaxHeight }}
//           >
//             <div>
//               <h3 className='p-4 font-medium'>
//                 {dict.actionResults.existingWidgets}
//               </h3>
//               <div className='flex flex-col gap-10'>
//                 {dataset.widgets.map((widget) => {
//                   switch (widget.type) {
//                     case 'table':
//                       return (
//                         <ScrollableTable
//                           key={`widget-${widget.id}-${widget.type}`}
//                           widget={widget}
//                         />
//                       );
//                     case 'line':
//                       return (
//                         <LineChart
//                           key={`widget-${widget.id}-${widget.type}`}
//                           widget={widget}
//                         />
//                       );
//                     case 'bar':
//                       return (
//                         <BarChart
//                           key={`widget-${widget.id}-${widget.type}`}
//                           widget={widget}
//                         />
//                       );
//                   }
//                 })}
//               </div>
//             </div>
//             <div>
//               <h3 className='p-4 font-medium'>
//                 {dict.actionResults.addNewWidget}
//               </h3>
//               <WidgetCreationForm />
//             </div>
//           </div>
//         )}

//         {activeTab === 'documentation' && (
//           <div style={{ height: tableMaxHeight }} className='overflow-auto'>
//             {documentationTab === 'plain' && (
//               <textarea
//                 className='h-full w-full p-2 focus:outline-none'
//                 placeholder={dict.actionResults.startTypingDocumentation}
//                 defaultValue={dataset.documentation ?? ''}
//                 onChange={(e) => {
//                   e.preventDefault();
//                   // TODO: Update the dataset documentation
//                 }}
//               />
//             )}
//             {documentationTab === 'mdx' && (
//               <MDXEditor
//                 className='h-full w-full focus:outline-none'
//                 contentEditableClassName='h-full w-full p-2 focus:outline-none'
//                 placeholder={dict.actionResults.startTypingDocumentation}
//                 markdown={dataset.documentation ?? ''}
//                 onChange={(markdown) => {
//                   // TODO: Update the dataset documentation
//                   console.log(markdown);
//                 }}
//               />
//             )}
//           </div>
//         )}

//         {activeTab === 'actionResults' && (
//           <div style={{ maxHeight: tableMaxHeight }} className='overflow-auto'>
//             {/* Action Buttons */}
//             <div className='flex items-center justify-between border px-4 py-2 text-sm'>
//               <p className='ml-0 inline text-xs'>
//                 {`${dataset.data.length} rows returned in 1.5s`}
//               </p>
//               <div className='ml-auto'>
//                 <Button
//                   icon={<AiOutlineDownload />}
//                   colorScheme='secondary'
//                   variant='link'
//                   size='sm'
//                 >
//                   {dict.actionResults.exportTable}
//                 </Button>
//               </div>
//             </div>
//             {/* Table */}
//             <div className='overflow-auto'>
//               <DataTable
//                 columns={dataset.columns.map((column) => ({
//                   name: column.name,
//                   selector: (row: DataRow) => row[column.selector],
//                   sortable: true,
//                 }))}
//                 data={dataset.data}
//               />
//             </div>
//           </div>
//         )}
//       </div>
//     </>
//   );
// };

// export default ActionResultsAndTabs;
