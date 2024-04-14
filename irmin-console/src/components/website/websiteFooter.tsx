import Link from "next/link";
import Image from "next/image";

export default function WebsiteFooter() {
  return (
    <>
      <section className="bg-rich_black">
        <div className="container mx-auto">
          <div className="flex flex-wrap pt-24 pb-12">
            <div className="w-full md:w-1/2 lg:w-4/12 px-4 mb-16 lg:mb-0">
              <Link className="inline-block mb-4" href="#">
                <Image
                  className="h-8"
                  src="/irmin-logo-light.svg"
                  alt="Irmin light color logo"
                  width={100}
                  height={25}
                />
              </Link>
              <p className="text-base text-ash_gray font-light lg:w-64">
                A better home for your data. Irmin is a ETL and data management
                platform that helps you to collect, clean, and transform your
                data.
              </p>
            </div>
            <div className="w-full md:w-1/4 lg:w-2/12 px-4 mb-16 lg:mb-0">
              <h3 className="mb-5 text-lg font-bold text-white">Product</h3>
              <ul>
                <li className="mb-4">
                  <Link
                    className="inline-block text-base text-ash_gray font-light hover:text-white transition-colors duration-200"
                    href="#"
                  >
                    Features
                  </Link>
                </li>
                <li className="mb-4">
                  <Link
                    className="inline-block text-base text-ash_gray font-light hover:text-white transition-colors duration-200"
                    href="#"
                  >
                    Solutions
                  </Link>
                </li>
                <li className="mb-4">
                  <Link
                    className="inline-block text-base text-ash_gray font-light hover:text-white transition-colors duration-200"
                    href="#"
                  >
                    Pricing
                  </Link>
                </li>
                <li className="mb-4">
                  <Link
                    className="inline-block text-base text-ash_gray font-light hover:text-white transition-colors duration-200"
                    href="#"
                  >
                    Tutorials
                  </Link>
                </li>
                <li>
                  <Link
                    className="inline-block text-base text-ash_gray font-light hover:text-white transition-colors duration-200"
                    href="#"
                  >
                    Updates
                  </Link>
                </li>
              </ul>
            </div>
            <div className="w-full md:w-1/4 lg:w-2/12 px-4 mb-16 lg:mb-0">
              <h3 className="mb-5 text-lg font-bold text-white">Company</h3>
              <ul>
                <li className="mb-4">
                  <Link
                    className="inline-block text-base text-ash_gray font-light hover:text-white transition-colors duration-200"
                    href="#"
                  >
                    Blog
                  </Link>
                </li>
                <li className="mb-4">
                  <Link
                    className="inline-block text-base text-ash_gray font-light hover:text-white transition-colors duration-200"
                    href="#"
                  >
                    Newsletter
                  </Link>
                </li>
                <li className="mb-4">
                  <Link
                    className="inline-block text-base text-ash_gray font-light hover:text-white transition-colors duration-200"
                    href="#"
                  >
                    Help Centre
                  </Link>
                </li>
                <li className="mb-4">
                  <Link
                    className="inline-block text-base text-ash_gray font-light hover:text-white transition-colors duration-200"
                    href="#"
                  >
                    Careers
                  </Link>
                </li>
                <li>
                  <Link
                    className="inline-block text-base text-ash_gray font-light hover:text-white transition-colors duration-200"
                    href="#"
                  >
                    Support
                  </Link>
                </li>
              </ul>
            </div>
            <div className="w-full md:w-1/3 lg:w-4/12 px-4">
              <h3 className="mb-5 text-lg font-bold text-white">Newsletter</h3>
              <div className="flex flex-wrap">
                <div className="w-full lg:flex-1 py-1 lg:py-0 lg:mr-3">
                  <input
                    className="px-3 w-full h-12 text-rich_black-600 outline-none placeholder-rich_black-500 border border-rich_black-200 focus:ring-2 focus:ring-ash_gray-500 focus:ring-opacity-50 rounded-lg shadow-xsm"
                    placeholder="Your email"
                  />
                </div>
                <div className="w-full lg:w-auto py-1 lg:py-0">
                  <Link
                    className="inline-block py-4 px-5 w-full leading-4 text-ash_gray-50 font-light text-center bg-ash_gray-500 hover:bg-ash_gray-600 focus:ring-2 focus:ring-ash_gray-500 focus:ring-opacity-50 rounded-md shadow-sm"
                    href="#"
                  >
                    Subscribe
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
        <p className="py-10 md:pb-16 text-sm text-ash_gray font-light text-center">
          © 2024 Irmin. All rights reserved.
        </p>
      </section>
    </>
  );
}
