"use client";

import React, { useState, KeyboardEvent } from "react";
import Image from "next/image";
import { AiOutlineSend } from "react-icons/ai";

interface Message {
  id: number;
  text: string;
  sender: "user" | "assistant";
}

export default function AIAssistantPopup() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 0,
      text: "Hi! My name is Haz and I’m here to help you with your data. Ask me anything!",
      sender: "assistant",
    },
  ]);
  const [newMessage, setNewMessage] = useState("");

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    const newMsg: Message = {
      id: messages.length,
      text: newMessage,
      sender: "user",
    };

    setMessages([...messages, newMsg]);
    setNewMessage(""); // Clear input after sending
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      {open && (
        <div className="chatWindow fixed z-10 bottom-20 md:bottom-10 right-5 md:right-28 bg-white rounded-lg shadow-lg p-4 w-11/12 md:w-1/3 lg:w-2/5 xl:w-1/4">
          <div className="overflow-y-auto h-96 mb-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex items-end ${
                  message.sender === "user" ? "justify-start" : "justify-end"
                }`}
              >
                <div
                  className={`max-w-xs p-2 rounded-lg my-1 font-light ${
                    message.sender === "user"
                      ? "bg-beige rounded-bl-none"
                      : "bg-ash_gray rounded-br-none"
                  }`}
                >
                  {message.text}
                </div>
              </div>
            ))}
          </div>
          {messages.filter((a) => a.sender === "user").length === 0 && (
            <>
              <p>Suggestions:</p>
              <div className="flex items-end mr-2">
                <button
                  onClick={() =>
                    setNewMessage("How to connect a new data source?")
                  }
                  className={`w-full p-2 rounded-lg my-1 font-light bg-gray-100 cursor-pointer hover:bg-gray-200 transition-all`}
                >
                  {"How to connect a new data source?"}
                </button>
              </div>
              <div className="flex items-end mr-2">
                <button
                  onClick={() =>
                    setNewMessage("Which sources do my sales mostly come from?")
                  }
                  className={`w-full p-2 rounded-lg my-1 font-light bg-gray-100 cursor-pointer hover:bg-gray-200 transition-all`}
                >
                  {"Which sources do my sales mostly come from?"}
                </button>
              </div>
              <div className="flex items-end mr-2">
                <button
                  onClick={() =>
                    setNewMessage("Which ad campaigns are the most profitable?")
                  }
                  className={`w-full p-2 rounded-lg my-1 font-light bg-gray-100 cursor-pointer hover:bg-gray-200 transition-all`}
                >
                  {"Which ad campaigns are the most profitable?"}
                </button>
              </div>
            </>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex"
          >
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              className="h-32 w-full appearance-none block p-3 leading-5 text-rich_black border rounded-lg shadow-md bg-ash_gray-900 mr-2"
              placeholder="Write your message here..."
            />
            <button
              type="submit"
              className="bg-ash_gray-400 hover:bg-ash_gray-500 text-white rounded-full p-3 md:hidden"
            >
              <AiOutlineSend className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
      <div className="fixed z-10 bottom-10 right-5">
        <button
          className="bg-ash_gray rounded-full shadow-lg text-center p-3 hover:bg-ash_gray-600 transition-all cursor-pointer"
          onClick={() => setOpen(!open)}
        >
          <Image
            src={"/bot.png"} // Make sure this image is in your public directory
            width={50}
            height={50}
            alt="Toggle AI assistant"
          />
        </button>
      </div>
    </>
  );
}
