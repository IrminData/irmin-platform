import Link from "next/link";
import Image from "next/image";

export default function WebsiteFaqsSection() {
  return (
    <>
      <section
        className="pt-24 bg-white"
        style={{
          backgroundImage: 'url("flex-ui-assets/elements/pattern-white.svg")',
          backgroundPosition: "center",
        }}
      >
        <div className="container px-4 mx-auto">
          <div className="max-w-4xl mb-16">
            <span className="inline-block py-px px-2 mb-4 text-xs leading-5 text-white bg-midnight_green font-light uppercase rounded-full shadow-sm">
              FAQ
            </span>
            <h2 className="mb-4 text-4xl md:text-5xl leading-tight text-rich_black font-bold tracking-tighter">
              Frequently Asked Questions
            </h2>
            <p className="text-lg md:text-xl text-rich_black font-light">
              Flex is the only saas business platform that lets you run your
              business on one platform, seamlessly across all digital channels.
            </p>
          </div>
          <div className="flex flex-wrap pb-16 -mx-4">
            <div className="w-full md:w-1/2 xl:w-1/3 px-4 mb-8">
              <div className="md:max-w-xs">
                <div className="inline-flex mb-6 items-center justify-center w-12 h-12 rounded-full bg-ash_gray-500">
                  <Image
                    src="/flex-ui-assets/elements/faq/shield-icon.svg"
                    alt="shield icon"
                    width={16}
                    height={20}
                  />
                </div>
                <h3 className="mb-6 text-xl font-bold text-rich_black">
                  What shipping options do you have?
                </h3>
                <p className="font-light text-rich_black">
                  For USA domestic orders we offer FedEx and USPS shipping.
                  Contact us via email to learn more.
                </p>
              </div>
            </div>
            <div className="w-full md:w-1/2 xl:w-1/3 px-4 mb-8">
              <div className="md:max-w-xs">
                <div className="inline-flex mb-6 items-center justify-center w-12 h-12 rounded-full bg-ash_gray-500">
                  <Image
                    src="/flex-ui-assets/elements/faq/shield-icon.svg"
                    alt="shield icon"
                    width={16}
                    height={20}
                  />
                </div>
                <h3 className="mb-6 text-xl font-bold text-rich_black">
                  What payment methods do you accept?
                </h3>
                <p className="font-light text-rich_black">
                  Any method of payments acceptable by you. For example: We
                  accept MasterCard, Visa.
                </p>
              </div>
            </div>
            <div className="w-full md:w-1/2 xl:w-1/3 px-4 mb-8">
              <div className="md:max-w-xs">
                <div className="inline-flex mb-6 items-center justify-center w-12 h-12 rounded-full bg-ash_gray-500">
                  <Image
                    src="/flex-ui-assets/elements/faq/shield-icon.svg"
                    alt="shield icon"
                    width={16}
                    height={20}
                  />
                </div>
                <h3 className="mb-6 text-xl font-bold text-rich_black">
                  How long does it take to ship my order?
                </h3>
                <p className="font-light text-rich_black">
                  Orders are usually shipped within 1-2 business days after
                  placing the order.
                </p>
              </div>
            </div>
            <div className="w-full md:w-1/2 xl:w-1/3 px-4 mb-8 xl:mb-0">
              <div className="md:max-w-xs">
                <div className="inline-flex mb-6 items-center justify-center w-12 h-12 rounded-full bg-ash_gray-500">
                  <Image
                    src="/flex-ui-assets/elements/faq/shield-icon.svg"
                    alt="shield icon"
                    width={16}
                    height={20}
                  />
                </div>
                <h3 className="mb-6 text-xl font-bold text-rich_black">
                  What shipping options do you have?
                </h3>
                <p className="font-light text-rich_black">
                  For USA domestic orders we offer FedEx and USPS shipping.
                  Contact us via email to learn more.
                </p>
              </div>
            </div>
            <div className="w-full md:w-1/2 xl:w-1/3 px-4 mb-8 md:mb-0">
              <div className="md:max-w-xs">
                <div className="inline-flex mb-6 items-center justify-center w-12 h-12 rounded-full bg-ash_gray-500">
                  <Image
                    src="/flex-ui-assets/elements/faq/shield-icon.svg"
                    alt="shield icon"
                    width={16}
                    height={20}
                  />
                </div>
                <h3 className="mb-6 text-xl font-bold text-rich_black">
                  What payment methods do you accept?
                </h3>
                <p className="font-light text-rich_black">
                  Any method of payments acceptable by you. For example: We
                  accept MasterCard, Visa.
                </p>
              </div>
            </div>
            <div className="w-full md:w-1/2 xl:w-1/3 px-4">
              <div className="md:max-w-xs">
                <div className="inline-flex mb-6 items-center justify-center w-12 h-12 rounded-full bg-ash_gray-500">
                  <Image
                    src="/flex-ui-assets/elements/faq/shield-icon.svg"
                    alt="shield icon"
                    width={16}
                    height={20}
                  />
                </div>
                <h3 className="mb-6 text-xl font-bold text-rich_black">
                  How long does it take to ship my order?
                </h3>
                <p className="font-light text-rich_black">
                  Orders are usually shipped within 1-2 business days after
                  placing the order.
                </p>
              </div>
            </div>
          </div>
          <div
            className="relative -mb-40 py-16 px-4 md:px-8 lg:px-16 bg-rich_black rounded-xl overflow-hidden"
            style={{
              backgroundImage:
                'url("flex-ui-assets/elements/pattern-dark.svg")',
              backgroundPosition: "center",
            }}
          >
            <div className="relative max-w-max mx-auto text-center">
              <h3 className="mb-2 text-2xl md:text-5xl leading-tight font-bold text-ash_gray tracking-tighter">
                Have any additional questions?
              </h3>
              <p className="mb-6 text-base md:text-xl text-white">
                Flex is a Small SaaS Business. Flex isn’t a traditional company.
              </p>
              <Link
                className="inline-flex items-center justify-center px-7 py-3 h-14 w-full md:w-auto mb-2 md:mb-0 md:mr-4 text-lg leading-7 text-green-50 bg-ash_gray-500 hover:bg-ash_gray-600 font-light focus:ring-2 focus:ring-ash_gray-500 focus:ring-opacity-50 border border-transparent rounded-full shadow-sm"
                href="/contact"
              >
                Get in touch
              </Link>
            </div>
          </div>
        </div>
        <div className="h-64 bg-rich_black-50" />
      </section>
    </>
  );
}
