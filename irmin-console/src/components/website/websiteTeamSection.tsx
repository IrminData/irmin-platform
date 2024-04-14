import Link from "next/link";
import Image from "next/image";

export default function WebsiteTeamSection() {
  return (
    <>
      <section
        className="py-24 bg-white"
        style={{
          backgroundImage: 'url("/flex-ui-assets/elements/pattern-white.svg")',
          backgroundPosition: "center",
        }}
      >
        <div className="container px-4 mx-auto">
          <div className="flex flex-wrap items-center justify-between -mx-4 mb-16">
            <div className="w-full md:w-1/2 px-4 mb-8 md:mb-0">
              <div className="max-w-md">
                <span className="inline-block py-px px-2 mb-4 text-xs leading-5 text-white bg-ash_gray font-medium uppercase rounded-full">
                  Team
                </span>
                <h3 className="mb-4 text-4xl md:text-5xl font-bold tracking-tighter">
                  Meet our team
                </h3>
                <p className="text-lg md:text-xl text-rich_black font-light">
                  Highly professional and capable of running your business
                  across all digital channels.
                </p>
              </div>
            </div>
            <div className="w-full md:w-auto px-4">
              <div className="flex flex-wrap justify-center">
                <div className="w-full md:w-auto py-1 md:py-0 md:mr-4">
                  <Link
                    className="inline-block py-5 px-7 w-full text-base md:text-lg leading-4 text-white font-medium text-center bg-ash_gray-500 hover:bg-ash_gray-600 focus:ring-2 focus:ring-ash_gray-500 focus:ring-opacity-50 border border-ash_gray-500 rounded-full shadow-sm"
                    href="#"
                  >
                    Open Positions
                  </Link>
                </div>
                <div className="w-full md:w-auto py-1 md:py-0">
                  <Link
                    className="inline-block py-5 px-7 w-full text-base md:text-lg leading-4 text-rich_black font-medium text-center bg-white hover:bg-rich_black-100 focus:ring-2 focus:ring-rich_black focus:ring-opacity-50 border border-rich_black rounded-full shadow-sm"
                    href="#"
                  >
                    About Us
                  </Link>
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap -mx-4">
            <div className="w-full md:w-1/2 lg:w-1/3 px-4 mb-12">
              <div className="max-w-max mx-auto">
                <Image
                  className="block mb-8"
                  src="/flex-ui-assets/images/teams/photo-employee1.png"
                  alt="Employee photo"
                  width={359}
                  height={384}
                />
                <h3 className="mb-2 text-3xl md:text-4xl leading-tight font-semibold">
                  Macauley Herring
                </h3>
                <span className="text-lg font-medium text-ash_gray-500">
                  CEO &amp; Founder
                </span>
              </div>
            </div>
            <div className="w-full md:w-1/2 lg:w-1/3 px-4 mb-12">
              <div className="max-w-max mx-auto">
                <Image
                  className="block mb-8"
                  src="/flex-ui-assets/images/teams/photo-employee6.png"
                  alt="Employee photo"
                  width={359}
                  height={384}
                />
                <h3 className="mb-2 text-3xl md:text-4xl leading-tight font-semibold">
                  Ivan Mathews
                </h3>
                <span className="text-lg font-medium text-ash_gray-500">
                  CTO
                </span>
              </div>
            </div>
            <div className="w-full md:w-1/2 lg:w-1/3 px-4 mb-12">
              <div className="max-w-max mx-auto">
                <Image
                  className="block mb-8"
                  src="/flex-ui-assets/images/teams/photo-employee5.png"
                  alt="Employee photo"
                  width={359}
                  height={384}
                />
                <h3 className="mb-2 text-3xl md:text-4xl leading-tight font-semibold">
                  Elen Benitez
                </h3>
                <span className="text-lg font-medium text-ash_gray-500">
                  CPO
                </span>
              </div>
            </div>
            <div className="w-full md:w-1/2 lg:w-1/3 px-4 mb-12 lg:mb-0">
              <div className="max-w-max mx-auto">
                <Image
                  className="block mb-8"
                  src="/flex-ui-assets/images/teams/photo-employee4.png"
                  alt="Employee photo"
                  width={359}
                  height={384}
                />
                <h3 className="mb-2 text-3xl md:text-4xl leading-tight font-semibold">
                  Macauley Herring
                </h3>
                <span className="text-lg font-medium text-ash_gray-500">
                  Customer Success
                </span>
              </div>
            </div>
            <div className="w-full md:w-1/2 lg:w-1/3 px-4 mb-12 md:mb-0">
              <div className="max-w-max mx-auto">
                <Image
                  className="block mb-8"
                  src="/flex-ui-assets/images/teams/photo-employee3.png"
                  alt="Employee photo"
                  width={359}
                  height={384}
                />
                <h3 className="mb-2 text-3xl md:text-4xl leading-tight font-semibold">
                  Alya Levine
                </h3>
                <span className="text-lg font-medium text-ash_gray-500">
                  Backend Developer
                </span>
              </div>
            </div>
            <div className="w-full md:w-1/2 lg:w-1/3 px-4">
              <div className="max-w-max mx-auto">
                <Image
                  className="block mb-8"
                  src="/flex-ui-assets/images/teams/photo-employee2.png"
                  alt="Employee photo"
                  width={359}
                  height={384}
                />
                <h3 className="mb-2 text-3xl md:text-4xl leading-tight font-semibold">
                  Rose Hernandez
                </h3>
                <span className="text-lg font-medium text-ash_gray-500">
                  iOS Developer
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
