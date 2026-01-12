'use client';

import { useCallback, useMemo, useState } from 'react';

import {
  TbCode,
  TbPlayerPlay,
  TbPlus,
  TbSearch,
  TbTrash,
} from 'react-icons/tb';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

import { useAIApplicationContext } from '@/context/AIApplicationContext';
import { useLocale } from '@/context/LocaleContext';

import { useAIApplication } from '@/hooks/api/useAIApplications';
import { useQueries } from '@/hooks/api/useQueries';
import { useWorkflows } from '@/hooks/api/useWorkflows';
import { useResourceAllowed } from '@/hooks/utils';

import type {
  AIApplicationCustomTool,
  CustomToolType,
  UpdateCustomToolRequest,
} from '@/types/core/AIApplication';

interface CustomToolFormData {
  id?: string;
  name: string;
  description: string;
  type: CustomToolType;
  enabled: boolean;
  stored_query_id?: string;
  workflow_id?: string;
  embedding_path?: string;
  embedding_top_k?: number;
  embedding_filter?: Record<string, string>;
}

const defaultFormData: CustomToolFormData = {
  name: '',
  description: '',
  type: 'stored_query',
  enabled: true,
  embedding_top_k: undefined,
  embedding_filter: undefined,
};

const toolTypeIcons: Record<CustomToolType, React.ReactNode> = {
  stored_query: <TbCode size={16} />,
  workflow: <TbPlayerPlay size={16} />,
  embedding_search: <TbSearch size={16} />,
};

const toolTypeLabels: Record<CustomToolType, string> = {
  stored_query: 'Execute SQL Query',
  workflow: 'Trigger Workflow',
  embedding_search: 'Embedding Search',
};

/**
 * AI Application Custom Tools Editor
 * Allows users to create, edit, and delete custom tools for AI Applications
 */
const AIApplicationCustomToolsEditor = () => {
  const { aiApplication } = useAIApplicationContext();
  const { dict } = useLocale();
  const { updateAIApplicationMutation } = useAIApplication(aiApplication.id);
  const { isResourceAllowed } = useResourceAllowed();

  const { queries } = useQueries();
  const { workflows } = useWorkflows();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTool, setEditingTool] = useState<CustomToolFormData | null>(
    null
  );
  const [formData, setFormData] = useState<CustomToolFormData>(defaultFormData);

  const canEdit = isResourceAllowed(
    'ai_application',
    'update',
    aiApplication.id
  );

  const customTools = useMemo(
    () => aiApplication.custom_tools ?? [],
    [aiApplication.custom_tools]
  );

  const handleOpenDialog = useCallback((tool?: AIApplicationCustomTool) => {
    if (tool) {
      setEditingTool({
        id: tool.id,
        name: tool.name,
        description: tool.description,
        type: tool.type,
        enabled: tool.enabled,
        stored_query_id: tool.stored_query_id,
        workflow_id: tool.workflow_id,
        embedding_path: tool.embedding_path,
        embedding_top_k: tool.embedding_top_k ?? 10,
        embedding_filter: tool.embedding_filter,
      });
      setFormData({
        id: tool.id,
        name: tool.name,
        description: tool.description,
        type: tool.type,
        enabled: tool.enabled,
        stored_query_id: tool.stored_query_id,
        workflow_id: tool.workflow_id,
        embedding_path: tool.embedding_path,
        embedding_top_k: tool.embedding_top_k ?? 10,
        embedding_filter: tool.embedding_filter,
      });
    } else {
      setEditingTool(null);
      setFormData(defaultFormData);
    }
    setIsDialogOpen(true);
  }, []);

  const handleCloseDialog = useCallback(() => {
    setIsDialogOpen(false);
    setEditingTool(null);
    setFormData(defaultFormData);
  }, []);

  const handleSaveTool = useCallback(async () => {
    // Build the custom tools array
    const updatedTools: UpdateCustomToolRequest[] = customTools.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      type: t.type,
      enabled: t.enabled,
      stored_query_id: t.stored_query_id,
      workflow_id: t.workflow_id,
      embedding_path: t.embedding_path,
      embedding_top_k: t.embedding_top_k,
      embedding_filter: t.embedding_filter,
    }));

    if (editingTool?.id) {
      // Update existing tool
      const index = updatedTools.findIndex((t) => t.id === editingTool.id);
      if (index === -1) {
        throw new Error(
          'Tool not found. It may have been deleted by another session.'
        );
      }
      updatedTools[index] = {
        id: formData.id,
        name: formData.name,
        description: formData.description,
        type: formData.type,
        enabled: formData.enabled,
        stored_query_id: formData.stored_query_id,
        workflow_id: formData.workflow_id,
        embedding_path: formData.embedding_path,
        embedding_top_k: formData.embedding_top_k,
        embedding_filter: formData.embedding_filter,
      };
    } else {
      // Add new tool (without id)
      updatedTools.push({
        name: formData.name,
        description: formData.description,
        type: formData.type,
        enabled: formData.enabled,
        stored_query_id: formData.stored_query_id,
        workflow_id: formData.workflow_id,
        embedding_path: formData.embedding_path,
        embedding_top_k: formData.embedding_top_k,
        embedding_filter: formData.embedding_filter,
      });
    }

    try {
      await updateAIApplicationMutation.mutateAsync({
        custom_tools: updatedTools,
      });
      handleCloseDialog();
    } catch (_error) {
      // Error is handled by the mutation
    }
  }, [
    customTools,
    editingTool,
    formData,
    updateAIApplicationMutation,
    handleCloseDialog,
  ]);

  const handleDeleteTool = useCallback(
    async (toolId: string) => {
      const updatedTools: UpdateCustomToolRequest[] = customTools
        .filter((t) => t.id !== toolId)
        .map((t) => ({
          id: t.id,
          name: t.name,
          description: t.description,
          type: t.type,
          enabled: t.enabled,
          stored_query_id: t.stored_query_id,
          workflow_id: t.workflow_id,
          embedding_path: t.embedding_path,
          embedding_top_k: t.embedding_top_k,
          embedding_filter: t.embedding_filter,
        }));

      try {
        await updateAIApplicationMutation.mutateAsync({
          custom_tools: updatedTools,
        });
      } catch (_error) {
        // Error is handled by the mutation
      }
    },
    [customTools, updateAIApplicationMutation]
  );

  const handleToggleEnabled = useCallback(
    async (toolId: string, enabled: boolean) => {
      const updatedTools: UpdateCustomToolRequest[] = customTools.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        type: t.type,
        enabled: t.id === toolId ? enabled : t.enabled,
        stored_query_id: t.stored_query_id,
        workflow_id: t.workflow_id,
        embedding_path: t.embedding_path,
        embedding_top_k: t.embedding_top_k,
        embedding_filter: t.embedding_filter,
      }));

      try {
        await updateAIApplicationMutation.mutateAsync({
          custom_tools: updatedTools,
        });
      } catch (_error) {
        // Error is handled by the mutation
      }
    },
    [customTools, updateAIApplicationMutation]
  );

  const isFormValid = useCallback(() => {
    if (!formData.name.trim()) return false;
    if (!/^[a-z][a-z0-9_]*$/.test(formData.name)) return false;

    switch (formData.type) {
      case 'stored_query':
        return !!formData.stored_query_id;
      case 'workflow':
        return !!formData.workflow_id;
      case 'embedding_search':
        return !!formData.embedding_path?.trim();
      default:
        return false;
    }
  }, [formData]);

  return (
    <Card className='flex flex-col'>
      <CardHeader>
        <div className='flex items-center justify-between'>
          <div>
            <CardTitle className='flex items-center gap-2 pb-2 capitalize'>
              <TbCode size={20} />
              {dict.aiApplication.customTools}
            </CardTitle>
            <CardDescription>
              {dict.aiApplication.customToolsDescription}
            </CardDescription>
          </div>
          {canEdit && (
            <Button
              variant='secondary'
              size='sm'
              onClick={() => handleOpenDialog()}
              icon={<TbPlus />}
            >
              {dict.common.add}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className='flex-1'>
        {customTools.length === 0 ? (
          <div className='py-8 text-center text-sm text-muted-foreground'>
            {dict.aiApplication.noCustomTools}
          </div>
        ) : (
          <div className='divide-y'>
            {customTools.map((tool) => (
              <div
                key={tool.id}
                className={`
                  flex items-center justify-between py-3
                  first:pt-0
                  last:pb-0
                `}
              >
                <div className='mr-4 flex flex-col'>
                  <div className='flex items-center gap-2'>
                    {toolTypeIcons[tool.type]}
                    <span className='text-sm font-medium'>{tool.name}</span>
                    <span className='text-xs text-muted-foreground'>
                      ({toolTypeLabels[tool.type]})
                    </span>
                  </div>
                  {tool.description && (
                    <span className='mt-1 text-xs text-muted-foreground'>
                      {tool.description}
                    </span>
                  )}
                </div>
                <div className='flex items-center gap-2'>
                  <Switch
                    checked={tool.enabled}
                    onCheckedChange={(checked) =>
                      handleToggleEnabled(tool.id!, checked)
                    }
                    disabled={!canEdit || updateAIApplicationMutation.isPending}
                  />
                  {canEdit && (
                    <>
                      <Button
                        variant='ghost'
                        size='icon'
                        className='size-8'
                        onClick={() => handleOpenDialog(tool)}
                      >
                        <TbCode size={14} />
                      </Button>
                      <Button
                        variant='ghost'
                        size='icon'
                        className={`
                          size-8 text-destructive
                          hover:text-destructive
                        `}
                        onClick={() => handleDeleteTool(tool.id!)}
                        disabled={updateAIApplicationMutation.isPending}
                      >
                        <TbTrash size={14} />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className='max-w-md'>
          <DialogHeader>
            <DialogTitle>
              {editingTool
                ? dict.aiApplication.editCustomTool
                : dict.aiApplication.addCustomTool}
            </DialogTitle>
            <DialogDescription>
              {dict.aiApplication.customToolDialogDescription}
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-4 py-4'>
            {/* Tool Name */}
            <div className='flex flex-col gap-2'>
              <Label htmlFor='tool-name'>{dict.aiApplication.toolName}</Label>
              <Input
                id='tool-name'
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder='list_users'
              />
              <p className='text-xs text-muted-foreground'>
                {dict.aiApplication.toolNameHint}
              </p>
            </div>

            {/* Tool Description */}
            <div className='flex flex-col gap-2'>
              <Label htmlFor='tool-description'>
                {dict.aiApplication.toolDescription}
              </Label>
              <Textarea
                id='tool-description'
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder='List all users in the system'
                rows={2}
              />
              <p className='text-xs text-muted-foreground'>
                {dict.aiApplication.toolDescriptionHint}
              </p>
            </div>

            {/* Tool Type */}
            <div className='flex flex-col gap-2'>
              <Label htmlFor='tool-type'>{dict.aiApplication.toolType}</Label>
              <Select
                value={formData.type}
                onValueChange={(value: CustomToolType) => {
                  setFormData({
                    ...formData,
                    type: value,
                    stored_query_id: undefined,
                    workflow_id: undefined,
                    embedding_path: undefined,
                    embedding_top_k:
                      value === 'embedding_search' ? 10 : undefined,
                    embedding_filter: undefined,
                  });
                }}
              >
                <SelectTrigger id='tool-type' className='w-full'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='stored_query'>
                    <div className='flex items-center gap-2'>
                      {toolTypeIcons.stored_query}
                      {toolTypeLabels.stored_query}
                    </div>
                  </SelectItem>
                  <SelectItem value='workflow'>
                    <div className='flex items-center gap-2'>
                      {toolTypeIcons.workflow}
                      {toolTypeLabels.workflow}
                    </div>
                  </SelectItem>
                  <SelectItem value='embedding_search'>
                    <div className='flex items-center gap-2'>
                      {toolTypeIcons.embedding_search}
                      {toolTypeLabels.embedding_search}
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Type-specific fields */}
            {formData.type === 'stored_query' && (
              <div className='flex flex-col gap-2'>
                <Label htmlFor='stored-query'>
                  {dict.aiApplication.storedQuery}
                </Label>
                <Select
                  value={formData.stored_query_id ?? ''}
                  onValueChange={(value) =>
                    setFormData({ ...formData, stored_query_id: value })
                  }
                >
                  <SelectTrigger id='stored-query' className='w-full'>
                    <SelectValue placeholder={dict.aiApplication.selectQuery} />
                  </SelectTrigger>
                  <SelectContent>
                    {queries?.map((query) => (
                      <SelectItem key={query.id} value={query.id}>
                        {query.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {formData.type === 'workflow' && (
              <div className='flex flex-col gap-2'>
                <Label htmlFor='workflow'>{dict.aiApplication.workflow}</Label>
                <Select
                  value={formData.workflow_id ?? ''}
                  onValueChange={(value) =>
                    setFormData({ ...formData, workflow_id: value })
                  }
                >
                  <SelectTrigger id='workflow' className='w-full'>
                    <SelectValue
                      placeholder={dict.aiApplication.selectWorkflow}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {workflows?.map((workflow) => (
                      <SelectItem key={workflow.id} value={workflow.id}>
                        {workflow.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {formData.type === 'embedding_search' && (
              <>
                <div className='flex flex-col gap-2'>
                  <Label htmlFor='embedding-path'>
                    {dict.aiApplication.embeddingPath}
                  </Label>
                  <Input
                    id='embedding-path'
                    value={formData.embedding_path ?? ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        embedding_path: e.target.value,
                      })
                    }
                    placeholder='/repo-slug/main/embeddings/docs.parquet'
                  />
                  <p className='text-xs text-muted-foreground'>
                    {dict.aiApplication.embeddingPathHint}
                  </p>
                </div>
                <div className='flex flex-col gap-2'>
                  <Label htmlFor='top-k'>{dict.aiApplication.topK}</Label>
                  <Input
                    id='top-k'
                    type='number'
                    min={1}
                    max={100}
                    value={formData.embedding_top_k ?? 10}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        embedding_top_k: parseInt(e.target.value) || 10,
                      })
                    }
                  />
                </div>
                <div className='flex flex-col gap-2'>
                  <Label htmlFor='embedding-filter'>
                    {dict.aiApplication.embeddingFilter}
                  </Label>
                  <Textarea
                    id='embedding-filter'
                    value={
                      formData.embedding_filter
                        ? Object.entries(formData.embedding_filter)
                            .map(([k, v]) => `${k}=${v}`)
                            .join('\n')
                        : ''
                    }
                    onChange={(e) => {
                      const lines = e.target.value.split('\n');
                      const filter: Record<string, string> = {};
                      for (const line of lines) {
                        const trimmed = line.trim();
                        if (trimmed) {
                          const eqIndex = trimmed.indexOf('=');
                          if (eqIndex > 0) {
                            const key = trimmed.slice(0, eqIndex).trim();
                            const value = trimmed.slice(eqIndex + 1).trim();
                            if (key) {
                              filter[key] = value;
                            }
                          }
                        }
                      }
                      setFormData({
                        ...formData,
                        embedding_filter:
                          Object.keys(filter).length > 0 ? filter : undefined,
                      });
                    }}
                    placeholder='category=documentation&#10;type=guide'
                    rows={3}
                  />
                  <p className='text-xs text-muted-foreground'>
                    {dict.aiApplication.embeddingFilterHint}
                  </p>
                </div>
              </>
            )}

            {/* Enabled Toggle */}
            <div className='flex items-center justify-between'>
              <Label htmlFor='tool-enabled' className='capitalize'>
                {dict.aiApplication.toolEnabled}
              </Label>
              <Switch
                id='tool-enabled'
                checked={formData.enabled}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, enabled: checked })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant='outline' onClick={handleCloseDialog}>
              {dict.common.cancel}
            </Button>
            <Button
              onClick={handleSaveTool}
              disabled={!isFormValid() || updateAIApplicationMutation.isPending}
              className='px-8'
            >
              {editingTool ? dict.common.save : dict.common.add}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default AIApplicationCustomToolsEditor;
