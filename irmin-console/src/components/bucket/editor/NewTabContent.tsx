import { TbDatabase, TbFile } from 'react-icons/tb';

import LinkCard from '@/components/ui/LinkCard';

import { useLocale } from '@/context/LocaleContext';

/**
 * Script editor content, when no file is selected
 */
const NewTabContent = ({ addNewTab }: { addNewTab: () => void }) => {
  const { dict } = useLocale();
  return (
    <div className='pattern-bg h-screen w-full'>
      <div className='my-12 flex w-full flex-wrap items-center justify-center gap-8'>
        <LinkCard
          onClick={addNewTab}
          title={dict.editor.newScriptTitle}
          description={dict.editor.newScriptSubtitle}
          icon={<TbFile />}
        />
        <LinkCard
          href='repositories'
          title={dict.consoleHome.browseRepositories}
          description={dict.consoleHome.browseRepositoriesDescription}
          icon={<TbDatabase />}
        />
      </div>
    </div>
  );
};

export default NewTabContent;
