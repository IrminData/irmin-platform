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
                <p className="text-lg text-coolGray-500 font-medium">
                  Give your data a better home
                </p>
              </div>
              <form action="">
                <div className="mb-6">
                  <label
                    className="block mb-2 text-coolGray-800 font-medium"
                    htmlFor=""
                  >
                    Name *
                  </label>
                  <input
                    className="appearance-none block w-full p-3 leading-5 text-coolGray-900 border border-coolGray-200 rounded-lg shadow-md placeholder-coolGray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
                    type="name"
                    placeholder="Patryk"
                  />
                </div>
                <div className="mb-6">
                  <label
                    className="block mb-2 text-coolGray-800 font-medium"
                    htmlFor="company"
                  >
                    Company *
                  </label>
                  <input
                    className="appearance-none block w-full p-3 leading-5 text-coolGray-900 border border-coolGray-200 rounded-lg shadow-md placeholder-coolGray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
                    type="company"
                    placeholder="Acme Inc."
                  />
                </div>
                <div className="mb-6">
                  <label
                    className="block mb-2 text-coolGray-800 font-medium"
                    htmlFor=""
                  >
                    Email*
                  </label>
                  <input
                    className="appearance-none block w-full p-3 leading-5 text-coolGray-900 border border-coolGray-200 rounded-lg shadow-md placeholder-coolGray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
                    type="name"
                    placeholder="name@acme.corp"
                  />
                </div>
                <div className="mb-4">
                  <label
                    className="block mb-2 text-coolGray-800 font-medium"
                    htmlFor=""
                  >
                    Password*
                  </label>
                  <input
                    className="appearance-none block w-full p-3 leading-5 text-coolGray-900 border border-coolGray-200 rounded-lg shadow-md placeholder-coolGray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
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
                        alt=""
                      />
                      <span className="ml-7 text-xs text-coolGray-800 font-medium">
                        Remember me
                      </span>
                    </label>
                  </div>
                  <div className="w-full md:w-auto mt-1">
                    <Link
                      className="inline-block text-xs font-medium text-green-500 hover:text-green-600"
                      href="#"
                    >
                      Forgot your password?
                    </Link>
                  </div>
                </div>
                <Link
                  className="inline-block py-3 px-7 mb-4 w-full text-base text-green-50 font-medium text-center leading-6 bg-green-500 hover:bg-green-600 focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 rounded-md shadow-sm"
                  href="#"
                >
                  Sign Up
                </Link>
                <p className="text-center">
                  <span className="text-xs font-medium">
                    Already have an account?
                  </span>
                  <Link
                    className="inline-block text-xs font-medium text-green-500 hover:text-green-600 hover:underline"
                    href="#"
                  >
                    Sign In
                  </Link>
                </p>
              </form>
            </div>
          </div>
        </div>
        <div className="md:absolute md:top-0 md:right-0 md:w-1/2 md:h-full md:pl-4">
          <div className="flex items-center justify-center h-full px-8 py-14 bg-coolGray-50">
            <div className="md:max-w-xl mx-auto text-center">
              <span className="relative z-10 inline-block py-px px-2 mb-4 text-xs leading-5 text-green-500 bg-green-100 font-medium uppercase rounded-full shadow-sm">
                Quotes
              </span>
              <div className="relative mb-16">
                <Image
                  className="absolute -top-10 left-0 2xl:-left-12"
                  src="/flex-ui-assets/elements/sign-up/quotes-top.svg"
                  alt=""
                />
                <Image
                  className="absolute -bottom-16 right-0"
                  src="/flex-ui-assets/elements/sign-up/quotes-bottom.svg"
                  alt=""
                />
                <h3 className="relative text-2xl md:text-3xl leading-tight font-medium text-coolGray-800">
                  Love the simplicity of the service and the prompt customer
                  support. We can’t imagine working without it.
                </h3>
              </div>
              <div className="relative text-center">
                <Image
                  className="w-24 h-24 mb-6 mx-auto rounded-full"
                  src="/flex-ui-assets/images/sign-up/avatar-men-sign-up.png"
                  alt=""
                />
                <h4 className="mb-2 text-lg text-coolGray-800 font-semibold">
                  John Doe
                </h4>
                <span className="block mb-8 text-lg text-coolGray-400">
                  CEO &amp; Founder at Flex.co
                </span>
                <div className="flex items-center justify-center">
                  <Link
                    className="w-3 h-3 mr-3 bg-coolGray-100 rounded-full"
                    href="#"
                  />
                  <Link
                    className="w-3 h-3 mr-3 bg-green-500 rounded-full"
                    href="#"
                  />
                  <Link
                    className="w-3 h-3 bg-coolGray-100 rounded-full"
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
