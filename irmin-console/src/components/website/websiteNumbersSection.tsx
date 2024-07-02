export default function WebsiteNumbersSection() {
  return (
    <section
      className='bg-white py-20 xl:pb-32 xl:pt-24'
      style={{
        backgroundImage: 'url("/ui-assets/elements/pattern-white.svg")',
        backgroundPosition: 'center',
      }}
    >
      <div className='container mx-auto max-w-7xl px-4'>
        <div className='text-center'>
          <span className='mb-4 inline-block rounded-full bg-irmin_blue px-2 py-px text-xs font-light uppercase leading-5 text-white'>
            Numbers
          </span>
          <h3 className='mb-4 text-4xl font-bold tracking-tighter text-irmin_black md:text-5xl'>
            We believe in the power of data
          </h3>
          <p className='mx-auto mb-16 max-w-4xl text-lg font-light text-irmin_black md:text-xl xl:mb-24'>
            Flex is the only business platform that lets you run your business
            on one platform, seamlessly across all digital channels.
          </p>
          <div className='-mx-4 flex flex-wrap justify-center'>
            <div className='mb-8 w-full px-4 md:w-1/3 lg:mb-0 lg:w-1/4'>
              <h2 className='mb-2 text-4xl font-bold tracking-tighter text-irmin_black md:text-5xl'>
                235.000
              </h2>
              <p className='text-lg font-light text-irmin_black md:text-xl'>
                Projects completed
              </p>
            </div>
            <div className='mb-8 w-full px-4 md:w-1/3 lg:mb-0 lg:w-1/4'>
              <h2 className='mb-2 text-4xl font-bold tracking-tighter text-irmin_black md:text-5xl'>
                $10m
              </h2>
              <p className='text-lg font-light text-irmin_black md:text-xl'>
                APR
              </p>
            </div>
            <div className='mb-8 w-full px-4 md:w-1/3 lg:mb-0 lg:w-1/4'>
              <h2 className='mb-2 text-4xl font-bold tracking-tighter text-irmin_black md:text-5xl'>
                +50.000
              </h2>
              <p className='text-lg font-light text-irmin_black md:text-xl'>
                Hours Saved Annually
              </p>
            </div>
            <div className='w-full px-4 md:w-1/3 lg:w-1/4'>
              <h2 className='mb-2 text-4xl font-bold tracking-tighter text-irmin_black md:text-5xl'>
                3.500
              </h2>
              <p className='text-lg font-light text-irmin_black md:text-xl'>
                Unique Users
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
