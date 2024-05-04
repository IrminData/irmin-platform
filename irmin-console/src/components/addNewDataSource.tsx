"use client";
import { useState } from "react";
import { IoAdd, IoClose } from "react-icons/io5";
import DataSourceSetupView from "./dataSourceSetupView";

export default function AddNewDataSource() {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <div className="fixed z-10 top-28 right-10">
        <button
          className="flex items-center justify-center h-10 w-10 bg-ash_gray rounded-full text-white cursor-pointer transition-all hover:opacity-50"
          onClick={() => setIsOpen(true)}
        >
          <IoAdd size={30} />
        </button>
      </div>
      {isOpen && (
        <div
          className="fixed z-50 top-0 left-0 w-screen h-screen"
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.5)",
          }}
        >
          <div className="relative w-full h-full">
            <div className="absolute top-28 right-10 z-10">
              <button
                className="flex items-center justify-center h-10 w-10 bg-ash_gray rounded-full text-white cursor-pointer transition-all hover:opacity-50"
                onClick={() => setIsOpen(false)}
              >
                <IoClose size={30} />
              </button>
            </div>
            <div className="absolute top-0 right-0 w-2/5 h-full bg-white">
              <DataSourceSetupView setIsOpen={setIsOpen} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
