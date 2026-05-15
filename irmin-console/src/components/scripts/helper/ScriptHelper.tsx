'use client';

import { useCallback, useMemo, useState } from 'react';

import {
  TbCheck,
  TbChevronDown,
  TbCopy,
  TbExternalLink,
  TbInfoCircle,
  TbSparkles,
} from 'react-icons/tb';

import { Button } from '@/components/ui/button';
import { ButtonWithTooltip } from '@/components/ui/button-with-tooltip';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import { useLocale } from '@/context/LocaleContext';

import { ScriptGenerationChat } from './ScriptGenerationChat';

interface ScriptHelperProps {
  scriptName?: string;
  language?: string;
  currentContent?: string;
  repositorySlug?: string;
  repositoryObjectPath?: string;
  repositoryRef?: string;
}

/**
 * Side-sheet AI helper for the script editor. Talks to the irmin-ai
 * `scripting` agent which generates Go code and can delegate SQL authoring
 * to the dedicated query agent via its `query_sql_assistant` tool.
 *
 * Mirrors SqlHelper structurally: a sparkle button opens a two-tab sheet
 * (Generate Script + Reference). Chat state is hoisted here so it survives
 * sheet open/close, and resets when the underlying script identity changes.
 */
export default function ScriptHelper({
  scriptName,
  language,
  currentContent,
  repositorySlug,
  repositoryObjectPath,
  repositoryRef,
}: ScriptHelperProps) {
  const { dict } = useLocale();
  const [open, setOpen] = useState(false);

  const [chatMessages, setChatMessages] = useState<
    Array<{ id: string; role: 'user' | 'assistant'; content: string }>
  >([]);
  const [chatConversationId, setChatConversationId] = useState<
    string | undefined
  >(undefined);

  const handleChatReset = useCallback(() => {
    setChatMessages([]);
    setChatConversationId(undefined);
  }, []);

  const agentContext = useMemo(() => {
    const ctx: Record<string, unknown> = {};
    if (scriptName) ctx['script-name'] = scriptName;
    if (language) ctx['language'] = language;
    if (currentContent) ctx['current-script-content'] = currentContent;
    if (repositorySlug) ctx['repository-slug'] = repositorySlug;
    if (repositoryObjectPath)
      ctx['repository-object-path'] = repositoryObjectPath;
    if (repositoryRef) ctx['repository-ref'] = repositoryRef;
    return ctx;
  }, [
    scriptName,
    language,
    currentContent,
    repositorySlug,
    repositoryObjectPath,
    repositoryRef,
  ]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <ButtonWithTooltip
          variant='secondary'
          size='sm'
          icon={<TbSparkles size={18} aria-hidden='true' />}
          className='size-8 p-0'
          tooltip={dict.scriptHelper.title}
        />
      </SheetTrigger>
      <SheetContent
        className={`
          flex w-[400px] flex-col overflow-hidden
          focus:outline-none
          focus-visible:outline-none
          sm:w-[540px]
        `}
      >
        <SheetHeader>
          <SheetTitle>{dict.scriptHelper.title}</SheetTitle>
        </SheetHeader>

        <Tabs
          defaultValue='generate'
          className={`
            flex flex-1 flex-col overflow-hidden
            focus:outline-none
            focus-visible:outline-none
          `}
        >
          <TabsList
            className={`
              grid w-full grid-cols-2 gap-1 bg-transparent px-2
              focus:outline-none
              focus-visible:outline-none
            `}
          >
            <TabsTrigger
              value='generate'
              className={`
                focus:outline-none
                focus-visible:outline-none
              `}
            >
              {dict.scriptHelper.generateScript}
            </TabsTrigger>
            <TabsTrigger
              value='reference'
              className={`
                focus:outline-none
                focus-visible:outline-none
              `}
            >
              {dict.scriptHelper.referenceTab}
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value='generate'
            className='mt-4 flex flex-1 flex-col overflow-hidden'
          >
            <div className='flex-1 overflow-hidden'>
              <ScriptGenerationChat
                context={agentContext}
                messages={chatMessages}
                setMessages={setChatMessages}
                conversationId={chatConversationId}
                setConversationId={setChatConversationId}
                onReset={handleChatReset}
              />
            </div>
          </TabsContent>

          <TabsContent
            value='reference'
            className='mt-4 flex-1 overflow-y-auto pb-12'
          >
            <section className='mb-4 px-2'>
              <div className='rounded-md border bg-card p-2'>
                <div className='mb-2 flex items-center justify-between'>
                  <h3 className='text-sm font-semibold'>
                    {dict.scriptHelper.poweredBy}
                  </h3>
                  <a
                    href='https://github.com/IrminData/irmin-sdk-go'
                    target='_blank'
                    rel='noopener noreferrer'
                    className={`
                      flex items-center gap-1 text-xs text-accent
                      hover:underline
                    `}
                  >
                    {dict.scriptHelper.sdkDocs}
                    <TbExternalLink size={12} aria-hidden='true' />
                  </a>
                </div>
                <p className='text-xs text-muted-foreground'>
                  {dict.scriptHelper.runtimeDescription}
                </p>
              </div>
            </section>

            <section className='mb-4 px-2'>
              <div className='rounded-md border bg-card p-2'>
                <h3 className='mb-2 text-sm font-semibold'>
                  {dict.scriptHelper.contractTitle}
                </h3>
                <p className='mb-2 text-xs text-muted-foreground'>
                  {dict.scriptHelper.contractDescription}
                </p>
                <ul
                  className={`
                    list-disc space-y-1 pl-4 text-xs text-muted-foreground
                  `}
                >
                  <li>{dict.scriptHelper.contractPoints.singleFile}</li>
                  <li>{dict.scriptHelper.contractPoints.stdlibOnly}</li>
                  <li>{dict.scriptHelper.contractPoints.apiFlags}</li>
                  <li>{dict.scriptHelper.contractPoints.errors}</li>
                </ul>
              </div>
            </section>

            <section className='mb-4 px-2'>
              <Collapsible defaultOpen>
                <div className='rounded-md border bg-card'>
                  <CollapsibleTrigger asChild>
                    <Button
                      variant='ghost'
                      className='flex w-full items-center justify-between p-2'
                    >
                      <h3 className='text-sm font-semibold'>
                        {dict.scriptHelper.skeletonTitle}
                      </h3>
                      <TbChevronDown className='size-4' aria-hidden='true' />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className='p-2'>
                    <ExampleItem
                      title={dict.scriptHelper.skeletonTitle}
                      code={`package main

import (
\t"context"
\t"log"

\tirmincore "github.com/IrminData/irmin-sdk-go/api"
\tirminutils "github.com/IrminData/irmin-sdk-go/utils"
)

func main() {
\tctx := context.Background()

\tapiURL, apiKey, err := irminutils.GetAPIFromFlags()
\tif err != nil {
\t\tlog.Fatalf("Error getting API flags: %v", err)
\t}

\tclient := irmincore.NewClient(apiURL, apiKey, "en")

\t// ...your logic here, using client + ctx...
\t_ = client
}`}
                      explanation={dict.scriptHelper.explanations.skeleton}
                    />
                  </CollapsibleContent>
                </div>
              </Collapsible>
            </section>

            <section className='mb-4 px-2'>
              <Collapsible>
                <div className='rounded-md border bg-card'>
                  <CollapsibleTrigger asChild>
                    <Button
                      variant='ghost'
                      className='flex w-full items-center justify-between p-2'
                    >
                      <h3 className='text-sm font-semibold'>
                        {dict.scriptHelper.inputOutputTitle}
                      </h3>
                      <TbChevronDown className='size-4' aria-hidden='true' />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className='p-2'>
                    <p className='mb-3 text-xs text-muted-foreground'>
                      {dict.scriptHelper.inputOutputDescription}
                    </p>
                    <ExampleItem
                      title={dict.scriptHelper.readInputsTitle}
                      code={`inputs, err := irminutils.ListInputFiles()
if err != nil {
\tlog.Fatalf("Error listing input files: %v", err)
}
for _, name := range inputs {
\tcontent, err := irminutils.GetInputFile(name)
\tif err != nil {
\t\tlog.Fatalf("Error reading input %s: %v", name, err)
\t}
\t// process content...
\t_ = content
}`}
                      explanation={dict.scriptHelper.explanations.readInputs}
                    />
                    <ExampleItem
                      title={dict.scriptHelper.writeOutputsTitle}
                      code={`if err := irminutils.SendComputeResult(payload, "result.json"); err != nil {
\tlog.Fatalf("Error sending result: %v", err)
}`}
                      explanation={dict.scriptHelper.explanations.writeOutputs}
                    />
                  </CollapsibleContent>
                </div>
              </Collapsible>
            </section>

            <section className='mb-4 px-2'>
              <Collapsible>
                <div className='rounded-md border bg-card'>
                  <CollapsibleTrigger asChild>
                    <Button
                      variant='ghost'
                      className='flex w-full items-center justify-between p-2'
                    >
                      <h3 className='text-sm font-semibold'>
                        {dict.scriptHelper.sqlInScriptsTitle}
                      </h3>
                      <TbChevronDown className='size-4' aria-hidden='true' />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className='p-2'>
                    <p className='mb-3 text-xs text-muted-foreground'>
                      {dict.scriptHelper.sqlInScriptsDescription}
                    </p>
                    <div
                      className={`
                        rounded-md bg-muted p-2 font-mono text-xs break-all
                      `}
                    >
                      {`$["workspace;repository;object.json@ref"]`}
                    </div>
                    <p className='mt-2 text-xs text-muted-foreground'>
                      {dict.scriptHelper.sqlInScriptsNote}
                    </p>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            </section>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  return (
    <Button
      variant='ghost'
      size='sm'
      onClick={handleCopy}
      className='h-6 gap-1 px-2 text-xs'
    >
      {copied ? (
        <TbCheck size={14} aria-hidden='true' />
      ) : (
        <TbCopy size={14} aria-hidden='true' />
      )}
      {label && <span>{copied ? 'Copied' : label}</span>}
    </Button>
  );
}

function ExampleItem({
  title,
  code,
  explanation,
}: {
  title: string;
  code: string;
  explanation?: string;
}) {
  return (
    <div className='rounded-md border bg-card'>
      <div
        className={`
          flex items-center justify-between border-b bg-muted/30 px-3 py-1.5
        `}
      >
        <div className='flex items-center gap-1.5'>
          <span className='text-xs font-medium'>{title}</span>
          {explanation && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className={`
                      cursor-help text-muted-foreground
                      hover:text-foreground
                    `}
                  >
                    <TbInfoCircle size={14} aria-hidden='true' />
                  </div>
                </TooltipTrigger>
                <TooltipContent side='right' className='max-w-xs text-xs'>
                  <p>{explanation}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <CopyButton text={code} />
      </div>
      <div className='p-2'>
        <pre className='overflow-x-auto font-mono text-xs whitespace-pre-wrap'>
          {code}
        </pre>
      </div>
    </div>
  );
}
