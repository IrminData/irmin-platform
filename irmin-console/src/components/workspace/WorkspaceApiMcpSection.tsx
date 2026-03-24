'use client';

import { useMemo } from 'react';

import { IoInformationCircle } from 'react-icons/io5';

import {
  CodeBlock,
  CodeBlockCopyButton,
} from '@/components/ui/ai-elements/code-block';
import { Button } from '@/components/ui/button';
import { ContentWrapper } from '@/components/ui/ContentWrapper';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { useLocale } from '@/context/LocaleContext';

import DisplayTitle from '../ui/display-title';

/**
 * Workspace API/MCP settings section
 *
 * This component displays information about the REST API and MCP server,
 * including base URLs, usage instructions, documentation links, and
 * links to the tokens page for authentication.
 */
const WorkspaceApiMcpSection = () => {
  const { dict, locale } = useLocale();

  const apiBaseUrl =
    process.env.NEXT_PUBLIC_API_URL ?? 'https://api.irmin.dev/api';
  const mcpUrl = useMemo(() => {
    // MCP is mounted at /mcp on the same server as the API
    // If API URL ends with /api, replace it with /mcp, otherwise append /mcp
    if (apiBaseUrl.endsWith('/api')) {
      return apiBaseUrl.replace('/api', '/mcp');
    }
    return `${apiBaseUrl}/mcp`;
  }, [apiBaseUrl]);

  const tokensPageUrl = `/${locale}/profile/tokens`;

  const streamableHttpConfig = useMemo(() => {
    return dict.workspace.api.mcpStreamableHttpConfig.replace(
      '<MCP_URL>',
      mcpUrl
    );
  }, [dict, mcpUrl]);

  const mcpRemoteConfig = useMemo(() => {
    return dict.workspace.api.mcpRemoteConfig.replace('<MCP_URL>', mcpUrl);
  }, [dict, mcpUrl]);

  const apiExampleCurl = useMemo(() => {
    return dict.workspace.api.apiExampleCurl.replace(
      '<API_URL>',
      apiBaseUrl.replace('/api', '')
    );
  }, [dict, apiBaseUrl]);

  return (
    <ContentWrapper wrapperClassName='py-8 lg:px-12'>
      <DisplayTitle className='mb-8'>
        {dict.workspace.api.settings}
      </DisplayTitle>

      {/* REST API Section */}
      <div className='mb-12'>
        <h3
          className={`
            mb-4 text-lg font-semibold
            lg:text-xl
          `}
        >
          {dict.workspace.api.restApi}
        </h3>

        <div
          className={`
            mb-4 flex items-start gap-3 rounded-lg border border-accent/30
            bg-accent/10 p-3
            dark:border-accent-foreground dark:bg-accent/10
          `}
        >
          <IoInformationCircle
            className={`mt-0.5 size-5 shrink-0 text-accent`}
          />
          <div className={`flex-1 text-sm text-foreground`}>
            <p>{dict.workspace.api.apiDescription}</p>
            <p className='mt-2'>{dict.workspace.api.apiUsageNote}</p>
          </div>
        </div>

        <div className='mb-4'>
          <label
            className={`
              mb-2 block text-sm font-medium text-gray-700
              dark:text-gray-300
            `}
          >
            {dict.workspace.api.apiBaseUrl}
          </label>
          <div className='relative'>
            <CodeBlock code={apiBaseUrl} language='text'>
              <CodeBlockCopyButton />
            </CodeBlock>
          </div>
        </div>

        <div className='mb-6'>
          <h4 className={`mb-2 text-base font-semibold`}>
            {dict.workspace.api.apiExampleTitle}
          </h4>
          <p
            className={`
              mb-3 text-sm text-gray-600
              dark:text-gray-400
            `}
          >
            {dict.workspace.api.apiExampleDescription}
          </p>
          <div className='relative'>
            <CodeBlock code={apiExampleCurl} language='bash'>
              <CodeBlockCopyButton />
            </CodeBlock>
          </div>
          <p
            className={`
              mt-2 text-xs text-gray-500
              dark:text-gray-500
            `}
          >
            {dict.workspace.api.apiExampleNote}
          </p>
        </div>

        <div className='flex flex-wrap gap-2'>
          <Button href={tokensPageUrl} size='sm' variant='default'>
            {dict.workspace.api.getApiToken}
          </Button>
          {process.env.NEXT_PUBLIC_API_DOCS_URL && (
            <Button
              href={process.env.NEXT_PUBLIC_API_DOCS_URL}
              target='_blank'
              rel='noopener noreferrer'
              size='sm'
              variant='secondary'
            >
              {dict.workspace.api.viewApiDocs}
            </Button>
          )}
        </div>
      </div>

      {/* Divider */}
      <div
        className={`
          my-8 border-t border-gray-200
          dark:border-gray-800
        `}
      />

      {/* MCP Section */}
      <div>
        <h3
          className={`
            mb-4 text-lg font-semibold
            lg:text-xl
          `}
        >
          {dict.workspace.api.mcp}
        </h3>

        <div
          className={`
            mb-4 flex items-start gap-3 rounded-lg border border-accent/30
            bg-accent/10 p-3
            dark:border-accent-foreground dark:bg-accent/10
          `}
        >
          <IoInformationCircle
            className={`mt-0.5 size-5 shrink-0 text-accent`}
          />
          <div className={`flex-1 text-sm text-foreground`}>
            <p>{dict.workspace.api.mcpDescription}</p>
            <p className='mt-2'>{dict.workspace.api.mcpUsageNote}</p>
          </div>
        </div>

        <div className='mb-4'>
          <label
            className={`
              mb-2 block text-sm font-medium text-gray-700
              dark:text-gray-300
            `}
          >
            {dict.workspace.api.mcpUrl}
          </label>
          <div className='relative'>
            <CodeBlock code={mcpUrl} language='text'>
              <CodeBlockCopyButton />
            </CodeBlock>
          </div>
        </div>

        <div className='mb-4'>
          <label
            className={`
              mb-2 block text-sm font-medium text-gray-700
              dark:text-gray-300
            `}
          >
            {dict.workspace.api.mcpAuthHeaderLabel}
          </label>
          <div className='relative'>
            <CodeBlock code={dict.workspace.api.mcpAuthHeader} language='text'>
              <CodeBlockCopyButton />
            </CodeBlock>
          </div>
        </div>

        <div className='mb-6'>
          <h4 className={`mb-2 text-base font-semibold`}>
            {dict.workspace.api.mcpClaudeDesktopTitle}
          </h4>
          <p
            className={`
              mb-3 text-sm text-gray-600
              dark:text-gray-400
            `}
          >
            {dict.workspace.api.mcpClaudeDesktopDescription}
          </p>
          <Tabs defaultValue='streamable-http'>
            <TabsList>
              <TabsTrigger value='streamable-http'>
                {dict.workspace.api.mcpStreamableHttpTab}
              </TabsTrigger>
              <TabsTrigger value='mcp-remote'>
                {dict.workspace.api.mcpRemoteTab}
              </TabsTrigger>
            </TabsList>
            <TabsContent value='streamable-http'>
              <CodeBlock code={streamableHttpConfig} language='json'>
                <CodeBlockCopyButton />
              </CodeBlock>
            </TabsContent>
            <TabsContent value='mcp-remote'>
              <CodeBlock code={mcpRemoteConfig} language='json'>
                <CodeBlockCopyButton />
              </CodeBlock>
            </TabsContent>
          </Tabs>
          <p
            className={`
              mt-2 text-xs text-gray-500
              dark:text-gray-500
            `}
          >
            {dict.workspace.api.mcpConfigNote}
          </p>
        </div>

        <div className='flex flex-wrap gap-2'>
          <Button href={tokensPageUrl} size='sm' variant='default'>
            {dict.workspace.api.getMcpToken}
          </Button>
          {process.env.NEXT_PUBLIC_API_DOCS_URL && (
            <Button
              href={process.env.NEXT_PUBLIC_API_DOCS_URL}
              target='_blank'
              rel='noopener noreferrer'
              size='sm'
              variant='secondary'
            >
              {dict.workspace.api.viewMcpDocs}
            </Button>
          )}
        </div>
      </div>
    </ContentWrapper>
  );
};

export default WorkspaceApiMcpSection;
