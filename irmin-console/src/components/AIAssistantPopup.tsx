'use client';

import React, { KeyboardEvent, useState } from 'react';

import { AiOutlineSend } from 'react-icons/ai';
import { IoClose } from 'react-icons/io5';
import { RiRobot2Line } from 'react-icons/ri';

import Button from '@/components/misc/Button';

import { useLocale } from '@/context/LocaleContext';

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'assistant';
}

export default function AIAssistantPopup() {
  const { dict } = useLocale();

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 0,
      text: dict.haz.greeting,
      sender: 'assistant',
    },
  ]);
  const [newMessage, setNewMessage] = useState('');

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    const newMsg: Message = {
      id: messages.length,
      text: newMessage,
      sender: 'user',
    };

    setMessages([...messages, newMsg]);
    setNewMessage(''); // Clear input after sending
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      {open && (
        <div className='chatWindow fixed bottom-8 right-2 z-10 max-h-[70vh] w-11/12 rounded-xl rounded-br-none border-t-2 bg-white p-4 shadow-lg md:bottom-6 md:right-16 md:w-1/3 lg:bottom-10 lg:right-24 lg:w-2/5 xl:w-1/4'>
          <div className='mb-4 h-2/3 max-h-[calc(70vh-200px)] overflow-y-auto'>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex items-end ${
                  message.sender === 'user' ? 'justify-start' : 'justify-end'
                }`}
              >
                <div
                  className={`my-1 max-w-xs rounded-lg p-2 font-light ${
                    message.sender === 'user'
                      ? 'rounded-bl-none bg-irmin_light_green'
                      : 'rounded-br-none bg-irmin_green-300'
                  }`}
                >
                  {message.text}
                </div>
              </div>
            ))}
          </div>
          {messages.filter((a) => a.sender === 'user').length === 0 && (
            <>
              <p className='text-xs text-gray-600'>{dict.haz.suggestions}:</p>
              <div className='my-1 mr-2 flex items-end'>
                <Button
                  size='sm'
                  className='w-full rounded-lg bg-gray-100 text-gray-400 hover:bg-gray-50'
                  onClick={() => setNewMessage(dict.haz.howToConnectDataSource)}
                >
                  {dict.haz.howToConnectDataSource}
                </Button>
              </div>
              <div className='my-1 mr-2 flex items-end'>
                <Button
                  size='sm'
                  className='w-full rounded-lg bg-gray-100 text-gray-400 hover:bg-gray-50'
                  onClick={() => setNewMessage(dict.haz.salesSources)}
                >
                  {dict.haz.salesSources}
                </Button>
              </div>
              <div className='my-1 mr-2 flex items-end'>
                <Button
                  size='sm'
                  className='w-full rounded-lg bg-gray-100 text-gray-400 hover:bg-gray-50'
                  onClick={() => setNewMessage(dict.haz.profitableAdCampaigns)}
                >
                  {dict.haz.profitableAdCampaigns}
                </Button>
              </div>
            </>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className='relative flex w-full items-end'
          >
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              className='block h-32 w-full appearance-none rounded-lg border bg-gray-50 p-3 leading-5 text-irmin_black shadow-md'
              placeholder={dict.haz.writeYourMessage}
            />
            <Button
              type='submit'
              variant='icon'
              colorScheme='primary'
              ariaLabel='Send your message to Haz'
              onClick={handleSendMessage}
              className='absolute right-2'
            >
              <AiOutlineSend className='h-6 w-6' />
            </Button>
          </form>
        </div>
      )}
      <div className='fixed bottom-10 right-5 z-10'>
        <Button
          ariaLabel='Toggle AI Assistant'
          type='submit'
          variant='solid'
          colorScheme='tertiary'
          className='rounded-full'
          onClick={() => setOpen(!open)}
        >
          {open ? (
            <IoClose className='text-[25px] text-white' />
          ) : (
            <RiRobot2Line className='text-[25px] text-white' />
          )}
        </Button>
      </div>
    </>
  );
}
