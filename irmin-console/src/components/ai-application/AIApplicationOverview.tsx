'use client';

import { useCallback, useState } from 'react';

import {
  TbBook,
  TbCheck,
  TbChevronDown,
  TbChevronRight,
  TbCopy,
  TbEye,
  TbEyeOff,
  TbKey,
  TbTool,
} from 'react-icons/tb';

import AIApplicationDataSourcesEditor from '@/components/ai-application/AIApplicationDataSourcesEditor';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ContentWrapper } from '@/components/ui/ContentWrapper';
import SafeComponent from '@/components/ui/error/SafeComponent';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';

import { useAIApplicationContext } from '@/context/AIApplicationContext';
import { useLocale } from '@/context/LocaleContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import { useAIApplication } from '@/hooks/api/useAIApplications';
import { useResourceAllowed } from '@/hooks/utils';

import type { AIApplicationToolConfig } from '@/types/core/AIApplication';

/**
 * AI Application Overview section
 * Displays API key, data sources, tools configuration, and MCP connection info
 */
const AIApplicationOverview = () => {
  return (
    <SafeComponent
      level='section'
      title='AI Application Overview Error'
      description='The AI Application overview section encountered an error. Please try refreshing the page.'
    >
      <AIApplicationOverviewContent />
    </SafeComponent>
  );
};

const AIApplicationOverviewContent = () => {
  const { aiApplication } = useAIApplicationContext();
  const { dict } = useLocale();
  useWorkspaceContext();
  const { updateAIApplicationMutation } = useAIApplication(aiApplication.id);
  const { isResourceAllowed } = useResourceAllowed();

  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKeyCopied, setApiKeyCopied] = useState(false);
  const [configCopied, setConfigCopied] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);

  const defaultTools = {
    query_enabled: false,
    schema_enabled: false,
    list_objects_enabled: false,
    get_content_enabled: false,
    vector_search_enabled: false,
    docs_enabled: false,
  };

  // State to track the previous props to detect changes
  const [prevTools, setPrevTools] = useState(aiApplication.tools);
  // Optimistic state for tools to ensure immediate UI feedback
  const [optimisticTools, setOptimisticTools] =
    useState<AIApplicationToolConfig>(aiApplication.tools ?? defaultTools);

  // Sync optimistic tools with actual data when it changes (e.g. after refetch)
  if (aiApplication.tools !== prevTools) {
    setPrevTools(aiApplication.tools);
    setOptimisticTools(aiApplication.tools ?? defaultTools);
  }

  const canEdit = isResourceAllowed(
    'ai_application',
    'update',
    aiApplication.id
  );

  const handleCopyApiKey = useCallback(async () => {
    if (aiApplication.api_key) {
      await navigator.clipboard.writeText(aiApplication.api_key);
      setApiKeyCopied(true);
      setTimeout(() => setApiKeyCopied(false), 2000);
    }
  }, [aiApplication.api_key]);

  const handleToggleTool = useCallback(
    async (toolKey: keyof AIApplicationToolConfig, enabled: boolean) => {
      // Capture the current state at the time of the toggle
      const previousTools = optimisticTools;
      const newTools = {
        ...previousTools,
        [toolKey]: enabled,
      };

      // Optimistic update
      setOptimisticTools(newTools);

      try {
        await updateAIApplicationMutation.mutateAsync({
          tools: newTools,
        });
      } catch (_error) {
        // Revert to the captured previous state, not the closure state
        setOptimisticTools((currentTools) => {
          // Only revert if the current state matches our optimistic update
          // This prevents undoing other successful mutations
          if (JSON.stringify(currentTools) === JSON.stringify(newTools)) {
            return previousTools;
          }
          // If state has changed, don't revert (another mutation succeeded)
          return currentTools;
        });
      }
    },
    [optimisticTools, updateAIApplicationMutation]
  );

  const toolsList = [
    {
      key: 'query_enabled' as const,
      name: dict.aiApplication.toolQueryName,
      description: dict.aiApplication.toolQueryDescription,
    },
    {
      key: 'schema_enabled' as const,
      name: dict.aiApplication.toolSchemaName,
      description: dict.aiApplication.toolSchemaDescription,
    },
    {
      key: 'list_objects_enabled' as const,
      name: dict.aiApplication.toolListObjectsName,
      description: dict.aiApplication.toolListObjectsDescription,
    },
    {
      key: 'get_content_enabled' as const,
      name: dict.aiApplication.toolGetContentName,
      description: dict.aiApplication.toolGetContentDescription,
    },
    {
      key: 'vector_search_enabled' as const,
      name: dict.aiApplication.toolVectorSearchName,
      description: dict.aiApplication.toolVectorSearchDescription,
    },
    {
      key: 'docs_enabled' as const,
      name: dict.aiApplication.toolDocsName,
      description: dict.aiApplication.toolDocsDescription,
    },
  ];

  const mcpConfig = {
    mcpServers: {
      irmin: {
        command: 'npx',
        args: [
          '-y',
          '@irmin-data/mcp-server',
          'connect',
          '--api-key',
          aiApplication.api_key || '<YOUR_API_KEY>',
          '--endpoint',
          `${
            process.env.NEXT_PUBLIC_API_URL?.replace('/api', '/mcp') ??
            'https://api.irmin.dev/mcp'
          }/ai-app`,
        ],
      },
    },
  };

  const mcpEndpoint = `${
    process.env.NEXT_PUBLIC_API_URL?.replace('/api', '/mcp') ??
    'https://api.irmin.dev/mcp'
  }/ai-app`;

  const restApiEndpoint = `${
    process.env.NEXT_PUBLIC_API_URL ?? 'https://api.irmin.dev/api'
  }/v1/ai-app`;

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    // You might want a separate copied state for each button, but a global one is simple for now
    // or just rely on the user knowing they clicked it.
  };

  return (
    <ContentWrapper wrapperClassName='py-8 px-4'>
      <div className='flex flex-col gap-6'>
        {/* Connection Details Section */}
        <Card className='overflow-hidden'>
          <CardContent
            className={`
              grid gap-8 p-6
              md:grid-cols-2
            `}
          >
            <div className='space-y-6'>
              {/* API Key */}
              <div className='space-y-2'>
                <div className='flex items-center gap-2 text-sm font-medium'>
                  <TbKey size={16} />
                  {dict.aiApplication.apiKey}
                </div>
                {aiApplication.api_key ? (
                  <div className='relative flex items-center'>
                    <Input
                      readOnly
                      type={showApiKey ? 'text' : 'password'}
                      value={aiApplication.api_key}
                      className='pr-24 font-mono text-xs'
                    />
                    <div className='absolute right-1 flex gap-1'>
                      <Button
                        variant='ghost'
                        size='icon'
                        className='size-7'
                        onClick={() => setShowApiKey(!showApiKey)}
                        title={
                          showApiKey
                            ? dict.aiApplication.hideApiKey
                            : dict.aiApplication.showApiKey
                        }
                      >
                        {showApiKey ? (
                          <TbEyeOff size={14} />
                        ) : (
                          <TbEye size={14} />
                        )}
                      </Button>
                      <Button
                        variant='ghost'
                        size='icon'
                        className='size-7'
                        onClick={handleCopyApiKey}
                        title={dict.aiApplication.copyApiKey}
                      >
                        {apiKeyCopied ? (
                          <TbCheck size={14} className='text-green-500' />
                        ) : (
                          <TbCopy size={14} />
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className='text-sm text-muted-foreground'>
                    {dict.aiApplication.apiKeyOnlyShownOnce}
                  </p>
                )}
                <p className='text-xs text-muted-foreground'>
                  {dict.aiApplication.apiKeyDescription}
                </p>
              </div>

              {/* Endpoints */}
              <div className='space-y-4'>
                <div className='space-y-2'>
                  <span
                    className={`
                      text-xs font-medium tracking-wider text-muted-foreground
                      uppercase
                    `}
                  >
                    {dict.aiApplication.mcpEndpoint}
                  </span>
                  <div className='relative flex items-center'>
                    <Input
                      readOnly
                      value={mcpEndpoint}
                      className='pr-10 font-mono text-xs'
                    />
                    <Button
                      variant='ghost'
                      size='icon'
                      className='absolute right-1 size-7'
                      onClick={() => handleCopy(mcpEndpoint)}
                    >
                      <TbCopy size={14} />
                    </Button>
                  </div>
                </div>
                <div className='space-y-2'>
                  <span
                    className={`
                      text-xs font-medium tracking-wider text-muted-foreground
                      uppercase
                    `}
                  >
                    {dict.aiApplication.restApiEndpoint}
                  </span>
                  <div className='relative flex items-center'>
                    <Input
                      readOnly
                      value={restApiEndpoint}
                      className='pr-10 font-mono text-xs'
                    />
                    <Button
                      variant='ghost'
                      size='icon'
                      className='absolute right-1 size-7'
                      onClick={() => handleCopy(restApiEndpoint)}
                    >
                      <TbCopy size={14} />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Instructions & Links */}
            <div
              className={`
                flex flex-col justify-between pl-0
                md:border-l md:pl-8
              `}
            >
              <div>
                <div className='mb-4 flex items-center justify-between gap-4'>
                  <h4 className='font-medium'>
                    {dict.aiApplication.howToConnect}
                  </h4>
                  <Button
                    variant='secondary'
                    target='_blank'
                    rel='noopener noreferrer'
                    href='https://api.irmin.dev/docs'
                    icon={<TbBook />}
                  >
                    {dict.aiApplication.apiReference}
                  </Button>
                </div>
                <ul
                  className={`
                    mb-4 list-inside list-disc space-y-2 text-sm
                    text-muted-foreground
                  `}
                >
                  <li>
                    <span
                      dangerouslySetInnerHTML={{
                        __html: dict.aiApplication.howToConnectMcp,
                      }}
                    />
                  </li>
                  <li>
                    <span
                      dangerouslySetInnerHTML={{
                        __html: dict.aiApplication.howToConnectApiKey,
                      }}
                    />
                  </li>
                  <li>{dict.aiApplication.howToConnectTools}</li>
                </ul>

                <Collapsible
                  open={configOpen}
                  onOpenChange={setConfigOpen}
                  className='mt-4'
                >
                  <CollapsibleTrigger asChild>
                    <Button
                      variant='ghost'
                      size='sm'
                      className={`
                        flex w-full items-center justify-between p-0
                        hover:bg-transparent
                      `}
                    >
                      <span className='text-sm font-medium'>
                        Claude Desktop Config
                      </span>
                      {configOpen ? (
                        <TbChevronDown size={16} />
                      ) : (
                        <TbChevronRight size={16} />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className='mt-2'>
                    <div
                      className={`
                        relative rounded-md bg-muted/50 p-3 font-mono text-xs
                      `}
                    >
                      <pre
                        className={`
                          overflow-x-auto break-all whitespace-pre-wrap
                        `}
                      >
                        {JSON.stringify(mcpConfig, null, 2)}
                      </pre>
                      <Button
                        size='icon'
                        variant='ghost'
                        className={`
                          absolute top-2 right-2 size-6 text-muted-foreground
                          hover:bg-background hover:text-foreground
                        `}
                        onClick={() => {
                          navigator.clipboard.writeText(
                            JSON.stringify(mcpConfig, null, 2)
                          );
                          setConfigCopied(true);
                          setTimeout(() => setConfigCopied(false), 2000);
                        }}
                      >
                        {configCopied ? (
                          <TbCheck size={14} />
                        ) : (
                          <TbCopy size={14} />
                        )}
                      </Button>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </div>
          </CardContent>
        </Card>

        <div
          className={`
            grid gap-6
            md:grid-cols-2
          `}
        >
          {/* Tools Configuration */}
          <Card className='flex flex-col'>
            <CardHeader>
              <CardTitle className='flex items-center gap-2 pb-2 capitalize'>
                <TbTool size={20} />
                {dict.aiApplication.enabledTools}
              </CardTitle>
              <CardDescription>
                {dict.aiApplication.toolsControlDescription}
              </CardDescription>
            </CardHeader>
            <CardContent className='flex-1'>
              <div className='divide-y'>
                {toolsList.map((tool) => (
                  <div
                    key={tool.key}
                    className={`
                      flex items-center justify-between py-3
                      first:pt-0
                      last:pb-0
                    `}
                  >
                    <div className='mr-4 flex flex-col'>
                      <span className='text-sm font-medium'>{tool.name}</span>
                      <span className='text-xs text-muted-foreground'>
                        {tool.description}
                      </span>
                    </div>
                    <Switch
                      checked={optimisticTools[tool.key] ?? false}
                      onCheckedChange={(checked) =>
                        handleToggleTool(tool.key, checked)
                      }
                      disabled={
                        !canEdit || updateAIApplicationMutation.isPending
                      }
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Data Sources Editor */}
          <div>
            <AIApplicationDataSourcesEditor />
          </div>
        </div>
      </div>
    </ContentWrapper>
  );
};

export default AIApplicationOverview;
