import { type Dispatch, type SetStateAction } from 'react';

import { useLocale } from '@/context/LocaleContext';

interface DataExportWizardProps {
  closeModal: () => void;
  currentStep: number;
  setCurrentStep: Dispatch<SetStateAction<number>>;
}

/**
 * Data export wizard component
 *
 * @todo Implement the data export wizard
 */
export default function DataExportWizard(_props: DataExportWizardProps) {
  const { dict } = useLocale();

  return (
    <div className='p-6 text-center'>
      <h1>{dict.wizard.setupDataExportWizard}</h1>
      <p
        className={`
          text-gray-600
          dark:text-gray-400
        `}
      >
        {dict.wizard.dataExportWizardComingSoon}
      </p>
    </div>
  );
}
