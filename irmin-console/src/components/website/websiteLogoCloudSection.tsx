import Image from "next/image";

export default function WebsiteLogoCloudSection() {
  return (
    <section className="py-12 bg-rich_black">
      <div className="container px-4 mx-auto">
        <h3 className="mb-8 text-center font-light leading-6 text-white">
          Trusted by the top companies
        </h3>
        <div className="flex flex-wrap justify-center -mx-4">
          <div className="w-1/2 md:w-1/3 lg:w-1/5 px-4 mb-8 lg:mb-0">
            <Image
              className="mx-auto invert brightness-0"
              src="/flex-ui-assets/brands/logo-clouds/jiggle-logo-dark.svg"
              alt="Jiggle logo"
              width={186}
              height={44}
            />
          </div>
          <div className="w-1/2 md:w-1/3 lg:w-1/5 px-4 mb-8 lg:mb-0">
            <Image
              className="mx-auto invert brightness-0"
              src="/flex-ui-assets/brands/logo-clouds/symtric-logo-dark.svg"
              alt="Symtric logo"
              width={186}
              height={44}
            />
          </div>
          <div className="w-1/2 md:w-1/3 lg:w-1/5 px-4 mb-8 lg:mb-0">
            <Image
              className="mx-auto invert brightness-0"
              src="/flex-ui-assets/brands/logo-clouds/wishelp-logo-dark.svg"
              alt="Wishelp logo"
              width={186}
              height={44}
            />
          </div>
          <div className="w-1/2 md:w-1/3 lg:w-1/5 px-4 mb-8 md:mb-0">
            <Image
              className="mx-auto invert brightness-0"
              src="/flex-ui-assets/brands/logo-clouds/resecurb-logo-dark.svg"
              alt="Resecurb logo"
              width={186}
              height={44}
            />
          </div>
          <div className="w-1/2 md:w-1/3 lg:w-1/5 px-4">
            <Image
              className="mx-auto invert brightness-0"
              src="/flex-ui-assets/brands/logo-clouds/welytics-logo-dark.svg"
              alt="WeLytics logo"
              width={186}
              height={44}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
