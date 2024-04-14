import Link from "next/link";
import Image from "next/image";

export default function WebsiteCTASection() {
  return (
    <section
      className="py-24 bg-white overflow-hidden"
      style={{
        backgroundImage: 'url("flex-ui-assets/elements/pattern-white.svg")',
        backgroundPosition: "center",
      }}
    >
      <div className="container px-4 mx-auto">
        <div className="flex flex-wrap -mx-4">
          <div className="w-full md:w-1/2 px-4 mb-20 lg:mb-0">
            <div className="max-w-md">
              <h2 className="mb-8 text-4xl md:text-5xl font-heading font-bold text-rich_black md:leading-15">
                Join 6,000+ companies growing with Irmin
              </h2>
              <ul className="mb-8">
                <li className="flex items-center mb-4">
                  <Image
                    className="mr-3"
                    src="/flex-ui-assets/elements/cta/checkbox-green.svg"
                    alt="Green checkbox"
                    width={26}
                    height={26}
                  />
                  <span className="text-lg md:text-xl font-heading text-rich_black">
                    Mauris pellentesque congue libero nec
                  </span>
                </li>
                <li className="flex items-center mb-4">
                  <Image
                    className="mr-3"
                    src="/flex-ui-assets/elements/cta/checkbox-green.svg"
                    alt="Green checkbox"
                    width={26}
                    height={26}
                  />
                  <span className="text-lg md:text-xl font-heading text-rich_black">
                    Suspendisse mollis tincidunt
                  </span>
                </li>
                <li className="flex items-center">
                  <Image
                    className="mr-3"
                    src="/flex-ui-assets/elements/cta/checkbox-green.svg"
                    alt="Green checkbox"
                    width={26}
                    height={26}
                  />
                  <span className="text-lg md:text-xl font-heading text-rich_black">
                    Praesent varius justo vel justo pulvinar
                  </span>
                </li>
              </ul>
              <div className="flex flex-wrap items-center">
                <div className="w-1/2 pr-4">
                  <Link
                    className="inline-block py-4 px-4 w-full text-base md:text-lg leading-4 text-white font-light text-center bg-midnight_green-500 border border-midnight_green-500 rounded-full shadow-sm hover:bg-midnight_green-600 hover:border-midnight_green-600 transition-colors duration-200 ease-in-out"
                    href="/sign-up"
                  >
                    Get started for free
                  </Link>
                </div>
                <div className="w-1/2">
                  <Link
                    className="inline-block py-4 px-4 w-full text-base md:text-lg leading-4 text-rich_black font-light text-center bg-white border border-rich_black rounded-full shadow-sm hover:bg-rich_black transition-colors duration-200 ease-in-out"
                    href="#"
                  >
                    Schedule a live demo
                  </Link>
                </div>
              </div>
            </div>
          </div>
          <div className="w-full md:w-1/2 px-4">
            <div className="relative max-w-max mx-auto">
              <Image
                className="absolute top-0 right-0 -mt-6 lg:-mt-12 -mr-6 lg:-mr-12 w-20 lg:w-auto z-10"
                src="/flex-ui-assets/elements/circle3-yellow.svg"
                alt="Yellow circle"
                width={129}
                height={129}
              />
              <Image
                className="absolute bottom-0 left-0 -mb-6 lg:-mb-10-ml-6 lg:-ml-12 w-20 lg:w-auto"
                src="/flex-ui-assets/elements/dots3-blue.svg"
                alt="Blue dots"
                width={129}
                height={129}
              />
              <Image
                className="relative"
                src="/flex-ui-assets/elements/cta/photo-laptop-ph.png"
                alt="Stock photo"
                width={554}
                height={415}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
