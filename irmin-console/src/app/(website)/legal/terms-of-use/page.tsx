import React from 'react';
import Link from 'next/link';

const TermsOfUse: React.FC = () => {
  return (
    <div className='min-h-screen bg-gray-100 p-6'>
      <div className='mx-auto max-w-4xl rounded-lg bg-white p-8 shadow-md'>
        <h1 className='mb-6 text-3xl font-bold'>Terms of Use</h1>
        <p className='mb-4'>
          Welcome to Irmin, an AI-powered ETL platform with an integrated data
          marketplace for analysts. If you continue to browse and use this
          website, you are agreeing to comply with and be bound by the following
          terms and conditions of use, which together with our privacy policy
          govern Irmin’s relationship with you in relation to this website and
          our services. If you disagree with any part of these terms and
          conditions, please do not use our website or services.
        </p>
        <h2 className='mb-4 text-2xl font-semibold'>
          Use of the Website and Services
        </h2>
        <p className='mb-4'>
          The content of the pages of this website and the services provided by
          Irmin are for your general information and use only. They are subject
          to change without notice. Unauthorized use of this website and our
          services may give rise to a claim for damages and/or be a criminal
          offense.
        </p>
        <h2 className='mb-4 text-2xl font-semibold'>
          Data Integration and Marketplace
        </h2>
        <p className='mb-4'>
          Irmin provides advanced ETL, SQL transformations, and an AI Assistant
          to streamline your data integration processes. Additionally, our rich
          data marketplace offers access to valuable data assets. By using these
          features, you agree to comply with all applicable laws and regulations
          regarding data privacy and security.
        </p>
        <h2 className='mb-4 text-2xl font-semibold'>License and Site Access</h2>
        <p className='mb-4'>
          Irmin grants you a limited license to access and make personal use of
          this site and our services, but not to download (other than page
          caching) or modify it, or any portion of it, except with express
          written consent of Irmin.
        </p>
        <h2 className='mb-4 text-2xl font-semibold'>User Account</h2>
        <p className='mb-4'>
          If you use this site, you are responsible for maintaining the
          confidentiality of your account and password and for restricting
          access to your computer, and you agree to accept responsibility for
          all activities that occur under your account or password. Irmin
          reserves the right to refuse service, terminate accounts, remove or
          edit content, or cancel orders at our sole discretion.
        </p>
        <h2 className='mb-4 text-2xl font-semibold'>Governing Law</h2>
        <p className='mb-4'>
          These terms of use and your use of this website and our services are
          governed by and construed in accordance with the laws of Finland. Any
          disputes relating to these terms of use shall be subject to the
          exclusive jurisdiction of the courts of Finland.
        </p>
        <h2 className='mb-4 text-2xl font-semibold'>Changes to Terms</h2>
        <p className='mb-4'>
          Irmin reserves the right to modify these terms at any time. You should
          check this page periodically for changes. Your continued use of the
          website and our services following the posting of changes to these
          terms will mean you accept those changes.
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

export default TermsOfUse;
