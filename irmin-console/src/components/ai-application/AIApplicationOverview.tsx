'use client';

import AIApplicationConnectionDetails from '@/components/ai-application/AIApplicationConnectionDetails';
import AIApplicationCustomToolsEditor from '@/components/ai-application/AIApplicationCustomToolsEditor';
import AIApplicationDataSourcesEditor from '@/components/ai-application/AIApplicationDataSourcesEditor';
import AIApplicationPendingWritesSection from '@/components/ai-application/AIApplicationPendingWritesSection';
import AIApplicationToolsConfig from '@/components/ai-application/AIApplicationToolsConfig';
import { ContentWrapper } from '@/components/ui/ContentWrapper';
import SafeComponent from '@/components/ui/error/SafeComponent';

/**
 * AI Application Overview section
 * Displays API key, data sources, tools configuration, and MCP connection info
 */
const AIApplicationOverview = () => {
  return (
    <SafeComponent
      level='section'
      titleKey='overviewTitle'
      descriptionKey='overviewDescription'
    >
      <AIApplicationOverviewContent />
    </SafeComponent>
  );
};

const AIApplicationOverviewContent = () => {
  return (
    <ContentWrapper wrapperClassName='py-8 px-4'>
      <div className='flex flex-col gap-6'>
        {/* Connection Details Section */}
        <AIApplicationConnectionDetails />

        <div
          className={`
            grid gap-6
            md:grid-cols-2
          `}
        >
          {/* Tools Configuration */}
          <AIApplicationToolsConfig />

          {/* Data Sources Editor */}
          <div>
            <AIApplicationDataSourcesEditor />
          </div>
        </div>

        {/* Custom Tools Editor - Full Width */}
        <AIApplicationCustomToolsEditor />

        {/* Pending Writes Section - Only shown when approval is required */}
        <AIApplicationPendingWritesSection />
      </div>
    </ContentWrapper>
  );
};

export default AIApplicationOverview;
