import Link from "next/link";
import Image from "next/image";

export default function WebsitePricingSection() {
  return (
    <>
      <section
        className="py-20 xl:py-24 bg-white"
        style={{
          backgroundImage: 'url("/flex-ui-assets/elements/pattern-white.svg")',
          backgroundPosition: "center",
        }}
      >
        <div className="container px-4 mx-auto">
          <div className="text-center">
            <span className="inline-block py-px px-2 mb-4 text-xs leading-5 text-white bg-midnight_green font-light uppercase rounded-full shadow-sm">
              Pricing
            </span>
            <h3 className="mb-6 text-3xl md:text-5xl text-rich_black font-bold tracking-tighter">
              Flexible pricing plan for your startup
            </h3>
            <div className="flex items-center justify-center w-full mb-12">
              <Link
                className="inline-block mr-4 text-lg md:text-xl text-rich_black font-light"
                href="#"
              >
                Billed Monthly
              </Link>
              <label
                className="flex items-center cursor-pointer rounded-full shadow-lg"
                htmlFor="toggle"
              >
                <div className="relative">
                  <input className="sr-only" id="toggleB" type="checkbox" />
                  <div className="block bg-ash_gray-500 w-20 h-9 rounded-full" />
                  <div className="dot absolute right-1 top-1 bg-white w-7 h-7 rounded-full shadow-lg" />
                </div>
              </label>
              <Link
                className="inline-block ml-4 text-lg md:text-xl text-rich_black font-light"
                href="#"
              >
                Billed Annually
              </Link>
            </div>
          </div>
          <div className="flex flex-wrap justify-center -mx-4">
            <div className="w-full md:w-1/2 lg:w-1/3 p-4">
              <div className="flex flex-col pt-8 pb-8 h-full bg-green-50 rounded-xl shadow-md hover:scale-105 transition duration-500">
                <div className="px-8 text-center">
                  <h3 className="mb-2 text-3xl md:text-4xl text-rich_black font-semibold tracking-tighter">
                    Small
                  </h3>
                  <p className="mb-6 text-rich_black font-light">
                    For Individual Users
                  </p>
                  <div className="mb-6">
                    <span className="relative -top-10 right-1 text-3xl text-rich_black font-bold">
                      $
                    </span>
                    <span className="text-6xl md:text-7xl text-rich_black font-semibold tracking-tighter">
                      10
                    </span>
                    <span className="inline-block ml-1 text-rich_black font-semibold">
                      /mo
                    </span>
                  </div>
                  <Link
                    className="inline-block py-4 px-7 mb-8 w-full text-base md:text-lg leading-6 text-green-50 font-light text-center bg-ash_gray-500 hover:bg-ash_gray-600 focus:ring-2 focus:ring-ash_gray-500 focus:ring-opacity-50 rounded-full shadow-sm"
                    href="#"
                  >
                    Get Started Now
                  </Link>
                </div>
                <ul className="self-start px-8">
                  <li className="flex items-center mb-4 text-rich_black font-light">
                    <Image
                      className="mr-3"
                      src="/flex-ui-assets/elements/pricing/checkbox-green.svg"
                      alt="Green checkbox"
                      width={26}
                      height={26}
                    />
                    <span>Access to all features</span>
                  </li>
                  <li className="flex items-center mb-4 text-rich_black font-light">
                    <Image
                      className="mr-3"
                      src="/flex-ui-assets/elements/pricing/checkbox-green.svg"
                      alt="Green checkbox"
                      width={26}
                      height={26}
                    />
                    <span>Assisted onboarding support</span>
                  </li>
                  <li className="flex items-center mb-4 text-rich_black font-light">
                    <Image
                      className="mr-3"
                      src="/flex-ui-assets/elements/pricing/checkbox-green.svg"
                      alt="Green checkbox"
                      width={26}
                      height={26}
                    />
                    <span>CPM Overage: Unlimited</span>
                  </li>
                  <li className="flex items-center text-rich_black font-light">
                    <Image
                      className="mr-3"
                      src="/flex-ui-assets/elements/pricing/checkbox-green.svg"
                      alt="Green checkbox"
                      width={26}
                      height={26}
                    />
                    <span>Program reviews 1x a month</span>
                  </li>
                </ul>
              </div>
            </div>
            <div className="w-full md:w-1/2 lg:w-1/3 p-4">
              <div className="flex flex-col pt-8 pb-8 h-full bg-green-50 rounded-xl shadow-md hover:scale-105 transition duration-500">
                <div className="px-8 text-center">
                  <h3 className="mb-2 text-3xl md:text-4xl text-rich_black font-semibold tracking-tighter">
                    Medium
                  </h3>
                  <p className="mb-6 text-rich_black font-light">
                    For bigger teams
                  </p>
                  <div className="mb-6">
                    <span className="relative -top-10 right-1 text-3xl text-rich_black font-bold">
                      $
                    </span>
                    <span className="text-6xl md:text-7xl text-rich_black font-semibold tracking-tighter">
                      99
                    </span>
                    <span className="inline-block ml-1 text-rich_black font-semibold">
                      /mo
                    </span>
                  </div>
                  <Link
                    className="inline-block py-4 px-7 mb-8 w-full text-base md:text-lg leading-6 text-green-50 font-light text-center bg-ash_gray-500 hover:bg-ash_gray-600 focus:ring-2 focus:ring-ash_gray-500 focus:ring-opacity-50 rounded-full shadow-sm"
                    href="#"
                  >
                    Get Started Now
                  </Link>
                </div>
                <ul className="self-start px-8">
                  <li className="flex items-center mb-4 text-rich_black font-light">
                    <Image
                      className="mr-3"
                      src="/flex-ui-assets/elements/pricing/checkbox-green.svg"
                      alt="Green checkbox"
                      width={26}
                      height={26}
                    />
                    <span>Access to all features</span>
                  </li>
                  <li className="flex items-center mb-4 text-rich_black font-light">
                    <Image
                      className="mr-3"
                      src="/flex-ui-assets/elements/pricing/checkbox-green.svg"
                      alt="Green checkbox"
                      width={26}
                      height={26}
                    />
                    <span>Assisted onboarding support</span>
                  </li>
                  <li className="flex items-center mb-4 text-rich_black font-light">
                    <Image
                      className="mr-3"
                      src="/flex-ui-assets/elements/pricing/checkbox-green.svg"
                      alt="Green checkbox"
                      width={26}
                      height={26}
                    />
                    <span>CPM Overage: Unlimited</span>
                  </li>
                  <li className="flex items-center mb-4 text-rich_black font-light">
                    <Image
                      className="mr-3"
                      src="/flex-ui-assets/elements/pricing/checkbox-green.svg"
                      alt="Green checkbox"
                      width={26}
                      height={26}
                    />
                    <span>Program reviews 1x a month</span>
                  </li>
                  <li className="flex items-center text-rich_black font-light">
                    <Image
                      className="mr-3"
                      src="/flex-ui-assets/elements/pricing/checkbox-green.svg"
                      alt="Green checkbox"
                      width={26}
                      height={26}
                    />
                    <span>CPM Overage: Unlimited</span>
                  </li>
                </ul>
              </div>
            </div>
            <div className="w-full md:w-1/2 lg:w-1/3 p-4">
              <div className="flex flex-col pt-8 pb-8 h-full bg-green-50 rounded-xl shadow-md hover:scale-105 transition duration-500">
                <div className="px-8 text-center">
                  <h3 className="mb-2 text-3xl md:text-4xl text-rich_black font-semibold tracking-tighter">
                    Large
                  </h3>
                  <p className="mb-6 text-rich_black font-light">
                    Unlimited possibilities
                  </p>
                  <div className="mb-6">
                    <span className="relative -top-10 right-1 text-3xl text-rich_black font-bold">
                      $
                    </span>
                    <span className="text-6xl md:text-7xl text-rich_black font-semibold tracking-tighter">
                      799
                    </span>
                    <span className="inline-block ml-1 text-rich_black font-semibold">
                      /mo
                    </span>
                  </div>
                  <Link
                    className="inline-block py-4 px-7 mb-8 w-full text-base md:text-lg leading-6 text-green-50 font-light text-center bg-ash_gray-500 hover:bg-ash_gray-600 focus:ring-2 focus:ring-ash_gray-500 focus:ring-opacity-50 rounded-full shadow-sm"
                    href="#"
                  >
                    Get Started Now
                  </Link>
                </div>
                <ul className="self-start px-8">
                  <li className="flex items-center mb-4 text-rich_black font-light">
                    <Image
                      className="mr-3"
                      src="/flex-ui-assets/elements/pricing/checkbox-green.svg"
                      alt="Green checkbox"
                      width={26}
                      height={26}
                    />
                    <span>Access to all features</span>
                  </li>
                  <li className="flex items-center mb-4 text-rich_black font-light">
                    <Image
                      className="mr-3"
                      src="/flex-ui-assets/elements/pricing/checkbox-green.svg"
                      alt="Green checkbox"
                      width={26}
                      height={26}
                    />
                    <span>Assisted onboarding support</span>
                  </li>
                  <li className="flex items-center mb-4 text-rich_black font-light">
                    <Image
                      className="mr-3"
                      src="/flex-ui-assets/elements/pricing/checkbox-green.svg"
                      alt="Green checkbox"
                      width={26}
                      height={26}
                    />
                    <span>CPM Overage: Unlimited</span>
                  </li>
                  <li className="flex items-center mb-4 text-rich_black font-light">
                    <Image
                      className="mr-3"
                      src="/flex-ui-assets/elements/pricing/checkbox-green.svg"
                      alt="Green checkbox"
                      width={26}
                      height={26}
                    />
                    <span>Program reviews 1x a month</span>
                  </li>
                  <li className="flex items-center mb-4 text-rich_black font-light">
                    <Image
                      className="mr-3"
                      src="/flex-ui-assets/elements/pricing/checkbox-green.svg"
                      alt="Green checkbox"
                      width={26}
                      height={26}
                    />
                    <span>CPM Overage: Unlimited</span>
                  </li>
                  <li className="flex items-center mb-4 text-rich_black font-light">
                    <Image
                      className="mr-3"
                      src="/flex-ui-assets/elements/pricing/checkbox-green.svg"
                      alt="Green checkbox"
                      width={26}
                      height={26}
                    />
                    <span>Assisted onboarding support</span>
                  </li>
                  <li className="flex items-center text-rich_black font-light">
                    <Image
                      className="mr-3"
                      src="/flex-ui-assets/elements/pricing/checkbox-green.svg"
                      alt="Green checkbox"
                      width={26}
                      height={26}
                    />
                    <span>CPM Overage: Unlimited</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
