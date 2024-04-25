import Link from "next/link";
import React from "react";
import { FiDatabase, FiUser } from "react-icons/fi";
import { TbDatabaseImport } from "react-icons/tb";

const SQLEditorNew = ({ addNewTab }: { addNewTab: () => void }) => {
  return (
    <div className="flex flex-col items-center justify-center">
      {/* Cards Container */}
      <div className="flex justify-center space-x-8 mb-16">
        {/* Card 1 */}
        <button
          className="border rounded-lg p-6 w-96 text-center flex flex-col items-center space-y-4 hover:opacity-40 transition-all cursor-pointer"
          onClick={addNewTab}
        >
          <FiDatabase size={24} />
          <h2 className="font-bold text-lg">Create an SQL model</h2>
          <p>Start exploring your data by jumping into the code editor</p>
        </button>

        {/* Card 2 */}
        <button className="border rounded-lg p-6 w-96 text-center flex flex-col items-center space-y-4 hover:opacity-40 transition-all cursor-pointer">
          <FiUser size={24} />
          <h2 className="font-bold text-lg">
            Meet Haz, Your SQL Query Expert!
          </h2>
          <p>Haz, your AI assistant, is here to lend a hand with SQL queries</p>
        </button>
      </div>

      <div className="border-t w-full flex justify-center items-center p-4">
        <Link
          className={`p-6 w-96 flex items-center justify-between border rounded-lg hover:opacity-40 transition-all cursor-pointer`}
          href="/app/upcharge/data-sources"
        >
          <div className="flex items-center">
            <TbDatabaseImport className="mr-2 text-xl" />
            <p className="font-light text-base">Setup new data Source</p>
          </div>
        </Link>
      </div>
    </div>
  );
};

export default SQLEditorNew;
