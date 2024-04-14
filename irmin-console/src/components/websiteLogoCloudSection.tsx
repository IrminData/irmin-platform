export default function WebsiteLogoCloudSection() {
  return (
    <section
      className="py-20 xl:pt-24 bg-coolGray-900"
      style={{
        backgroundImage: 'url("flex-ui-assets/elements/pattern-dark2.svg")',
        backgroundPosition: "center",
      }}
    >
      <div className="container px-4 mx-auto">
        <h3 className="mb-8 text-center font-medium leading-6 text-coolGray-300">
          Trusted by the top companies in this industry
        </h3>
        <div className="flex flex-wrap justify-center -mx-4">
          <div className="w-1/2 md:w-1/3 lg:w-1/5 px-4 mb-8 lg:mb-0">
            <img
              className="mx-auto"
              src="flex-ui-assets/brands/logo-clouds/jiggle-logo-dark.svg"
              alt=""
            />
          </div>
          <div className="w-1/2 md:w-1/3 lg:w-1/5 px-4 mb-8 lg:mb-0">
            <img
              className="mx-auto"
              src="flex-ui-assets/brands/logo-clouds/symtric-logo-dark.svg"
              alt=""
            />
          </div>
          <div className="w-1/2 md:w-1/3 lg:w-1/5 px-4 mb-8 lg:mb-0">
            <img
              className="mx-auto"
              src="flex-ui-assets/brands/logo-clouds/wishelp-logo-dark.svg"
              alt=""
            />
          </div>
          <div className="w-1/2 md:w-1/3 lg:w-1/5 px-4 mb-8 md:mb-0">
            <img
              className="mx-auto"
              src="flex-ui-assets/brands/logo-clouds/resecurb-logo-dark.svg"
              alt=""
            />
          </div>
          <div className="w-1/2 md:w-1/3 lg:w-1/5 px-4">
            <img
              className="mx-auto"
              src="flex-ui-assets/brands/logo-clouds/welytics-logo-dark.svg"
              alt=""
            />
          </div>
        </div>
      </div>
    </section>
  );
}
