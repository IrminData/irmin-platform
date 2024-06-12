"use client";
import React from "react";

import Image from "next/image";
import Link from "next/link";

import { RxDashboard } from "react-icons/rx";
import { CiDatabase } from "react-icons/ci";
import { AiOutlineConsoleSql } from "react-icons/ai";
import {
  TbDatabaseImport,
  TbDatabaseExport,
  TbSettings,
  TbBell,
  TbLogout,
  TbSearch,
} from "react-icons/tb";
import { PiStorefront } from "react-icons/pi";

import AIAssistantPopup from "./AIAssistantPopup";

export default function DashboardNavigation({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  return (
    <>
      <AIAssistantPopup />
      <section className="min-h-full">
        <div className="fixed top-4 left-4 z-50 block md:hidden">
          <button
            className="w-14 h-14 relative focus:outline-none bg-ash_gray rounded-full"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <div className="block w-5 absolute left-6 top-1/2   transform  -translate-x-1/2 -translate-y-1/2">
              <span
                className={`block absolute h-0.5 w-7 text-white bg-current transform transition duration-500 ease-in-out ${
                  isMenuOpen ? "rotate-45" : "-translate-y-1.5"
                }`}
              ></span>
              <span
                className={`block absolute h-0.5 w-5 text-white bg-current transform transition duration-500 ease-in-out ${
                  isMenuOpen ? "opacity-0" : ""
                }`}
              ></span>
              <span
                className={`block absolute h-0.5 w-7 text-white bg-current transform  transition duration-500 ease-in-out ${
                  isMenuOpen ? "-rotate-45" : "translate-y-1.5"
                }`}
              ></span>
            </div>
          </button>
        </div>
        <div
          className={`z-40 fixed top-0 flex flex-col justify-between bg-rich_black w-full md:w-2/5 xl:w-1/5 h-full overflow-y-scroll ${
            isMenuOpen ? "block" : "hidden md:block"
          }`}
        >
          <div className="relative mt-24 md:mt-4">
            <div className="p-4 w-full z-40">
              <Link
                className="block max-w-max"
                href="/"
                onClick={() => setIsMenuOpen(false)}
              >
                <Image
                  className="h-8"
                  src="/irmin-logo-light.svg"
                  alt="Irmin logo"
                  width={170}
                  height={100}
                />
              </Link>
              <div className="absolute right-8 top-5">
                <Link
                  className="block max-w-max text-ash_gray hover:text-ash_gray-800"
                  href="/app/inbox"
                >
                  <TbBell className="text-2xl" />
                </Link>
              </div>
            </div>
            <div className="mt-8 px-5">
              <div className="flex flex-wrap items-center">
                <div className="flex flex-wrap">
                  <div className="w-auto p-2">
                    <img
                      src="/flex-ui-assets/images/dashboard/navigations/avatar.png"
                      alt="John Doe"
                    />
                  </div>
                  <div className="w-auto p-2">
                    <h2 className="text-sm font-semibold text-ash_gray">
                      John Doe
                    </h2>
                    <p className="text-sm font-light text-ash_gray">
                      johndoe@flex.co
                    </p>
                  </div>
                </div>
              </div>
              <div className="block mt-4 w-full px-4 py-4 text-sm text-gray-900 border border-gray-300 rounded-full bg-gray-50 ">
                <select className="w-full">
                  <option>UpCharge Oy</option>
                  <option>Tecci Oy</option>
                  <option>Create new workspace</option>
                </select>
              </div>
            </div>
            <div className="mt-6">
              <p className="px-8 mb-2 text-xs font-medium text-ash_gray uppercase">
                Workspace
              </p>
              <ul className="px-4 mb-8">
                <li>
                  <Link
                    className={`p-3 py-4 flex items-center justify-between text-ash_gray hover:text-ash_gray-800 hover:bg-rich_black rounded-md`}
                    href="/app/upcharge/dashboards"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <div className="flex items-center">
                      <RxDashboard className="mr-2 text-xl" />
                      <p className="font-light text-base">Dashboards</p>
                    </div>
                  </Link>
                </li>
                <li>
                  <Link
                    className={`p-3 py-4 flex items-center justify-between text-ash_gray hover:text-ash_gray-800 hover:bg-rich_black rounded-md`}
                    href="/app/upcharge/data-sets"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <div className="flex items-center">
                      <CiDatabase className="mr-2 text-xl" />
                      <p className="font-light text-base">Data Sets</p>
                    </div>
                  </Link>
                </li>
                <li>
                  <Link
                    className="p-3 py-4 flex items-center justify-between text-ash_gray hover:text-ash_gray-800 hover:bg-rich_black rounded-md"
                    href="/app/upcharge/editor"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <div className="flex items-center">
                      <AiOutlineConsoleSql className="mr-2 text-xl" />
                      <p className="font-light text-base">Editor</p>
                    </div>
                  </Link>
                </li>
                <li>
                  <Link
                    className={`p-3 py-4 flex items-center justify-between text-ash_gray hover:text-ash_gray-800 hover:bg-rich_black rounded-md`}
                    href="/app/upcharge/data-sources"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <div className="flex items-center">
                      <TbDatabaseImport className="mr-2 text-xl" />
                      <p className="font-light text-base">Connections</p>
                    </div>
                  </Link>
                </li>
                <li>
                  <Link
                    className="p-3 py-4 flex items-center justify-between text-ash_gray hover:text-ash_gray-800 hover:bg-rich_black rounded-md"
                    href="/app/upcharge/reverse-etl"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <div className="flex items-center">
                      <TbDatabaseExport className="mr-2 text-xl" />
                      <p className="font-light text-base">Reverse ETL</p>
                    </div>
                  </Link>
                </li>
                <li>
                  <Link
                    className="p-3 py-4 flex items-center justify-between text-ash_gray hover:text-ash_gray-800 hover:bg-rich_black rounded-md"
                    href="/app/upcharge/settings"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <div className="flex items-center">
                      <TbSettings className="mr-2 text-xl" />
                      <p className="font-light text-base">Workspace settings</p>
                    </div>
                  </Link>
                </li>
                <li>
                  <Link
                    className="p-3 py-4 flex items-center justify-between text-ash_gray hover:text-ash_gray-800 hover:bg-rich_black rounded-md"
                    href="/app/upcharge/data-marketplace"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <div className="flex items-center">
                      <PiStorefront className="mr-2 text-xl" />
                      <p className="font-light text-base">Data marketplace</p>
                    </div>
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="relative flex-1" />
          <div className="relative">
            <p className="px-8 text-xs font-medium text-ash_gray uppercase">
              Settings
            </p>
            <ul className="p-4">
              <li>
                <Link
                  className="p-3 py-4 flex items-center justify-between text-ash_gray hover:text-ash_gray-800 hover:bg-rich_black rounded-md"
                  href="/app/settings"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <div className="flex items-center">
                    <TbSettings className="mr-2 text-xl" />
                    <p className="font-light text-base">Settings</p>
                  </div>
                </Link>
              </li>
              <li>
                <Link
                  className="p-3 py-4 flex items-center justify-between text-ash_gray hover:text-ash_gray-800 hover:bg-rich_black rounded-md"
                  href="/"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <div className="flex items-center">
                    <TbLogout className="mr-2 text-xl" />
                    <p className="font-light text-base">Sign out</p>
                  </div>
                </Link>
              </li>
              <li className="mt-4">
                <Link
                  className="text-center text-ash_gray hover:text-ash_gray-800"
                  href="/contact"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <p className="font-light text-xs">Contact support</p>
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div
          className={`w-screen md:ml-[40%] xl:ml-[20%] md:w-3/5 xl:w-4/5 fixed z-40 ${
            isMenuOpen ? "hidden md:block" : ""
          }`}
        >
          <div className="py-5 px-4 bg-white shadow-md">
            <div className="flex flex-wrap items-center justify-between -m-2">
              <div className="w-auto p-2"></div>
              <div className="w-auto p-2">
                <div className="flex flex-wrap items-center -m-3">
                  <div className="w-auto p-3 flex justify-end lg:w-[700px]">
                    <form className="w-64 lg:w-96 focus-within:w-full transition-all">
                      <div className="relative">
                        <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                          <TbSearch className="text-gray-500" />
                        </div>
                        <input
                          type="search"
                          id="default-search"
                          className="block w-full p-4 ps-10 text-xs md:text-sm text-gray-900 border border-gray-300 rounded-full bg-gray-50 focus:outline-none"
                          placeholder="Search Data, Insights, Connectors..."
                          required
                        />
                        <button
                          type="submit"
                          className="text-white absolute end-1.5 bottom-2.5 text-xs md:text-sm bg-ash_gray hover:bg-ash_gray-800 focus:ring-4 focus:outline-none font-light rounded-full px-4 py-2"
                        >
                          Search
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <div className="md:ml-[40%] xl:ml-[20%] md:w-3/5 xl:w-4/5 w-100 min-h-full pt-[94px] px-4">
        {/* Dashboard content */}
        {children}
      </div>
    </>
  );
}
