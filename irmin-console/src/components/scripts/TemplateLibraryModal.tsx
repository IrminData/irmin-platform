import { useEffect, useMemo, useState } from 'react';

import { TbChevronRight, TbInfoCircle, TbSearch } from 'react-icons/tb';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import ListSkeleton from '@/components/ui/loading/ListSkeleton';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import { useLocale } from '@/context/LocaleContext';

import type { Template } from '@/types/core/Template';

interface TemplateLibraryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: Template[];
  loading: boolean;
  onSelectTemplate: (content: string, createNew: boolean) => void;
}

export function TemplateLibraryModal({
  open,
  onOpenChange,
  templates,
  loading,
  onSelectTemplate,
}: TemplateLibraryModalProps) {
  const { dict } = useLocale();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(
    null
  );
  const [placeholderValues, setPlaceholderValues] = useState<
    Record<string, string>
  >({});
  const [activeTab, setActiveTab] = useState('browse');

  useEffect(() => {
    if (!open) return undefined;

    return () => {
      setSelectedTemplate(null);
      setPlaceholderValues({});
      setSearchQuery('');
      setActiveTab('browse');
    };
  }, [open]);

  // Filter templates based on search query
  const filteredTemplates = useMemo(() => {
    if (!searchQuery) return templates;
    const query = searchQuery.toLowerCase();
    return templates.filter(
      (template) =>
        template.title.toLowerCase().includes(query) ||
        template.description.toLowerCase().includes(query) ||
        template.tags.some((tag) => tag.toLowerCase().includes(query))
    );
  }, [templates, searchQuery]);

  // Handle template selection
  const handleTemplateSelect = (template: Template) => {
    setSelectedTemplate(template);
    // Initialize placeholder values
    const initialValues: Record<string, string> = {};
    template.placeholders.forEach((p) => {
      initialValues[p.name] = '';
    });
    setPlaceholderValues(initialValues);
    setActiveTab('fill');
  };

  // Handle placeholder value change
  const handlePlaceholderChange = (name: string, value: string) => {
    setPlaceholderValues((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Generate filled content
  const filledContent = useMemo(() => {
    if (!selectedTemplate) return '';
    let content = selectedTemplate.content;
    Object.entries(placeholderValues).forEach(([key, value]) => {
      // Replace all occurrences of {{key}} with value
      // If value is empty, keep the placeholder for now or replace with empty string depending on requirement
      // Replace all occurrences of {{key}} with value
      // We use split/join to avoid regex escaping issues and replacement string escaping issues
      // This handles keys with special regex chars and values with $ correctly
      content = content.split(`{{${key}}}`).join(value || `{{${key}}}`);
    });
    return content;
  }, [selectedTemplate, placeholderValues]);

  // Handle create/replace actions
  const handleAction = (createNew: boolean) => {
    if (!selectedTemplate) return;
    onSelectTemplate(filledContent, createNew);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className={`
          flex w-full flex-col gap-0 overflow-hidden
          focus:outline-none
          focus-visible:outline-none
          sm:max-w-lg
          md:max-w-xl
          lg:max-w-2xl
        `}
      >
        <SheetHeader className='p-6'>
          <SheetTitle>{dict.common.templates.title}</SheetTitle>
          <SheetDescription>
            {dict.common.templates.description}
          </SheetDescription>
        </SheetHeader>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className={`
            flex flex-1 flex-col overflow-hidden
            focus:outline-none
            focus-visible:outline-none
          `}
        >
          <TabsList
            className={`grid w-full grid-cols-2 gap-1 bg-transparent px-2`}
          >
            <TabsTrigger value='browse'>
              {dict.common.templates.selectTemplate}
            </TabsTrigger>
            <TabsTrigger value='fill' disabled={!selectedTemplate}>
              {dict.common.templates.fillPlaceholders}
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value='browse'
            className='mt-4 flex min-h-0 flex-1 flex-col overflow-hidden'
          >
            <div className='relative mb-4 px-6'>
              <TbSearch
                className={`
                  absolute top-1/2 left-9 -translate-y-1/2 text-muted-foreground
                `}
                size={16}
              />
              <Input
                placeholder={dict.common.templates.searchTemplates}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className='pl-9'
              />
            </div>

            <div className='flex-1 overflow-y-auto px-6 pb-6'>
              <div className='space-y-3'>
                {loading ? (
                  <ListSkeleton items={5} />
                ) : filteredTemplates.length === 0 ? (
                  <div
                    className={`
                      flex h-32 items-center justify-center
                      text-muted-foreground
                    `}
                  >
                    {dict.common.templates.noTemplatesFound}
                  </div>
                ) : (
                  filteredTemplates.map((template) => (
                    <div
                      key={template.id}
                      className={`
                        cursor-pointer rounded-lg border bg-card p-4
                        transition-all
                        hover:border-primary/50 hover:bg-accent/5
                        ${
                          selectedTemplate?.id === template.id
                            ? `border-primary bg-accent/10`
                            : ''
                        }
                      `}
                      onClick={() => handleTemplateSelect(template)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          handleTemplateSelect(template);
                        }
                      }}
                      role='button'
                      tabIndex={0}
                    >
                      <div className='flex items-start justify-between'>
                        <div>
                          <h3 className='font-medium'>{template.title}</h3>
                          <p
                            className={`
                              mt-1 line-clamp-2 text-sm text-muted-foreground
                            `}
                          >
                            {template.description}
                          </p>
                        </div>
                        <TbChevronRight className='text-muted-foreground' />
                      </div>
                      {template.tags.length > 0 && (
                        <div className='mt-3 flex flex-wrap gap-2'>
                          {template.tags.map((tag) => (
                            <Badge
                              key={tag}
                              variant='secondary'
                              className='text-xs'
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent
            value='fill'
            className='mt-4 flex min-h-0 flex-1 flex-col overflow-hidden'
          >
            {selectedTemplate ? (
              <div className='flex flex-1 flex-col overflow-hidden'>
                <div className='flex-1 overflow-y-auto px-6 pb-6'>
                  <div className='mb-4 rounded-lg border bg-card p-4'>
                    <div className='flex items-center justify-between'>
                      <h3 className='font-medium'>{selectedTemplate.title}</h3>
                      <Button
                        variant='ghost'
                        size='sm'
                        className={`
                          h-auto p-0 text-muted-foreground
                          hover:text-foreground
                        `}
                        onClick={() => {
                          setSelectedTemplate(null);
                          setActiveTab('browse');
                        }}
                      >
                        {dict.common.templates.selectTemplate}
                      </Button>
                    </div>
                    <p className='mt-1 text-sm text-muted-foreground'>
                      {selectedTemplate.description}
                    </p>
                  </div>

                  <div className='space-y-6'>
                    {selectedTemplate.placeholders.length > 0 ? (
                      <div className='space-y-4'>
                        <h4 className='text-sm font-medium'>
                          {dict.common.templates.fillPlaceholders}
                        </h4>
                        {selectedTemplate.placeholders.map((placeholder) => (
                          <div key={placeholder.name} className='space-y-2'>
                            <div className='flex items-center justify-between'>
                              <Label
                                htmlFor={placeholder.name}
                                className='font-mono text-xs'
                              >
                                {placeholder.name}
                              </Label>
                              {placeholder.example && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <TbInfoCircle
                                        className={`
                                          size-4 text-muted-foreground
                                        `}
                                      />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>
                                        {dict.common.templates.example}:{' '}
                                        {placeholder.example}
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </div>
                            <Input
                              id={placeholder.name}
                              placeholder={
                                placeholder.example || placeholder.name
                              }
                              value={placeholderValues[placeholder.name] || ''}
                              onChange={(e) =>
                                handlePlaceholderChange(
                                  placeholder.name,
                                  e.target.value
                                )
                              }
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div
                        className={`
                          py-4 text-center text-sm text-muted-foreground
                        `}
                      >
                        {dict.common.templates.noPlaceholders}
                      </div>
                    )}

                    <Separator />

                    <div className='space-y-2'>
                      <h4 className='text-sm font-medium'>
                        {dict.common.templates.preview}
                      </h4>
                      <pre
                        className={`
                          max-h-96 overflow-auto rounded-lg border bg-muted p-4
                          font-mono text-xs
                        `}
                      >
                        {filledContent}
                      </pre>
                    </div>
                  </div>
                </div>

                <div className='flex gap-2 border-t p-6'>
                  <Button className='flex-1' onClick={() => handleAction(true)}>
                    {dict.common.templates.createNew}
                  </Button>
                  <Button
                    variant='secondary'
                    className='flex-1'
                    onClick={() => handleAction(false)}
                  >
                    {dict.common.templates.replaceCurrent}
                  </Button>
                </div>
              </div>
            ) : (
              <div
                className={`
                  flex h-full items-center justify-center text-muted-foreground
                `}
              >
                {dict.common.templates.selectTemplate}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
