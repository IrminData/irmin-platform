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
} from 'react-icons/tb';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { useAIApplicationContext } from '@/context/AIApplicationContext';
import { useLocale } from '@/context/LocaleContext';

/**
 * AI Application connection details section
 * Displays API key, MCP endpoint, REST API endpoint, and connection instructions
 */
const AIApplicationConnectionDetails = () => {
  const { aiApplication } = useAIApplicationContext();
  const { dict } = useLocale();

  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKeyCopied, setApiKeyCopied] = useState(false);
  const [configCopied, setConfigCopied] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);

  const streamableHttpConfig = {
    mcpServers: {
      irmin: {
        url: `${
          process.env.NEXT_PUBLIC_API_URL ?? 'https://api.irmin.dev/api'
        }/v1/ai-app/mcp`,
        headers: {
          Authorization: `Bearer ${aiApplication.api_key || '<YOUR_API_KEY>'}`,
        },
      },
    },
  };

  const mcpRemoteConfig = {
    mcpServers: {
      irmin: {
        command: 'npx',
        args: [
          '-y',
          'mcp-remote@latest',
          `${
            process.env.NEXT_PUBLIC_API_URL ?? 'https://api.irmin.dev/api'
          }/v1/ai-app/mcp`,
          '--header',
          'Authorization: Bearer ${AUTH_TOKEN}',
        ],
        env: {
          AUTH_TOKEN: aiApplication.api_key || '<YOUR_API_KEY>',
        },
      },
    },
  };

  const mcpEndpoint = `${
    process.env.NEXT_PUBLIC_API_URL ?? 'https://api.irmin.dev/api'
  }/v1/ai-app/mcp`;

  const restApiEndpoint = `${
    process.env.NEXT_PUBLIC_API_URL ?? 'https://api.irmin.dev/api'
  }/v1/ai-app`;

  const handleCopyApiKey = useCallback(async () => {
    if (aiApplication.api_key) {
      await navigator.clipboard.writeText(aiApplication.api_key);
      setApiKeyCopied(true);
      setTimeout(() => setApiKeyCopied(false), 2000);
    }
  }, [aiApplication.api_key]);

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
  };

  return (
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
                    {showApiKey ? <TbEyeOff size={14} /> : <TbEye size={14} />}
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
              <h4 className='font-medium'>{dict.aiApplication.howToConnect}</h4>
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
                <span>
                  {dict.aiApplication.howToConnectMcpPrefix}
                  <strong>{dict.aiApplication.howToConnectMcpBold}</strong>
                  {dict.aiApplication.howToConnectMcpSuffix}
                </span>
              </li>
              <li>
                <span>
                  {dict.aiApplication.howToConnectApiKeyPrefix}
                  <strong>{dict.aiApplication.howToConnectApiKeyBold}</strong>
                  {dict.aiApplication.howToConnectApiKeySuffix}
                </span>
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
                <Tabs defaultValue='streamable-http'>
                  <TabsList>
                    <TabsTrigger value='streamable-http'>
                      Streamable HTTP
                    </TabsTrigger>
                    <TabsTrigger value='mcp-remote'>mcp-remote</TabsTrigger>
                  </TabsList>
                  {(['streamable-http', 'mcp-remote'] as const).map((tab) => {
                    const config =
                      tab === 'streamable-http'
                        ? streamableHttpConfig
                        : mcpRemoteConfig;
                    return (
                      <TabsContent key={tab} value={tab}>
                        <div
                          className={`
                            relative rounded-md bg-muted/50 p-3 font-mono
                            text-xs
                          `}
                        >
                          <pre
                            className={`
                              overflow-x-auto break-all whitespace-pre-wrap
                            `}
                          >
                            {JSON.stringify(config, null, 2)}
                          </pre>
                          <Button
                            size='icon'
                            variant='ghost'
                            className={`
                              absolute top-2 right-2 size-6
                              text-muted-foreground
                              hover:bg-background hover:text-foreground
                            `}
                            onClick={() => {
                              navigator.clipboard.writeText(
                                JSON.stringify(config, null, 2)
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
                      </TabsContent>
                    );
                  })}
                </Tabs>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AIApplicationConnectionDetails;
