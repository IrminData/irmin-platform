'use client';

import { useCallback, useMemo, useState } from 'react';

import { TbChevronDown, TbChevronRight, TbTool } from 'react-icons/tb';

import AIApplicationWriteConfig from '@/components/ai-application/AIApplicationWriteConfig';
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
import { Switch } from '@/components/ui/switch';

import { useAIApplicationContext } from '@/context/AIApplicationContext';
import { useLocale } from '@/context/LocaleContext';

import { useAIApplication } from '@/hooks/api/useAIApplications';
import { useResourceAllowed } from '@/hooks/utils';

import type {
  AIApplicationToolConfig,
  AIApplicationWriteConfig as WriteConfigType,
} from '@/types/core/AIApplication';

/**
 * Default tools configuration
 */
const defaultTools: AIApplicationToolConfig = {
  query_enabled: false,
  schema_enabled: false,
  list_objects_enabled: false,
  get_content_enabled: false,
  vector_search_enabled: false,
  docs_enabled: false,
  write_enabled: false,
  write_config: undefined,
};

/**
 * AI Application tools configuration card
 * Allows enabling/disabling various AI application tools
 */
const AIApplicationToolsConfig = () => {
  const { aiApplication } = useAIApplicationContext();
  const { dict } = useLocale();
  const { updateAIApplicationMutation } = useAIApplication(aiApplication.id);
  const { isResourceAllowed } = useResourceAllowed();

  const defaultWriteConfig: WriteConfigType = useMemo(
    () => ({
      file_upload_enabled: false,
      file_update_enabled: false,
      patch_enabled: false,
      auto_commit: true,
      require_commit_message: false,
      commit_message_prefix: '',
      require_approval: false,
    }),
    []
  );

  const [prevTools, setPrevTools] = useState(aiApplication.tools);
  const [optimisticTools, setOptimisticTools] =
    useState<AIApplicationToolConfig>(aiApplication.tools ?? defaultTools);
  const [writeConfigOpen, setWriteConfigOpen] = useState(false);

  // Sync optimistic tools with actual data when it changes
  if (aiApplication.tools !== prevTools) {
    setPrevTools(aiApplication.tools);
    setOptimisticTools(aiApplication.tools ?? defaultTools);
  }

  const canEdit = isResourceAllowed(
    'ai_application',
    'update',
    aiApplication.id
  );

  const handleToggleTool = useCallback(
    async (toolKey: keyof AIApplicationToolConfig, enabled: boolean) => {
      const previousTools = optimisticTools;
      let newTools = {
        ...previousTools,
        [toolKey]: enabled,
      };

      // When enabling write_enabled, initialize write_config if not set
      if (
        toolKey === 'write_enabled' &&
        enabled &&
        !previousTools.write_config
      ) {
        newTools = {
          ...newTools,
          write_config: defaultWriteConfig,
        };
      }

      setOptimisticTools(newTools);

      try {
        await updateAIApplicationMutation.mutateAsync({
          tools: newTools,
        });
      } catch (_error) {
        setOptimisticTools((currentTools) => {
          if (JSON.stringify(currentTools) === JSON.stringify(newTools)) {
            return previousTools;
          }
          return currentTools;
        });
      }
    },
    [optimisticTools, updateAIApplicationMutation, defaultWriteConfig]
  );

  const handleToggleWriteConfig = useCallback(
    async (configKey: keyof WriteConfigType, value: boolean | string) => {
      const previousTools = optimisticTools;
      const currentWriteConfig =
        previousTools.write_config ?? defaultWriteConfig;
      const newWriteConfig = {
        ...currentWriteConfig,
        [configKey]: value,
      };
      const newTools = {
        ...previousTools,
        write_config: newWriteConfig,
      };

      setOptimisticTools(newTools);

      try {
        await updateAIApplicationMutation.mutateAsync({
          tools: newTools,
        });
      } catch (_error) {
        setOptimisticTools((currentTools) => {
          if (JSON.stringify(currentTools) === JSON.stringify(newTools)) {
            return previousTools;
          }
          return currentTools;
        });
      }
    },
    [optimisticTools, updateAIApplicationMutation, defaultWriteConfig]
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

  return (
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
                disabled={!canEdit || updateAIApplicationMutation.isPending}
              />
            </div>
          ))}

          {/* Write Tools Section */}
          <div className='pt-3'>
            <div className='flex items-center justify-between py-3'>
              <div className='mr-4 flex flex-col'>
                <span className='text-sm font-medium'>
                  {dict.aiApplication.toolWriteName}
                </span>
                <span className='text-xs text-muted-foreground'>
                  {dict.aiApplication.toolWriteDescription}
                </span>
              </div>
              <Switch
                checked={optimisticTools.write_enabled ?? false}
                onCheckedChange={(checked) =>
                  handleToggleTool('write_enabled', checked)
                }
                disabled={!canEdit || updateAIApplicationMutation.isPending}
              />
            </div>

            {/* Write Config Options (Collapsible) */}
            {optimisticTools.write_enabled && (
              <Collapsible
                open={writeConfigOpen}
                onOpenChange={setWriteConfigOpen}
                className='mt-2 rounded-md border bg-muted/30 p-3'
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
                      {dict.aiApplication.writeConfigTitle}
                    </span>
                    {writeConfigOpen ? (
                      <TbChevronDown size={16} />
                    ) : (
                      <TbChevronRight size={16} />
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className='mt-3 space-y-3'>
                  <AIApplicationWriteConfig
                    writeConfig={optimisticTools.write_config}
                    onToggle={handleToggleWriteConfig}
                    disabled={!canEdit || updateAIApplicationMutation.isPending}
                  />
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AIApplicationToolsConfig;
