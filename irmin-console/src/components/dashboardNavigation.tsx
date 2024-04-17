"use client";
import React from "react";

import Image from "next/image";
import Link from "next/link";

import { RxDashboard } from "react-icons/rx";
import { CiDatabase } from "react-icons/ci";
import { AiOutlineConsoleSql } from "react-icons/ai";
import { TbDatabaseImport, TbDatabaseExport, TbSettings } from "react-icons/tb";
import { PiStorefront } from "react-icons/pi";

export default function DashboardNavigation({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [isMenuOpen, setIsMenuOpen] = React.useState(true);
  return (
    <section className="overflow-hidden min-h-full">
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
        className={`z-40 fixed top-0 flex flex-col justify-between bg-rich_black w-full md:w-1/4 xl:w-1/5 h-full overflow-y-scroll ${
          isMenuOpen ? "block" : "hidden md:block"
        }`}
      >
        <div className="relative mt-24 md:mt-4">
          <div className="p-4 w-full z-40">
            <Link className="block max-w-max" href="/">
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
                href="#"
              >
                <svg
                  width={24}
                  height={24}
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M18 13.18V10C17.9986 8.58312 17.4958 7.21247 16.5806 6.13077C15.6655 5.04908 14.3971 4.32615 13 4.09V3C13 2.73478 12.8946 2.48043 12.7071 2.29289C12.5196 2.10536 12.2652 2 12 2C11.7348 2 11.4804 2.10536 11.2929 2.29289C11.1054 2.48043 11 2.73478 11 3V4.09C9.60294 4.32615 8.33452 5.04908 7.41939 6.13077C6.50425 7.21247 6.00144 8.58312 6 10V13.18C5.41645 13.3863 4.911 13.7681 4.55294 14.2729C4.19488 14.7778 4.00174 15.3811 4 16V18C4 18.2652 4.10536 18.5196 4.29289 18.7071C4.48043 18.8946 4.73478 19 5 19H8.14C8.37028 19.8474 8.873 20.5954 9.5706 21.1287C10.2682 21.6621 11.1219 21.951 12 21.951C12.8781 21.951 13.7318 21.6621 14.4294 21.1287C15.127 20.5954 15.6297 19.8474 15.86 19H19C19.2652 19 19.5196 18.8946 19.7071 18.7071C19.8946 18.5196 20 18.2652 20 18V16C19.9983 15.3811 19.8051 14.7778 19.4471 14.2729C19.089 13.7681 18.5835 13.3863 18 13.18ZM8 10C8 8.93913 8.42143 7.92172 9.17157 7.17157C9.92172 6.42143 10.9391 6 12 6C13.0609 6 14.0783 6.42143 14.8284 7.17157C15.5786 7.92172 16 8.93913 16 10V13H8V10ZM12 20C11.651 19.9979 11.3086 19.9045 11.0068 19.7291C10.7051 19.5536 10.4545 19.3023 10.28 19H13.72C13.5455 19.3023 13.2949 19.5536 12.9932 19.7291C12.6914 19.9045 12.349 19.9979 12 20ZM18 17H6V16C6 15.7348 6.10536 15.4804 6.29289 15.2929C6.48043 15.1054 6.73478 15 7 15H17C17.2652 15 17.5196 15.1054 17.7071 15.2929C17.8946 15.4804 18 15.7348 18 16V17Z"
                    fill="currentColor"
                  />
                </svg>
              </Link>
            </div>
          </div>
          <div className="mt-8 px-5">
            <div className="flex flex-wrap items-center">
              <div className="flex flex-wrap">
                <div className="w-auto p-2">
                  <img
                    src="flex-ui-assets/images/dashboard/navigations/avatar.png"
                    alt=""
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
                  className="p-3 py-4 flex items-center justify-between text-ash_gray hover:text-ash_gray-800 hover:bg-rich_black rounded-md"
                  href="#"
                >
                  <div className="flex items-center">
                    <RxDashboard className="mr-2 text-xl" />
                    <p className="font-light text-base">Dashboards</p>
                  </div>
                </Link>
              </li>
              <li>
                <Link
                  className="p-3 py-4 flex items-center justify-between text-ash_gray hover:text-ash_gray-800 hover:bg-rich_black rounded-md"
                  href="#"
                >
                  <div className="flex items-center">
                    <CiDatabase className="mr-2 text-xl" />
                    <p className="font-light text-base">Datasets</p>
                  </div>
                </Link>
              </li>
              <li>
                <Link
                  className="p-3 py-4 flex items-center justify-between text-ash_gray hover:text-ash_gray-800 hover:bg-rich_black rounded-md"
                  href="#"
                >
                  <div className="flex items-center">
                    <AiOutlineConsoleSql className="mr-2 text-xl" />
                    <p className="font-light text-base">Editor</p>
                  </div>
                </Link>
              </li>
              <li>
                <Link
                  className="p-3 py-4 flex items-center justify-between text-ash_gray hover:text-ash_gray-800 hover:bg-rich_black rounded-md"
                  href="#"
                >
                  <div className="flex items-center">
                    <TbDatabaseImport className="mr-2 text-xl" />
                    <p className="font-light text-base">Data Sources</p>
                  </div>
                </Link>
              </li>
              <li>
                <Link
                  className="p-3 py-4 flex items-center justify-between text-ash_gray hover:text-ash_gray-800 hover:bg-rich_black rounded-md"
                  href="#"
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
                  href="#"
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
                  href="#"
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
                href="#"
              >
                <div className="flex items-center">
                  <svg
                    className="mr-2"
                    width={24}
                    height={24}
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M14.81 12.28C15.443 11.6002 15.7996 10.7088 15.81 9.78C15.81 8.77748 15.4118 7.81602 14.7029 7.10714C13.994 6.39825 13.0325 6 12.03 6C11.0275 6 10.066 6.39825 9.35714 7.10714C8.64825 7.81602 8.25 8.77748 8.25 9.78C8.26044 10.7088 8.61702 11.6002 9.25 12.28C8.36865 12.7189 7.61022 13.3699 7.04292 14.1746C6.47561 14.9793 6.11723 15.9124 6 16.89C5.97083 17.1552 6.0482 17.4212 6.21511 17.6293C6.38202 17.8375 6.62478 17.9708 6.89 18C7.15522 18.0292 7.42116 17.9518 7.62932 17.7849C7.83749 17.618 7.97083 17.3752 8 17.11C8.11933 16.1411 8.58885 15.2494 9.32009 14.6027C10.0513 13.956 10.9938 13.599 11.97 13.599C12.9462 13.599 13.8887 13.956 14.6199 14.6027C15.3512 15.2494 15.8207 16.1411 15.94 17.11C15.9678 17.3664 16.0936 17.6022 16.2911 17.768C16.4887 17.9339 16.7426 18.017 17 18H17.11C17.3721 17.9698 17.6117 17.8373 17.7766 17.6313C17.9414 17.4252 18.0181 17.1624 17.99 16.9C17.8815 15.9276 17.5344 14.997 16.9796 14.191C16.4248 13.3851 15.6796 12.7286 14.81 12.28ZM12 11.56C11.6479 11.56 11.3038 11.4556 11.0111 11.26C10.7184 11.0644 10.4902 10.7864 10.3555 10.4612C10.2208 10.1359 10.1855 9.77803 10.2542 9.43274C10.3229 9.08745 10.4924 8.77029 10.7414 8.52135C10.9903 8.27241 11.3075 8.10288 11.6527 8.0342C11.998 7.96552 12.3559 8.00077 12.6812 8.13549C13.0064 8.27022 13.2844 8.49837 13.48 8.79109C13.6756 9.0838 13.78 9.42795 13.78 9.78C13.78 10.2521 13.5925 10.7048 13.2586 11.0387C12.9248 11.3725 12.4721 11.56 12 11.56ZM19 2H5C4.20435 2 3.44129 2.31607 2.87868 2.87868C2.31607 3.44129 2 4.20435 2 5V19C2 19.7956 2.31607 20.5587 2.87868 21.1213C3.44129 21.6839 4.20435 22 5 22H19C19.7956 22 20.5587 21.6839 21.1213 21.1213C21.6839 20.5587 22 19.7956 22 19V5C22 4.20435 21.6839 3.44129 21.1213 2.87868C20.5587 2.31607 19.7956 2 19 2ZM20 19C20 19.2652 19.8946 19.5196 19.7071 19.7071C19.5196 19.8946 19.2652 20 19 20H5C4.73478 20 4.48043 19.8946 4.29289 19.7071C4.10536 19.5196 4 19.2652 4 19V5C4 4.73478 4.10536 4.48043 4.29289 4.29289C4.48043 4.10536 4.73478 4 5 4H19C19.2652 4 19.5196 4.10536 19.7071 4.29289C19.8946 4.48043 20 4.73478 20 5V19Z"
                      fill="currentColor"
                    />
                  </svg>
                  <p className="font-light text-base">Accounts</p>
                </div>
              </Link>
            </li>
            <li>
              <Link
                className="p-3 py-4 flex items-center justify-between text-ash_gray hover:text-ash_gray-800 hover:bg-rich_black rounded-md"
                href="#"
              >
                <div className="flex items-center">
                  <svg
                    className="mr-2"
                    width={24}
                    height={24}
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M21.32 9.55L19.43 8.92L20.32 7.14C20.4102 6.95369 20.4404 6.74397 20.4064 6.53978C20.3723 6.33558 20.2758 6.14699 20.13 6L18 3.87C17.8522 3.72209 17.6618 3.62421 17.4555 3.59013C17.2493 3.55605 17.0375 3.58748 16.85 3.68L15.07 4.57L14.44 2.68C14.3735 2.483 14.2472 2.31163 14.0787 2.18975C13.9102 2.06787 13.7079 2.00155 13.5 2H10.5C10.2904 1.99946 10.0858 2.06482 9.91537 2.18685C9.7449 2.30887 9.61709 2.48138 9.55 2.68L8.92 4.57L7.14 3.68C6.95369 3.58978 6.74397 3.55961 6.53978 3.59364C6.33558 3.62767 6.14699 3.72423 6 3.87L3.87 6C3.72209 6.14777 3.62421 6.33818 3.59013 6.54446C3.55605 6.75074 3.58748 6.96251 3.68 7.15L4.57 8.93L2.68 9.56C2.483 9.62654 2.31163 9.75283 2.18975 9.92131C2.06787 10.0898 2.00155 10.2921 2 10.5V13.5C1.99946 13.7096 2.06482 13.9142 2.18685 14.0846C2.30887 14.2551 2.48138 14.3829 2.68 14.45L4.57 15.08L3.68 16.86C3.58978 17.0463 3.55961 17.256 3.59364 17.4602C3.62767 17.6644 3.72423 17.853 3.87 18L6 20.13C6.14777 20.2779 6.33818 20.3758 6.54446 20.4099C6.75074 20.444 6.96251 20.4125 7.15 20.32L8.93 19.43L9.56 21.32C9.62709 21.5186 9.7549 21.6911 9.92537 21.8132C10.0958 21.9352 10.3004 22.0005 10.51 22H13.51C13.7196 22.0005 13.9242 21.9352 14.0946 21.8132C14.2651 21.6911 14.3929 21.5186 14.46 21.32L15.09 19.43L16.87 20.32C17.0551 20.4079 17.2628 20.4369 17.4649 20.4029C17.667 20.3689 17.8538 20.2737 18 20.13L20.13 18C20.2779 17.8522 20.3758 17.6618 20.4099 17.4555C20.444 17.2493 20.4125 17.0375 20.32 16.85L19.43 15.07L21.32 14.44C21.517 14.3735 21.6884 14.2472 21.8103 14.0787C21.9321 13.9102 21.9985 13.7079 22 13.5V10.5C22.0005 10.2904 21.9352 10.0858 21.8132 9.91537C21.6911 9.7449 21.5186 9.61709 21.32 9.55ZM20 12.78L18.8 13.18C18.5241 13.2695 18.2709 13.418 18.0581 13.6151C17.8452 13.8122 17.6778 14.0533 17.5675 14.3216C17.4571 14.5899 17.4064 14.879 17.419 15.1688C17.4315 15.4586 17.5069 15.7422 17.64 16L18.21 17.14L17.11 18.24L16 17.64C15.7436 17.5122 15.4627 17.4411 15.1763 17.4313C14.89 17.4215 14.6049 17.4734 14.3403 17.5834C14.0758 17.6934 13.8379 17.8589 13.6429 18.0688C13.4479 18.2787 13.3003 18.5281 13.21 18.8L12.81 20H11.22L10.82 18.8C10.7305 18.5241 10.582 18.2709 10.3849 18.0581C10.1878 17.8452 9.94671 17.6778 9.67842 17.5675C9.41014 17.4571 9.12105 17.4064 8.83123 17.419C8.5414 17.4315 8.25777 17.5069 8 17.64L6.86 18.21L5.76 17.11L6.36 16C6.4931 15.7422 6.56852 15.4586 6.58105 15.1688C6.59358 14.879 6.5429 14.5899 6.43254 14.3216C6.32218 14.0533 6.15478 13.8122 5.94195 13.6151C5.72912 13.418 5.47595 13.2695 5.2 13.18L4 12.78V11.22L5.2 10.82C5.47595 10.7305 5.72912 10.582 5.94195 10.3849C6.15478 10.1878 6.32218 9.94671 6.43254 9.67842C6.5429 9.41014 6.59358 9.12105 6.58105 8.83123C6.56852 8.5414 6.4931 8.25777 6.36 8L5.79 6.89L6.89 5.79L8 6.36C8.25777 6.4931 8.5414 6.56852 8.83123 6.58105C9.12105 6.59358 9.41014 6.5429 9.67842 6.43254C9.94671 6.32218 10.1878 6.15478 10.3849 5.94195C10.582 5.72912 10.7305 5.47595 10.82 5.2L11.22 4H12.78L13.18 5.2C13.2695 5.47595 13.418 5.72912 13.6151 5.94195C13.8122 6.15478 14.0533 6.32218 14.3216 6.43254C14.5899 6.5429 14.879 6.59358 15.1688 6.58105C15.4586 6.56852 15.7422 6.4931 16 6.36L17.14 5.79L18.24 6.89L17.64 8C17.5122 8.25645 17.4411 8.53735 17.4313 8.82369C17.4215 9.11003 17.4734 9.39513 17.5834 9.65969C17.6934 9.92424 17.8589 10.1621 18.0688 10.3571C18.2787 10.5521 18.5281 10.6997 18.8 10.79L20 11.19V12.78ZM12 8C11.2089 8 10.4355 8.2346 9.77772 8.67413C9.11993 9.11365 8.60724 9.73836 8.30448 10.4693C8.00173 11.2002 7.92252 12.0044 8.07686 12.7804C8.2312 13.5563 8.61217 14.269 9.17158 14.8284C9.73099 15.3878 10.4437 15.7688 11.2196 15.9231C11.9956 16.0775 12.7998 15.9983 13.5307 15.6955C14.2616 15.3928 14.8864 14.8801 15.3259 14.2223C15.7654 13.5645 16 12.7911 16 12C16 10.9391 15.5786 9.92172 14.8284 9.17158C14.0783 8.42143 13.0609 8 12 8ZM12 14C11.6044 14 11.2178 13.8827 10.8889 13.6629C10.56 13.4432 10.3036 13.1308 10.1522 12.7654C10.0009 12.3999 9.96126 11.9978 10.0384 11.6098C10.1156 11.2219 10.3061 10.8655 10.5858 10.5858C10.8655 10.3061 11.2219 10.1156 11.6098 10.0384C11.9978 9.96126 12.3999 10.0009 12.7654 10.1522C13.1308 10.3036 13.4432 10.56 13.6629 10.8889C13.8827 11.2178 14 11.6044 14 12C14 12.5304 13.7893 13.0391 13.4142 13.4142C13.0391 13.7893 12.5304 14 12 14Z"
                      fill="currentColor"
                    />
                  </svg>
                  <p className="font-light text-base">Settings</p>
                </div>
              </Link>
            </li>
            <li>
              <Link
                className="p-3 py-4 flex items-center justify-between text-ash_gray hover:text-ash_gray-800 hover:bg-rich_black rounded-md"
                href="#"
              >
                <div className="flex items-center">
                  <svg
                    className="mr-2"
                    width={24}
                    height={24}
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M16.29 8.71L18.59 11L9.00004 11C8.73483 11 8.48047 11.1054 8.29294 11.2929C8.1054 11.4804 8.00004 11.7348 8.00004 12C8.00004 12.2652 8.1054 12.5196 8.29294 12.7071C8.48047 12.8946 8.73483 13 9.00004 13L18.59 13L16.29 15.29C16.1963 15.383 16.1219 15.4936 16.0712 15.6154C16.0204 15.7373 15.9942 15.868 15.9942 16C15.9942 16.132 16.0204 16.2627 16.0712 16.3846C16.1219 16.5064 16.1963 16.617 16.29 16.71C16.383 16.8037 16.4936 16.8781 16.6155 16.9289C16.7373 16.9797 16.868 17.0058 17 17.0058C17.1321 17.0058 17.2628 16.9797 17.3846 16.9289C17.5065 16.8781 17.6171 16.8037 17.71 16.71L21.71 12.71C21.8011 12.6149 21.8724 12.5028 21.92 12.38C22.0201 12.1365 22.0201 11.8635 21.92 11.62C21.8724 11.4972 21.8011 11.3851 21.71 11.29L17.71 7.29C17.6168 7.19676 17.5061 7.1228 17.3843 7.07234C17.2625 7.02188 17.1319 6.99591 17 6.99591C16.8682 6.99591 16.7376 7.02188 16.6158 7.07234C16.494 7.1228 16.3833 7.19676 16.29 7.29C16.1968 7.38324 16.1228 7.49393 16.0724 7.61575C16.0219 7.73757 15.996 7.86814 15.996 8C15.996 8.13186 16.0219 8.26243 16.0724 8.38425C16.1228 8.50607 16.1968 8.61676 16.29 8.71ZM12 21C12 20.7348 11.8947 20.4804 11.7071 20.2929C11.5196 20.1054 11.2653 20 11 20L5.00004 20C4.73482 20 4.48047 19.8946 4.29293 19.7071C4.1054 19.5196 4.00004 19.2652 4.00004 19L4.00004 5C4.00004 4.73478 4.1054 4.48043 4.29293 4.29289C4.48047 4.10536 4.73483 4 5.00004 4L11 4C11.2653 4 11.5196 3.89464 11.7071 3.70711C11.8947 3.51957 12 3.26522 12 3C12 2.73478 11.8947 2.48043 11.7071 2.29289C11.5196 2.10536 11.2653 2 11 2L5.00004 2C4.20439 2 3.44133 2.31607 2.87872 2.87868C2.31611 3.44129 2.00004 4.20435 2.00004 5L2.00004 19C2.00004 19.7956 2.31611 20.5587 2.87872 21.1213C3.44133 21.6839 4.20439 22 5.00004 22L11 22C11.2653 22 11.5196 21.8946 11.7071 21.7071C11.8947 21.5196 12 21.2652 12 21Z"
                      fill="currentColor"
                    />
                  </svg>
                  <p className="font-light text-base">Sign out</p>
                </div>
              </Link>
            </li>
            <li className="mt-4">
              <Link
                className="text-center text-ash_gray hover:text-ash_gray-800"
                href="/contact"
              >
                <p className="font-light text-xs">Contact support</p>
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div
        className={`w-screen md:ml-[25%] xl:ml-[20%] md:w-3/4 xl:w-4/5 fixed z-40 ${
          isMenuOpen ? "hidden md:block" : ""
        }`}
      >
        <div className="py-5 px-8 bg-white shadow-md">
          <div className="flex flex-wrap items-center justify-between -m-2">
            <div className="w-auto p-2"></div>
            <div className="w-auto p-2">
              <div className="flex flex-wrap items-center -m-3">
                <div className="w-auto p-3">
                  <form className="w-64 lg:w-96 mx-auto">
                    <div className="relative">
                      <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                        <svg
                          className="w-4 h-4 text-gray-500"
                          aria-hidden="true"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 20 20"
                        >
                          <path
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"
                          />
                        </svg>
                      </div>
                      <input
                        type="search"
                        id="default-search"
                        className="block w-full p-4 ps-10 text-xs md:text-sm text-gray-900 border border-gray-300 rounded-full bg-gray-50"
                        placeholder="Search Data, Insights, Connectors..."
                        required
                      />
                      <button
                        type="submit"
                        className="text-white absolute end-1.5 bottom-2.5 text-xs md:text-sm bg-ash_gray hover:bg-ash_gray-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-light rounded-full px-4 py-2"
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

      <div className="md:ml-[25%] xl:ml-[20%] md:w-3/4 xl:w-4/5 fixed w-100 min-h-full pt-[100px] px-4">
        {/* Dashboard content */}
        {children}
      </div>
    </section>
  );
}
