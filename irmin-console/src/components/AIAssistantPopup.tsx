'use client';

import React, { useState, KeyboardEvent } from 'react';
import Image from 'next/image';
import { AiOutlineSend } from 'react-icons/ai';

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'assistant';
}

export default function AIAssistantPopup() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 0,
      text: 'Hi! My name is Haz and I’m here to help you with your data. Ask me anything!',
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
        <div className='chatWindow fixed bottom-20 right-5 z-10 w-11/12 rounded-xl rounded-br-none bg-white p-4 shadow-lg md:bottom-10 md:right-28 md:w-1/3 lg:w-2/5 xl:w-1/4'>
          <div className='mb-4 h-96 overflow-y-auto'>
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
                      ? 'rounded-bl-none bg-beige'
                      : 'rounded-br-none bg-ash_gray'
                  }`}
                >
                  {message.text}
                </div>
              </div>
            ))}
          </div>
          {messages.filter((a) => a.sender === 'user').length === 0 && (
            <>
              <p>Suggestions:</p>
              <div className='mr-2 flex items-end'>
                <button
                  onClick={() =>
                    setNewMessage('How to connect a new data source?')
                  }
                  className={`my-1 w-full cursor-pointer rounded-lg bg-gray-100 p-2 font-light transition-all hover:bg-gray-200`}
                >
                  {'How to connect a new data source?'}
                </button>
              </div>
              <div className='mr-2 flex items-end'>
                <button
                  onClick={() =>
                    setNewMessage('Which sources do my sales mostly come from?')
                  }
                  className={`my-1 w-full cursor-pointer rounded-lg bg-gray-100 p-2 font-light transition-all hover:bg-gray-200`}
                >
                  {'Which sources do my sales mostly come from?'}
                </button>
              </div>
              <div className='mr-2 flex items-end'>
                <button
                  onClick={() =>
                    setNewMessage('Which ad campaigns are the most profitable?')
                  }
                  className={`my-1 w-full cursor-pointer rounded-lg bg-gray-100 p-2 font-light transition-all hover:bg-gray-200`}
                >
                  {'Which ad campaigns are the most profitable?'}
                </button>
              </div>
            </>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className='flex'
          >
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              className='mr-2 block h-32 w-full appearance-none rounded-lg border bg-ash_gray-900 p-3 leading-5 text-rich_black shadow-md'
              placeholder='Write your message here...'
            />
            <button
              type='submit'
              className='rounded-full bg-ash_gray-400 p-3 text-white hover:bg-ash_gray-500 md:hidden'
            >
              <AiOutlineSend className='h-4 w-4' />
            </button>
          </form>
        </div>
      )}
      <div className='fixed bottom-10 right-5 z-10'>
        <button
          className='cursor-pointer rounded-full bg-ash_gray p-3 text-center shadow-lg transition-all hover:bg-ash_gray-600'
          onClick={() => setOpen(!open)}
        >
          <Image
            src={'/bot.png'} // Make sure this image is in your public directory
            width={50}
            height={50}
            alt='Toggle AI assistant'
          />
        </button>
      </div>
    </>
  );
}
