import React from 'react';
import Link from 'next/link';

const PrivacyPolicy: React.FC = () => {
  return (
    <div className='min-h-screen bg-gray-100 p-6'>
      <div className='mx-auto max-w-4xl rounded-lg bg-white p-8 shadow-md'>
        <h1 className='mb-6 text-3xl font-bold'>Privacy Policy</h1>
        <p className='mb-4'>
          At Irmin, we are committed to protecting your privacy and ensuring
          that your personal information is handled in a safe and responsible
          manner. This Privacy Policy outlines how we collect, use, and protect
          your information when you use our AI-powered ETL platform and
          integrated data marketplace.
        </p>
        <h2 className='mb-4 text-2xl font-semibold'>Information Collection</h2>
        <p className='mb-4'>
          We collect personal information that you provide to us when you create
          an account, upload data, or interact with our platform. This
          information may include your name, email address, company name, and
          any data you upload to the ETL.
        </p>
        <h2 className='mb-4 text-2xl font-semibold'>Use of Information</h2>
        <p className='mb-4'>
          The information we collect is used to provide and improve our
          services. Specifically, we use your information to:
        </p>
        <ul className='mb-4 list-inside list-disc'>
          <li>Operate and maintain our platform</li>
          <li>Personalize your experience</li>
          <li>Provide customer support</li>
          <li>Send updates and promotional materials</li>
          <li>Analyze usage and improve our services</li>
        </ul>
        <h2 className='mb-4 text-2xl font-semibold'>Data Privacy</h2>
        <p className='mb-4'>
          Irmin will never share the data you upload to the ETL with third
          parties without explicit acceptance from the workspace owner. Your
          data is your property, and we respect your privacy and
          confidentiality.
        </p>
        <h2 className='mb-4 text-2xl font-semibold'>External Tools</h2>
        <p className='mb-4'>
          Irmin uses external tools to collect usage data, perform analytics,
          and improve our services. These tools may collect information about
          your interactions with our platform, including pages visited, features
          used, and other usage data. This information helps us understand how
          our platform is used and identify areas for improvement.
        </p>
        <h2 className='mb-4 text-2xl font-semibold'>Data Security</h2>
        <p className='mb-4'>
          We implement a variety of security measures to ensure the safety of
          your personal information. Your data is stored in secure environments
          and protected against unauthorized access, alteration, disclosure, or
          destruction.
        </p>
        <h2 className='mb-4 text-2xl font-semibold'>Your Rights</h2>
        <p className='mb-4'>
          You have the right to access, correct, or delete your personal
          information at any time. If you wish to exercise these rights or have
          any questions about our Privacy Policy, please contact us at [Your
          Contact Information].
        </p>
        <h2 className='mb-4 text-2xl font-semibold'>Changes to this Policy</h2>
        <p className='mb-4'>
          Irmin reserves the right to update this Privacy Policy at any time. We
          will notify you of any changes by posting the new Privacy Policy on
          our website. You are advised to review this Privacy Policy
          periodically for any changes.
        </p>
        <p className='mt-6'>
          <Link href='/' className='text-ash_gray hover:underline'>
            Back to Home
          </Link>
        </p>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
