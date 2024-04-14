export default function WebsiteFooter() {
  return (
    <>
      <section
        className="bg-coolGray-900"
        style={{
          backgroundImage: 'url("flex-ui-assets/elements/pattern-dark.svg")',
          backgroundPosition: "center",
        }}
      >
        <div className="container px-4 mx-auto">
          <div className="flex flex-wrap pt-24 pb-12 -mx-4">
            <div className="w-full md:w-1/2 lg:w-4/12 px-4 mb-16 lg:mb-0">
              <a className="inline-block mb-4" href="#">
                <img className="h-8" src="/irmin-logo-light.svg" alt="" />
              </a>
              <p className="text-base md:text-lg text-coolGray-400 font-medium lg:w-64">
                Launch your own Software As A Service Application with Flex
                Solutions.
              </p>
            </div>
            <div className="w-full md:w-1/4 lg:w-2/12 px-4 mb-16 lg:mb-0">
              <h3 className="mb-5 text-lg font-bold text-white">Product</h3>
              <ul>
                <li className="mb-4">
                  <a
                    className="inline-block text-coolGray-400 hover:text-coolGray-500 font-medium"
                    href="#"
                  >
                    Features
                  </a>
                </li>
                <li className="mb-4">
                  <a
                    className="inline-block text-coolGray-400 hover:text-coolGray-500 font-medium"
                    href="#"
                  >
                    Solutions
                  </a>
                </li>
                <li className="mb-4">
                  <a
                    className="inline-block text-coolGray-400 hover:text-coolGray-500 font-medium"
                    href="#"
                  >
                    Pricing
                  </a>
                </li>
                <li className="mb-4">
                  <a
                    className="inline-block text-coolGray-400 hover:text-coolGray-500 font-medium"
                    href="#"
                  >
                    Tutorials
                  </a>
                </li>
                <li>
                  <a
                    className="inline-block text-coolGray-400 hover:text-coolGray-500 font-medium"
                    href="#"
                  >
                    Updates
                  </a>
                </li>
              </ul>
            </div>
            <div className="w-full md:w-1/4 lg:w-2/12 px-4 mb-16 lg:mb-0">
              <h3 className="mb-5 text-lg font-bold text-white">Remaining</h3>
              <ul>
                <li className="mb-4">
                  <a
                    className="inline-block text-coolGray-400 hover:text-coolGray-500 font-medium"
                    href="#"
                  >
                    Blog
                  </a>
                </li>
                <li className="mb-4">
                  <a
                    className="inline-block text-coolGray-400 hover:text-coolGray-500 font-medium"
                    href="#"
                  >
                    Newsletter
                  </a>
                </li>
                <li className="mb-4">
                  <a
                    className="inline-block text-coolGray-400 hover:text-coolGray-500 font-medium"
                    href="#"
                  >
                    Help Centre
                  </a>
                </li>
                <li className="mb-4">
                  <a
                    className="inline-block text-coolGray-400 hover:text-coolGray-500 font-medium"
                    href="#"
                  >
                    Careers
                  </a>
                </li>
                <li>
                  <a
                    className="inline-block text-coolGray-400 hover:text-coolGray-500 font-medium"
                    href="#"
                  >
                    Support
                  </a>
                </li>
              </ul>
            </div>
            <div className="w-full md:w-1/3 lg:w-4/12 px-4">
              <h3 className="mb-5 text-lg font-bold text-white">Newsletter</h3>
              <div className="flex flex-wrap">
                <div className="w-full lg:flex-1 py-1 lg:py-0 lg:mr-3">
                  <input
                    className="px-3 w-full h-12 text-coolGray-900 outline-none placeholder-coolGray-500 border border-coolGray-200 focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 rounded-lg shadow-xsm"
                    placeholder="Your email"
                  />
                </div>
                <div className="w-full lg:w-auto py-1 lg:py-0">
                  <a
                    className="inline-block py-4 px-5 w-full leading-4 text-green-50 font-medium text-center bg-green-500 hover:bg-green-600 focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 rounded-md shadow-sm"
                    href="#"
                  >
                    Subscribe
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="border-b border-coolGray-800" />
        <p className="py-10 md:pb-16 text-sm text-coolGray-400 font-medium text-center">
          © 2024 Irmin. All rights reserved.
        </p>
      </section>
    </>
  );
}
