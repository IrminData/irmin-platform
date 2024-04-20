import Link from "next/link";
import Image from "next/image";

export default function WebsiteNewsletterSection() {
  return (
    <>
      <section
        className="relative py-24 bg-white"
        style={{
          backgroundImage: 'url("flex-ui-assets/elements/pattern-white.svg")',
          backgroundPosition: "center",
        }}
      >
        <Image
          className="absolute top-6 left-6 w-24 md:w-auto"
          src="/flex-ui-assets/elements/dots3-violet.svg"
          alt="violet dots"
          width={149}
          height={91}
        />
        <Image
          className="absolute bottom-6 right-6 w-24 md:w-auto"
          src="/flex-ui-assets/elements/dots3-blue.svg"
          alt="blue dots"
          width={149}
          height={91}
        />
        <div className="container relative z-10 px-4 mx-auto">
          <div className="mx-auto max-w-xl text-center">
            <h3 className="mb-4 text-3xl md:text-4xl leading-tight text-rich_black font-bold tracking-tighter">
              Sign up for our newsletter
            </h3>
            <p className="mb-8 text-lg md:text-xl text-rich_black font-light">
              Stay in the loop with everything you need to know.
            </p>
            <div className="mx-auto md:max-w-md text-left">
              <div className="flex flex-wrap mb-1">
                <div className="w-full md:flex-1 mb-3 md:mb-0 md:mr-6">
                  <input
                    className="w-full py-3 px-4 text-rich_black leading-tight placeholder-rich_black focus:outline-none focus:ring-2 focus:ring-ash_gray-500 focus:ring-opacity-50 border border-rich_black rounded-full shadow-xsm"
                    type="text"
                    placeholder="Enter your email"
                  />
                </div>
                <div className="w-full md:w-auto">
                  <Link
                    className="inline-block py-3 px-5 w-full leading-5 text-white bg-ash_gray-500 hover:bg-ash_gray-600 font-light text-center focus:ring-2 focus:ring-ash_gray-500 focus:ring-opacity-50 border border-transparent rounded-full shadow-sm"
                    href="#"
                  >
                    Subscribe
                  </Link>
                </div>
              </div>
              <span className="text-xs text-rich_black font-light">
                <span>We care about your data in our</span>
                <Link
                  className="text-ash_gray-500 hover:text-ash_gray-600"
                  href="#"
                >
                  privacy policy
                </Link>
              </span>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
