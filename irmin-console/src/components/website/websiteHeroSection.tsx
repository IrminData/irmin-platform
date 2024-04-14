import Link from "next/link";
import Image from "next/image";

export default function WebsiteHeroSection() {
  return (
    <>
      <section className="overflow-hidden">
        <div
          className="relative bg-white overflow-hidden"
          style={{
            backgroundImage: 'url("flex-ui-assets/elements/pattern-white.svg")',
            backgroundPosition: "center",
          }}
        >
          <div className="pt-12 pb-28 md:pb-72">
            <div className="container px-4 mx-auto">
              <div className="mx-auto text-center max-w-3xl">
                <span className="inline-block py-px px-2 mb-4 text-xs leading-5 text-white bg-midnight_green font-light uppercase rounded-full shadow-sm">
                  Data hub
                </span>
                <h1 className="mb-6 text-3xl md:text-5xl lg:text-6xl leading-tight font-bold tracking-tighter">
                  AI-powered <span className="text-ash_gray">ETL platform</span>{" "}
                  with integrated{" "}
                  <span className="text-ash_gray">data marketplace</span> for
                  analysts.
                </h1>
                <p className="mb-8 mx-auto text-lg md:text-xl text-rich_black-500 font-light max-w-3xl">
                  Streamline your data integration effortlessly with advanced
                  ETL, SQL transformations, and an AI Assistant. Enhance
                  decision-making using our rich data marketplace for access to
                  valuable data assets.
                </p>
                <div className="flex flex-wrap justify-center">
                  <div className="w-full md:w-auto py-1 md:py-0 md:mr-4">
                    <Link
                      className="inline-block py-5 px-7 w-full text-base md:text-lg leading-4 text-white font-light text-center bg-midnight_green-500 border border-midnight_green-500 rounded-full shadow-sm hover:bg-midnight_green-600 hover:border-midnight_green-600 transition-colors duration-200 ease-in-out"
                      href="/sign-up"
                    >
                      Get started for free
                    </Link>
                  </div>
                  <div className="w-full md:w-auto py-1 md:py-0">
                    <Link
                      className="inline-block py-5 px-7 w-full text-base md:text-lg leading-4 text-rich_black-500 font-light text-center bg-white border border-rich_black-200 rounded-full shadow-sm hover:bg-rich_black-900 transition-colors duration-200 ease-in-out"
                      href="#"
                    >
                      Schedule a live demo
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="container px-4 py-20 md:pb-32 mx-auto -mt-32 md:-mt-72">
          <div className="relative mx-auto max-w-max">
            <Image
              className="absolute z-20 -left-8 -top-8 w-28 md:w-auto"
              src="/flex-ui-assets/elements/wave-green.svg"
              alt="Green wave"
              width={180}
              height={81}
            />
            <Image
              className="absolute -right-8 -bottom-8 w-28 md:w-auto"
              src="/flex-ui-assets/elements/wave-yellow.svg"
              alt="Yellow wave"
              width={180}
              height={81}
            />
            <svg
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 cursor-pointer text-ash_gray-500 hover:text-ash_gray-600"
              width={64}
              height={64}
              viewBox="0 0 64 64"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx={32} cy={32} r={32} fill="currentColor" />
              <path
                className="text-white"
                d="M40.5 31.13L26.5 23.05C26.348 22.9622 26.1755 22.916 26 22.916C25.8245 22.916 25.652 22.9622 25.5 23.05C25.3474 23.1381 25.2208 23.265 25.133 23.4177C25.0452 23.5705 24.9993 23.7438 25 23.92V40.08C24.9993 40.2562 25.0452 40.4295 25.133 40.5822C25.2208 40.735 25.3474 40.8619 25.5 40.95C25.652 41.0378 25.8245 41.084 26 41.084C26.1755 41.084 26.348 41.0378 26.5 40.95L40.5 32.87C40.6539 32.7828 40.7819 32.6563 40.871 32.5035C40.96 32.3506 41.007 32.1769 41.007 32C41.007 31.8231 40.96 31.6494 40.871 31.4965C40.7819 31.3437 40.6539 31.2172 40.5 31.13ZM27 38.35V25.65L38 32L27 38.35Z"
                fill="currentColor"
              />
            </svg>
            <div className="relative overflow-hidden rounded-7xl">
              <Image
                src="/flex-ui-assets/images/headers/placeholder-video2.png"
                alt="Video placeholder image"
                width={944}
                height={531}
              />
              <video
                className="absolute top-1/2 left-1/2 transform -translate-y-1/2 -translate-x-1/2 min-h-full min-w-full max-w-none"
                poster="flex-ui-assets/images/testimonials/video-frame.jpeg"
              >
                <source
                  src="https://static.shuffle.dev/files/video-placeholder.mp4"
                  type="video/mp4"
                />
              </video>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
