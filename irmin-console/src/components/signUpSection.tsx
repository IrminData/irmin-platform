"use client";

import Link from "next/link";
import Image from "next/image";

export default function SignUpSection() {
  return (
    <>
      <section
        className="relative pt-16 md:py-32 bg-white"
        style={{
          backgroundImage: 'url("/flex-ui-assets/elements/pattern-white.svg")',
          backgroundPosition: "center",
        }}
      >
        <div className="container px-4 mx-auto mb-16 md:mb-0">
          <div className="w-full md:w-1/2 md:pr-4">
            <div className="max-w-sm mx-auto">
              <div className="mb-6 text-center">
                <Link className="inline-block mb-6" href="#">
                  <Image
                    className="h-16"
                    src="/irmin-logo.svg"
                    alt="Irmin logo"
                    width={400}
                    height={100}
                  />
                </Link>
                <h3 className="mb-4 text-2xl md:text-3xl font-bold">
                  Join the data hub
                </h3>
                <p className="text-lg text-rich_black font-light">
                  Give your data a better home
                </p>
              </div>
              <form action="">
                <div className="mb-6">
                  <label
                    className="block mb-2 text-rich_black font-light"
                    htmlFor=""
                  >
                    Name *
                  </label>
                  <input
                    className="appearance-none block w-full p-3 leading-5 text-rich_black border border-rich_black rounded-full shadow-md placeholder-ash_gray focus:outline-none focus:ring-2 focus:ring-ash_gray-500 focus:ring-opacity-50"
                    type="name"
                    placeholder="Patryk"
                  />
                </div>
                <div className="mb-6">
                  <label
                    className="block mb-2 text-rich_black font-light"
                    htmlFor="company"
                  >
                    Company *
                  </label>
                  <input
                    className="appearance-none block w-full p-3 leading-5 text-rich_black border border-rich_black rounded-full shadow-md placeholder-ash_gray focus:outline-none focus:ring-2 focus:ring-ash_gray-500 focus:ring-opacity-50"
                    type="company"
                    placeholder="Acme Inc."
                  />
                </div>
                <div className="mb-6">
                  <label
                    className="block mb-2 text-rich_black font-light"
                    htmlFor=""
                  >
                    Email*
                  </label>
                  <input
                    className="appearance-none block w-full p-3 leading-5 text-rich_black border border-rich_black rounded-full shadow-md placeholder-ash_gray focus:outline-none focus:ring-2 focus:ring-ash_gray-500 focus:ring-opacity-50"
                    type="name"
                    placeholder="name@acme.corp"
                  />
                </div>
                <div className="mb-4">
                  <label
                    className="block mb-2 text-rich_black font-light"
                    htmlFor=""
                  >
                    Password*
                  </label>
                  <input
                    className="appearance-none block w-full p-3 leading-5 text-rich_black border border-rich_black rounded-full shadow-md placeholder-ash_gray focus:outline-none focus:ring-2 focus:ring-ash_gray-500 focus:ring-opacity-50"
                    type="password"
                    placeholder="************"
                  />
                </div>
                <div className="flex flex-wrap items-center justify-between mb-6">
                  <div className="w-full md:w-1/2">
                    <label className="relative inline-flex items-center">
                      <input
                        className="form-checkbox appearance-none"
                        type="checkbox"
                      />
                      <Image
                        className="absolute top-1/2 transform -translate-y-1/2 left-0"
                        src="/flex-ui-assets/elements/sign-up/checkbox-icon.svg"
                        alt="Checkbox icon"
                        width={20}
                        height={20}
                      />
                      <span className="ml-7 text-xs text-rich_black font-light">
                        Remember me
                      </span>
                    </label>
                  </div>
                  <div className="w-full md:w-auto mt-1">
                    <Link
                      className="inline-block text-xs font-light text-ash_gray-500 hover:text-ash_gray-600"
                      href="#"
                    >
                      Forgot your password?
                    </Link>
                  </div>
                </div>
                <button
                  className="inline-block py-3 px-7 mb-6 w-full text-base text-white font-medium text-center leading-6 bg-ash_gray-500 hover:bg-ash_gray-600 focus:ring-2 focus:ring-ash_gray-500 focus:ring-opacity-50 rounded-full shadow-sm"
                  onClick={(e) => {
                    e.preventDefault();
                    window.location.href = "/app/upcharge/dashboards";
                  }}
                >
                  Sign Up
                </button>
                <p className="text-center">
                  <span className="text-xs font-light">
                    Already have an account?{" "}
                  </span>
                  <Link
                    className="inline-block text-xs font-light text-ash_gray-500 hover:text-ash_gray-600 hover:underline"
                    href="/sign-in"
                  >
                    Sign In
                  </Link>
                </p>
              </form>
            </div>
          </div>
        </div>
        <div className="md:absolute md:top-0 md:right-0 md:w-1/2 md:h-full md:pl-4">
          <div className="flex items-center justify-center h-full px-8 py-14 bg-rich_black-50">
            <div className="md:max-w-xl mx-auto text-center">
              <span className="relative z-10 inline-block py-px px-2 mb-4 text-xs leading-5 text-ash_gray-500 bg-ash_gray-100 font-light uppercase rounded-full shadow-sm">
                Quotes
              </span>
              <div className="relative mb-16">
                <Image
                  className="absolute -top-10 left-0 2xl:-left-12"
                  src="/flex-ui-assets/elements/sign-up/quotes-top.svg"
                  alt="Quotes top"
                  width={142}
                  height={98}
                />
                <Image
                  className="absolute -bottom-16 right-0"
                  src="/flex-ui-assets/elements/sign-up/quotes-bottom.svg"
                  alt="Quotes bottom"
                  width={142}
                  height={98}
                />
                <h3 className="relative text-2xl md:text-3xl leading-tight font-light text-rich_black">
                  Love the simplicity of the service and the prompt customer
                  support. We can’t imagine working without it.
                </h3>
              </div>
              <div className="relative text-center">
                <Image
                  className="w-24 h-24 mb-6 mx-auto rounded-full"
                  src="/flex-ui-assets/images/sign-up/avatar-men-sign-up.png"
                  alt="John Doe's avatar"
                  width={88}
                  height={88}
                />
                <h4 className="mb-2 text-lg text-rich_black font-semibold">
                  John Doe
                </h4>
                <span className="block mb-8 text-lg text-rich_black">
                  CEO &amp; Founder at Flex.co
                </span>
                <div className="flex items-center justify-center">
                  <Link
                    className="w-3 h-3 mr-3 bg-rich_black-100 rounded-full"
                    href="#"
                  />
                  <Link
                    className="w-3 h-3 mr-3 bg-ash_gray-500 rounded-full"
                    href="#"
                  />
                  <Link
                    className="w-3 h-3 bg-rich_black-100 rounded-full"
                    href="#"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
