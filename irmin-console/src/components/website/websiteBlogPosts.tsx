import Link from "next/link";
import Image from "next/image";

export default function WebsiteBlogPosts() {
  return (
    <>
      <section
        className="py-24 bg-white"
        style={{
          backgroundImage: 'url("/flex-ui-assets/elements/pattern-white.svg")',
          backgroundRepeat: "no-repeat",
          backgroundPosition: "left top",
        }}
      >
        <div className="container px-4 mx-auto">
          <div className="md:max-w-5xl mx-auto mb-8 md:mb-16 text-center">
            <span className="inline-block py-px px-2 mb-4 text-xs leading-5 text-ash_gray-500 bg-ash_gray-100 font-medium uppercase rounded-full shadow-sm">
              Blog
            </span>
            <h3 className="mb-4 text-3xl md:text-5xl leading-tight text-rich_black font-bold tracking-tighter">
              Our mission is to make knowledge and news accessible for everyone.
            </h3>
            <p className="mb-10 text-lg md:text-xl text-rich_black font-medium">
              With our integrated CRM, project management, collaboration and
              invoicing capabilities, you can manage your business in one secure
              platform.
            </p>
            <div className="relative mx-auto md:w-80">
              <Image
                className="absolute top-1/2 left-4 transform -translate-y-1/2"
                src="/flex-ui-assets/elements/blog/search.svg"
                alt="search icon"
                width={24}
                height={24}
              />
              <input
                className="w-full py-3 pl-12 pr-4 text-rich_black leading-tight placeholder-rich_black border border-rich_black rounded-lg shadow-xsm focus:outline-none focus:ring-2 focus:ring-ash_gray-500 focus:ring-opacity-50"
                type="text"
                placeholder="Search"
              />
            </div>
          </div>
          <ul className="flex flex-wrap mb-8 -mx-2 text-center">
            <li className="w-full md:w-auto px-2">
              <Link
                className="inline-block w-full py-2 px-4 mb-4 md:mb-0 text-sm text-rich_black hover:text-ash_gray-500 hover:bg-ash_gray-200 font-bold rounded-md hover:shadow-sm"
                href="#"
              >
                All Categories
              </Link>
            </li>
            <li className="w-full md:w-auto px-2">
              <Link
                className="inline-block w-full py-2 px-4 mb-4 md:mb-0 text-sm text-rich_black hover:text-ash_gray-500 hover:bg-ash_gray-200 font-bold rounded-md hover:shadow-sm"
                href="#"
              >
                Technology
              </Link>
            </li>
            <li className="w-full md:w-auto px-2">
              <Link
                className="inline-block w-full py-2 px-4 mb-4 md:mb-0 text-sm text-rich_black hover:text-ash_gray-500 hover:bg-ash_gray-200 font-bold rounded-md hover:shadow-sm"
                href="#"
              >
                Development
              </Link>
            </li>
            <li className="w-full md:w-auto px-2">
              <Link
                className="inline-block w-full py-2 px-4 mb-4 md:mb-0 text-sm text-rich_black hover:text-ash_gray-500 hover:bg-ash_gray-200 font-bold rounded-md hover:shadow-sm"
                href="#"
              >
                Marketing
              </Link>
            </li>
            <li className="w-full md:w-auto px-2">
              <Link
                className="inline-block w-full py-2 px-4 text-sm text-rich_black hover:text-ash_gray-500 hover:bg-ash_gray-200 font-bold rounded-md hover:shadow-sm"
                href="#"
              >
                Start-up
              </Link>
            </li>
          </ul>
          <div className="flex flex-wrap -mx-4 mb-12 md:mb-20">
            <div className="w-full md:w-1/2 px-4 mb-8">
              <Link className="block mb-6 overflow-hidden rounded-md" href="#">
                <Image
                  className="w-full"
                  src="/flex-ui-assets/images/blog/effect.jpg"
                  alt="Blog post image"
                  width={500}
                  height={300}
                />
              </Link>
              <div className="mb-4">
                <Link
                  className="inline-block py-1 px-3 text-xs leading-5 text-white hover:text-ash_gray-600 font-medium uppercase bg-ash_gray-100 hover:bg-ash_gray-200 rounded-full shadow-sm"
                  href="#"
                >
                  Technology
                </Link>
              </div>
              <p className="mb-2 text-rich_black font-medium">
                John Doe • 19 Jan 2022
              </p>
              <Link
                className="inline-block mb-4 text-2xl leading-tight text-rich_black hover:text-rich_black font-bold hover:underline"
                href="#"
              >
                A small business is only as good as its tools and it is totally
                true.
              </Link>
              <p className="mb-4 text-base md:text-lg text-rich_black font-light">
                We've all experienced the chaos of multiple spreadsheets,
                tracking and insight tools, and scrambling for the right data at
                the right time.
              </p>
              <Link
                className="inline-flex items-center text-base md:text-lg text-ash_gray-500 hover:text-ash_gray-600 font-semibold"
                href="#"
              >
                <span className="mr-3">Read Post</span>
                <svg
                  width={8}
                  height={10}
                  viewBox="0 0 8 10"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M7.94667 4.74665C7.91494 4.66481 7.86736 4.59005 7.80666 4.52665L4.47333 1.19331C4.41117 1.13116 4.33738 1.08185 4.25617 1.04821C4.17495 1.01457 4.08791 0.997253 4 0.997253C3.82246 0.997253 3.6522 1.06778 3.52667 1.19331C3.46451 1.25547 3.4152 1.32927 3.38156 1.41048C3.34792 1.4917 3.33061 1.57874 3.33061 1.66665C3.33061 1.84418 3.40113 2.01445 3.52667 2.13998L5.72667 4.33331H0.666667C0.489856 4.33331 0.320286 4.40355 0.195262 4.52858C0.070238 4.6536 0 4.82317 0 4.99998C0 5.17679 0.070238 5.34636 0.195262 5.47138C0.320286 5.59641 0.489856 5.66665 0.666667 5.66665H5.72667L3.52667 7.85998C3.46418 7.92196 3.41458 7.99569 3.38074 8.07693C3.34689 8.15817 3.32947 8.24531 3.32947 8.33331C3.32947 8.42132 3.34689 8.50846 3.38074 8.5897C3.41458 8.67094 3.46418 8.74467 3.52667 8.80665C3.58864 8.86913 3.66238 8.91873 3.74361 8.95257C3.82485 8.98642 3.91199 9.00385 4 9.00385C4.08801 9.00385 4.17514 8.98642 4.25638 8.95257C4.33762 8.91873 4.41136 8.86913 4.47333 8.80665L7.80666 5.47331C7.86736 5.40991 7.91494 5.33515 7.94667 5.25331C8.01334 5.09101 8.01334 4.90895 7.94667 4.74665Z"
                    fill="currentColor"
                  />
                </svg>
              </Link>
            </div>
            <div className="w-full md:w-1/2 px-4 mb-8">
              <Link className="block mb-6 overflow-hidden rounded-md" href="#">
                <Image
                  className="w-full"
                  src="/flex-ui-assets/images/blog/work.jpg"
                  alt="Blog post image"
                  width={500}
                  height={300}
                />
              </Link>
              <div className="mb-4">
                <Link
                  className="inline-block py-1 px-3 text-xs leading-5 text-white hover:text-ash_gray-600 font-medium uppercase bg-ash_gray-100 hover:bg-ash_gray-200 rounded-full shadow-sm"
                  href="#"
                >
                  Development
                </Link>
              </div>
              <p className="mb-2 text-rich_black font-medium">
                John Doe • 19 Jan 2022
              </p>
              <Link
                className="inline-block mb-4 text-2xl leading-tight text-rich_black hover:text-rich_black font-bold hover:underline"
                href="#"
              >
                A small business is only as good as its tools and it is totally
                true.
              </Link>
              <p className="mb-4 text-base md:text-lg text-rich_black font-light">
                We've all experienced the chaos of multiple spreadsheets,
                tracking and insight tools, and scrambling for the right data at
                the right time.
              </p>
              <Link
                className="inline-flex items-center text-base md:text-lg text-ash_gray-500 hover:text-ash_gray-600 font-semibold"
                href="#"
              >
                <span className="mr-3">Read Post</span>
                <svg
                  width={8}
                  height={10}
                  viewBox="0 0 8 10"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M7.94667 4.74665C7.91494 4.66481 7.86736 4.59005 7.80666 4.52665L4.47333 1.19331C4.41117 1.13116 4.33738 1.08185 4.25617 1.04821C4.17495 1.01457 4.08791 0.997253 4 0.997253C3.82246 0.997253 3.6522 1.06778 3.52667 1.19331C3.46451 1.25547 3.4152 1.32927 3.38156 1.41048C3.34792 1.4917 3.33061 1.57874 3.33061 1.66665C3.33061 1.84418 3.40113 2.01445 3.52667 2.13998L5.72667 4.33331H0.666667C0.489856 4.33331 0.320286 4.40355 0.195262 4.52858C0.070238 4.6536 0 4.82317 0 4.99998C0 5.17679 0.070238 5.34636 0.195262 5.47138C0.320286 5.59641 0.489856 5.66665 0.666667 5.66665H5.72667L3.52667 7.85998C3.46418 7.92196 3.41458 7.99569 3.38074 8.07693C3.34689 8.15817 3.32947 8.24531 3.32947 8.33331C3.32947 8.42132 3.34689 8.50846 3.38074 8.5897C3.41458 8.67094 3.46418 8.74467 3.52667 8.80665C3.58864 8.86913 3.66238 8.91873 3.74361 8.95257C3.82485 8.98642 3.91199 9.00385 4 9.00385C4.08801 9.00385 4.17514 8.98642 4.25638 8.95257C4.33762 8.91873 4.41136 8.86913 4.47333 8.80665L7.80666 5.47331C7.86736 5.40991 7.91494 5.33515 7.94667 5.25331C8.01334 5.09101 8.01334 4.90895 7.94667 4.74665Z"
                    fill="currentColor"
                  />
                </svg>
              </Link>
            </div>
            <div className="w-full md:w-1/2 px-4 mb-8">
              <Link className="block mb-6 overflow-hidden rounded-md" href="#">
                <Image
                  className="w-full"
                  src="/flex-ui-assets/images/blog/work2.jpg"
                  alt="Blog post image"
                  width={500}
                  height={300}
                />
              </Link>
              <div className="mb-4">
                <Link
                  className="inline-block py-1 px-3 text-xs leading-5 text-white hover:text-ash_gray-600 font-medium uppercase bg-ash_gray-100 hover:bg-ash_gray-200 rounded-full shadow-sm"
                  href="#"
                >
                  Marketing
                </Link>
              </div>
              <p className="mb-2 text-rich_black font-medium">
                John Doe • 19 Jan 2022
              </p>
              <Link
                className="inline-block mb-4 text-2xl leading-tight text-rich_black hover:text-rich_black font-bold hover:underline"
                href="#"
              >
                A small business is only as good as its tools and it is totally
                true.
              </Link>
              <p className="mb-4 text-base md:text-lg text-rich_black font-light">
                We've all experienced the chaos of multiple spreadsheets,
                tracking and insight tools, and scrambling for the right data at
                the right time.
              </p>
              <Link
                className="inline-flex items-center text-base md:text-lg text-ash_gray-500 hover:text-ash_gray-600 font-semibold"
                href="#"
              >
                <span className="mr-3">Read Post</span>
                <svg
                  width={8}
                  height={10}
                  viewBox="0 0 8 10"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M7.94667 4.74665C7.91494 4.66481 7.86736 4.59005 7.80666 4.52665L4.47333 1.19331C4.41117 1.13116 4.33738 1.08185 4.25617 1.04821C4.17495 1.01457 4.08791 0.997253 4 0.997253C3.82246 0.997253 3.6522 1.06778 3.52667 1.19331C3.46451 1.25547 3.4152 1.32927 3.38156 1.41048C3.34792 1.4917 3.33061 1.57874 3.33061 1.66665C3.33061 1.84418 3.40113 2.01445 3.52667 2.13998L5.72667 4.33331H0.666667C0.489856 4.33331 0.320286 4.40355 0.195262 4.52858C0.070238 4.6536 0 4.82317 0 4.99998C0 5.17679 0.070238 5.34636 0.195262 5.47138C0.320286 5.59641 0.489856 5.66665 0.666667 5.66665H5.72667L3.52667 7.85998C3.46418 7.92196 3.41458 7.99569 3.38074 8.07693C3.34689 8.15817 3.32947 8.24531 3.32947 8.33331C3.32947 8.42132 3.34689 8.50846 3.38074 8.5897C3.41458 8.67094 3.46418 8.74467 3.52667 8.80665C3.58864 8.86913 3.66238 8.91873 3.74361 8.95257C3.82485 8.98642 3.91199 9.00385 4 9.00385C4.08801 9.00385 4.17514 8.98642 4.25638 8.95257C4.33762 8.91873 4.41136 8.86913 4.47333 8.80665L7.80666 5.47331C7.86736 5.40991 7.91494 5.33515 7.94667 5.25331C8.01334 5.09101 8.01334 4.90895 7.94667 4.74665Z"
                    fill="currentColor"
                  />
                </svg>
              </Link>
            </div>
            <div className="w-full md:w-1/2 px-4 mb-8">
              <Link className="block mb-6 overflow-hidden rounded-md" href="#">
                <Image
                  className="w-full"
                  src="/flex-ui-assets/images/blog/effect2.jpg"
                  alt="Blog post image"
                  width={500}
                  height={300}
                />
              </Link>
              <div className="mb-4">
                <Link
                  className="inline-block py-1 px-3 text-xs leading-5 text-white hover:text-ash_gray-600 font-medium uppercase bg-ash_gray-100 hover:bg-ash_gray-200 rounded-full shadow-sm"
                  href="#"
                >
                  Start-up
                </Link>
              </div>
              <p className="mb-2 text-rich_black font-medium">
                John Doe • 19 Jan 2022
              </p>
              <Link
                className="inline-block mb-4 text-2xl leading-tight text-rich_black hover:text-rich_black font-bold hover:underline"
                href="#"
              >
                A small business is only as good as its tools and it is totally
                true.
              </Link>
              <p className="mb-4 text-base md:text-lg text-rich_black font-light">
                We've all experienced the chaos of multiple spreadsheets,
                tracking and insight tools, and scrambling for the right data at
                the right time.
              </p>
              <Link
                className="inline-flex items-center text-base md:text-lg text-ash_gray-500 hover:text-ash_gray-600 font-semibold"
                href="#"
              >
                <span className="mr-3">Read Post</span>
                <svg
                  width={8}
                  height={10}
                  viewBox="0 0 8 10"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M7.94667 4.74665C7.91494 4.66481 7.86736 4.59005 7.80666 4.52665L4.47333 1.19331C4.41117 1.13116 4.33738 1.08185 4.25617 1.04821C4.17495 1.01457 4.08791 0.997253 4 0.997253C3.82246 0.997253 3.6522 1.06778 3.52667 1.19331C3.46451 1.25547 3.4152 1.32927 3.38156 1.41048C3.34792 1.4917 3.33061 1.57874 3.33061 1.66665C3.33061 1.84418 3.40113 2.01445 3.52667 2.13998L5.72667 4.33331H0.666667C0.489856 4.33331 0.320286 4.40355 0.195262 4.52858C0.070238 4.6536 0 4.82317 0 4.99998C0 5.17679 0.070238 5.34636 0.195262 5.47138C0.320286 5.59641 0.489856 5.66665 0.666667 5.66665H5.72667L3.52667 7.85998C3.46418 7.92196 3.41458 7.99569 3.38074 8.07693C3.34689 8.15817 3.32947 8.24531 3.32947 8.33331C3.32947 8.42132 3.34689 8.50846 3.38074 8.5897C3.41458 8.67094 3.46418 8.74467 3.52667 8.80665C3.58864 8.86913 3.66238 8.91873 3.74361 8.95257C3.82485 8.98642 3.91199 9.00385 4 9.00385C4.08801 9.00385 4.17514 8.98642 4.25638 8.95257C4.33762 8.91873 4.41136 8.86913 4.47333 8.80665L7.80666 5.47331C7.86736 5.40991 7.91494 5.33515 7.94667 5.25331C8.01334 5.09101 8.01334 4.90895 7.94667 4.74665Z"
                    fill="currentColor"
                  />
                </svg>
              </Link>
            </div>
            <div className="w-full md:w-1/2 px-4 mb-8 md:mb-0">
              <Link className="block mb-6 overflow-hidden rounded-md" href="#">
                <Image
                  className="w-full"
                  src="/flex-ui-assets/images/blog/learn.jpg"
                  alt="Blog post image"
                  width={500}
                  height={300}
                />
              </Link>
              <div className="mb-4">
                <Link
                  className="inline-block py-1 px-3 text-xs leading-5 text-white hover:text-ash_gray-600 font-medium uppercase bg-ash_gray-100 hover:bg-ash_gray-200 rounded-full shadow-sm"
                  href="#"
                >
                  Article
                </Link>
              </div>
              <p className="mb-2 text-rich_black font-medium">
                John Doe • 19 Jan 2022
              </p>
              <Link
                className="inline-block mb-4 text-2xl leading-tight text-rich_black hover:text-rich_black font-bold hover:underline"
                href="#"
              >
                A small business is only as good as its tools and it is totally
                true.
              </Link>
              <p className="mb-4 text-base md:text-lg text-rich_black font-light">
                We've all experienced the chaos of multiple spreadsheets,
                tracking and insight tools, and scrambling for the right data at
                the right time.
              </p>
              <Link
                className="inline-flex items-center text-base md:text-lg text-ash_gray-500 hover:text-ash_gray-600 font-semibold"
                href="#"
              >
                <span className="mr-3">Read Post</span>
                <svg
                  width={8}
                  height={10}
                  viewBox="0 0 8 10"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M7.94667 4.74665C7.91494 4.66481 7.86736 4.59005 7.80666 4.52665L4.47333 1.19331C4.41117 1.13116 4.33738 1.08185 4.25617 1.04821C4.17495 1.01457 4.08791 0.997253 4 0.997253C3.82246 0.997253 3.6522 1.06778 3.52667 1.19331C3.46451 1.25547 3.4152 1.32927 3.38156 1.41048C3.34792 1.4917 3.33061 1.57874 3.33061 1.66665C3.33061 1.84418 3.40113 2.01445 3.52667 2.13998L5.72667 4.33331H0.666667C0.489856 4.33331 0.320286 4.40355 0.195262 4.52858C0.070238 4.6536 0 4.82317 0 4.99998C0 5.17679 0.070238 5.34636 0.195262 5.47138C0.320286 5.59641 0.489856 5.66665 0.666667 5.66665H5.72667L3.52667 7.85998C3.46418 7.92196 3.41458 7.99569 3.38074 8.07693C3.34689 8.15817 3.32947 8.24531 3.32947 8.33331C3.32947 8.42132 3.34689 8.50846 3.38074 8.5897C3.41458 8.67094 3.46418 8.74467 3.52667 8.80665C3.58864 8.86913 3.66238 8.91873 3.74361 8.95257C3.82485 8.98642 3.91199 9.00385 4 9.00385C4.08801 9.00385 4.17514 8.98642 4.25638 8.95257C4.33762 8.91873 4.41136 8.86913 4.47333 8.80665L7.80666 5.47331C7.86736 5.40991 7.91494 5.33515 7.94667 5.25331C8.01334 5.09101 8.01334 4.90895 7.94667 4.74665Z"
                    fill="currentColor"
                  />
                </svg>
              </Link>
            </div>
            <div className="w-full md:w-1/2 px-4">
              <Link className="block mb-6 overflow-hidden rounded-md" href="#">
                <Image
                  className="w-full"
                  src="/flex-ui-assets/images/blog/macbook.jpg"
                  alt="Blog post image"
                  width={500}
                  height={300}
                />
              </Link>
              <div className="mb-4">
                <Link
                  className="inline-block py-1 px-3 text-xs leading-5 text-white hover:text-ash_gray-600 font-medium uppercase bg-ash_gray-100 hover:bg-ash_gray-200 rounded-full shadow-sm"
                  href="#"
                >
                  Podcast
                </Link>
              </div>
              <p className="mb-2 text-rich_black font-medium">
                John Doe • 19 Jan 2022
              </p>
              <Link
                className="inline-block mb-4 text-2xl leading-tight text-rich_black hover:text-rich_black font-bold hover:underline"
                href="#"
              >
                A small business is only as good as its tools and it is totally
                true.
              </Link>
              <p className="mb-4 text-base md:text-lg text-rich_black font-light">
                We've all experienced the chaos of multiple spreadsheets,
                tracking and insight tools, and scrambling for the right data at
                the right time.
              </p>
              <Link
                className="inline-flex items-center text-base md:text-lg text-ash_gray-500 hover:text-ash_gray-600 font-semibold"
                href="#"
              >
                <span className="mr-3">Read Post</span>
                <svg
                  width={8}
                  height={10}
                  viewBox="0 0 8 10"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M7.94667 4.74665C7.91494 4.66481 7.86736 4.59005 7.80666 4.52665L4.47333 1.19331C4.41117 1.13116 4.33738 1.08185 4.25617 1.04821C4.17495 1.01457 4.08791 0.997253 4 0.997253C3.82246 0.997253 3.6522 1.06778 3.52667 1.19331C3.46451 1.25547 3.4152 1.32927 3.38156 1.41048C3.34792 1.4917 3.33061 1.57874 3.33061 1.66665C3.33061 1.84418 3.40113 2.01445 3.52667 2.13998L5.72667 4.33331H0.666667C0.489856 4.33331 0.320286 4.40355 0.195262 4.52858C0.070238 4.6536 0 4.82317 0 4.99998C0 5.17679 0.070238 5.34636 0.195262 5.47138C0.320286 5.59641 0.489856 5.66665 0.666667 5.66665H5.72667L3.52667 7.85998C3.46418 7.92196 3.41458 7.99569 3.38074 8.07693C3.34689 8.15817 3.32947 8.24531 3.32947 8.33331C3.32947 8.42132 3.34689 8.50846 3.38074 8.5897C3.41458 8.67094 3.46418 8.74467 3.52667 8.80665C3.58864 8.86913 3.66238 8.91873 3.74361 8.95257C3.82485 8.98642 3.91199 9.00385 4 9.00385C4.08801 9.00385 4.17514 8.98642 4.25638 8.95257C4.33762 8.91873 4.41136 8.86913 4.47333 8.80665L7.80666 5.47331C7.86736 5.40991 7.91494 5.33515 7.94667 5.25331C8.01334 5.09101 8.01334 4.90895 7.94667 4.74665Z"
                    fill="currentColor"
                  />
                </svg>
              </Link>
            </div>
          </div>
          <Link
            className="flex items-center justify-center py-2 px-4 mx-auto text-sm leading-5 text-ash_gray-50 font-medium bg-ash_gray-500 hover:bg-ash_gray-600 focus:ring-2 focus:ring-ash_gray-500 focus:ring-opacity-50 md:max-w-max rounded-md"
            href="#"
          >
            <span className="mr-3">View more</span>
            <svg
              className="text-ash_gray-50"
              width={12}
              height={10}
              viewBox="0 0 12 10"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M10.7583 4.40833C10.6809 4.33023 10.5887 4.26823 10.4871 4.22592C10.3856 4.18362 10.2767 4.16183 10.1667 4.16183C10.0567 4.16183 9.94773 4.18362 9.84619 4.22592C9.74464 4.26823 9.65247 4.33023 9.575 4.40833L6.83333 7.15833V0.833333C6.83333 0.61232 6.74554 0.400358 6.58926 0.244078C6.43297 0.0877975 6.22101 0 6 0C5.77899 0 5.56702 0.0877975 5.41074 0.244078C5.25446 0.400358 5.16667 0.61232 5.16667 0.833333V7.15833L2.425 4.40833C2.26808 4.25141 2.05525 4.16326 1.83333 4.16326C1.61141 4.16326 1.39859 4.25141 1.24167 4.40833C1.08475 4.56525 0.99659 4.77808 0.99659 5C0.99659 5.22192 1.08475 5.43475 1.24167 5.59167L5.40833 9.75833C5.48759 9.8342 5.58104 9.89367 5.68333 9.93333C5.78308 9.97742 5.89094 10.0002 6 10.0002C6.10906 10.0002 6.21692 9.97742 6.31667 9.93333C6.41896 9.89367 6.51241 9.8342 6.59167 9.75833L10.7583 5.59167C10.8364 5.5142 10.8984 5.42203 10.9407 5.32048C10.9831 5.21893 11.0048 5.11001 11.0048 5C11.0048 4.88999 10.9831 4.78107 10.9407 4.67952C10.8984 4.57797 10.8364 4.4858 10.7583 4.40833Z"
                fill="currentColor"
              />
            </svg>
          </Link>
        </div>
      </section>
    </>
  );
}
