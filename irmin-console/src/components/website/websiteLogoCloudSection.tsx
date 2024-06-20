import Image from 'next/image';

export default function WebsiteLogoCloudSection() {
  return (
    <section className='bg-rich_black py-12'>
      <div className='container mx-auto px-4'>
        <h3 className='mb-8 text-center font-light leading-6 text-white'>
          Trusted by the top companies
        </h3>
        <div className='-mx-4 flex flex-wrap justify-center'>
          <div className='mb-8 w-1/2 px-4 md:w-1/3 lg:mb-0 lg:w-1/5'>
            <Image
              className='mx-auto brightness-0 invert'
              src='/ui-assets/brands/example-logo.svg'
              alt='Symtric logo'
              width={186}
              height={44}
            />
          </div>
          <div className='mb-8 w-1/2 px-4 md:w-1/3 lg:mb-0 lg:w-1/5'>
            <Image
              className='mx-auto brightness-0 invert'
              src='/ui-assets/brands/example-logo.svg'
              alt='Symtric logo'
              width={186}
              height={44}
            />
          </div>
          <div className='mb-8 w-1/2 px-4 md:w-1/3 lg:mb-0 lg:w-1/5'>
            <Image
              className='mx-auto brightness-0 invert'
              src='/ui-assets/brands/example-logo.svg'
              alt='Symtric logo'
              width={186}
              height={44}
            />
          </div>
          <div className='mb-8 w-1/2 px-4 md:mb-0 md:w-1/3 lg:w-1/5'>
            <Image
              className='mx-auto brightness-0 invert'
              src='/ui-assets/brands/example-logo.svg'
              alt='Symtric logo'
              width={186}
              height={44}
            />
          </div>
          <div className='w-1/2 px-4 md:w-1/3 lg:w-1/5'>
            <Image
              className='mx-auto brightness-0 invert'
              src='/ui-assets/brands/example-logo.svg'
              alt='Symtric logo'
              width={186}
              height={44}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
