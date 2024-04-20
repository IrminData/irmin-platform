"use client";

import React from "react";
import Image from "next/image";

export default function AIAssistantPopup() {
  return (
    <>
      <div className="fixed z-10 bottom-10 right-10">
        <div className="bg-ash_gray rounded-full shadow-lg text-center p-3 hover:bg-ash_gray-600 transition-all cursor-pointer">
          <Image
            src={"/bot.png"}
            width={50}
            height={50}
            alt="toggle AI assistant"
          />
        </div>
      </div>
    </>
  );
}
