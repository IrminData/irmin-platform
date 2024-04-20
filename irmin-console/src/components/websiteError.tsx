import Link from "next/link";
import Image from "next/image";

export default function WebsiteError() {
  return (
    <>
      <section
        className="relative bg-white"
        style={{
          backgroundImage: 'url("flex-ui-assets/elements/pattern-white.svg")',
          backgroundPosition: "center",
        }}
      >
        <Image
          className="md:hidden w-full"
          src="/flex-ui-assets/images/http-codes/dog-error-side.png"
          alt="Dog image for error 404"
          width={600}
          height={700}
        />
        <Image
          className="absolute top-0 left-0 hidden md:block h-full w-2/5 md:object-cover"
          src="/flex-ui-assets/images/http-codes/dog-error-side.png"
          alt="Dog image for error 404"
          width={600}
          height={700}
        />
        <div className="relative z-10 container px-4 mx-auto">
          <div className="flex flex-wrap py-16 md:py-40 lg:py-72">
            <div className="w-full md:w-1/2 ml-auto text-center md:text-left">
              <div className="md:max-w-xl">
                <span className="inline-block py-px px-2 mb-4 text-xs leading-5 text-white bg-ash_gray font-medium rounded-full shadow-sm">
                  Error 404
                </span>
                <h2 className="mb-4 text-4xl md:text-5xl leading-tight font-bold tracking-tighter">
                  Oh no! Error 404
                </h2>
                <p className="mb-6 text-lg md:text-xl text-rich_black">
                  Something went wrong, so this page is broken.
                </p>
                <div className="flex flex-wrap">
                  <div className="w-full lg:w-auto py-1 lg:py-0 lg:mr-6">
                    <Link
                      className="inline-block py-5 px-7 w-full text-base md:text-lg leading-4 text-white font-medium text-center bg-ash_gray-500 hover:bg-ash_gray-600 focus:ring-2 focus:ring-ash_gray-500 focus:ring-opacity-50 border border-ash_gray-500 rounded-full shadow-sm"
                      href="/"
                    >
                      Go back to Homepage
                    </Link>
                  </div>
                  <div className="w-full lg:w-auto py-1 lg:py-0">
                    <Link
                      className="inline-block py-5 px-7 w-full text-base md:text-lg leading-4 text-rich_black font-medium text-center bg-white  focus:ring-rich_black focus:ring-opacity-50 border border-rich_black rounded-full shadow-sm"
                      href="#"
                    >
                      Try Again
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <Image
          className="absolute right-6 top-6 hidden md:block w-24 md:w-auto"
          src="/flex-ui-assets/elements/dots3-green.svg"
          alt="Green dots"
          width={149}
          height={91}
        />
        <Image
          className="absolute right-0 bottom-0 w-24 md:w-auto"
          src="/flex-ui-assets/elements/wave3-red.svg"
          alt="Red wave"
          width={160}
          height={160}
        />
      </section>
    </>
  );
}
