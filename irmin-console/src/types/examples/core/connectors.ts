import { Connector } from '@/types/api/Connector';

/**
 * Get example connectors
 *
 * Array of {@link Connector}
 */
export const connectors: () => Connector[] = () => [
  {
    id: 0,
    name: 'PostgreSQL',
    logo: '/ui-assets/brands/example-logo.svg',
    description: 'Sync data to and from PostgreSQL databases',
  },
  {
    id: 1,
    name: 'MySQL',
    logo: '/ui-assets/brands/example-logo.svg',
    description: 'Sync data to and from MySQL databases',
  },
  {
    id: 2,
    name: 'MongoDB',
    logo: '/ui-assets/brands/example-logo.svg',
    description: 'Sync data to and from MongoDB databases',
  },
  {
    id: 3,
    name: 'Google Sheets',
    logo: '/ui-assets/brands/example-logo.svg',
    description: 'Sync data to and from Google Sheets',
  },
  {
    id: 4,
    name: 'Google Analytics',
    logo: '/ui-assets/brands/example-logo.svg',
    description: 'Sync data from Google Analytics',
  },
  {
    id: 5,
    name: 'Excel',
    logo: '/ui-assets/brands/example-logo.svg',
    description: 'Upload a local Excel file to Irmin',
  },
  {
    id: 6,
    name: 'Google Analytics',
    logo: '/ui-assets/brands/example-logo.svg',
    description: 'Sync data from Google Analytics',
  },
  {
    id: 7,
    name: 'Pipedrive',
    logo: '/ui-assets/brands/example-logo.svg',
    description: 'Sync data to and from Pipedrive CRM',
  },
  {
    id: 8,
    name: 'HubSpot',
    logo: '/ui-assets/brands/example-logo.svg',
    description: 'Sync data to and from HubSpot CRM',
  },
  {
    id: 9,
    name: 'Microsoft Dynamics',
    logo: '/ui-assets/brands/example-logo.svg',
    description: 'Sync data to and from Microsoft Dynamics CRM',
  },
  {
    id: 10,
    name: 'Salesforce',
    logo: '/ui-assets/brands/example-logo.svg',
    description: 'Sync data to and from Salesforce CRM',
  },
  {
    id: 11,
    name: 'Shopify',
    logo: '/ui-assets/brands/example-logo.svg',
    description: 'Sync data to and from Shopify',
  },
  {
    id: 12,
    name: 'Stripe',
    logo: '/ui-assets/brands/example-logo.svg',
    description: 'Sync data to and from Stripe',
  },
  {
    id: 13,
    name: 'Mailchimp',
    logo: '/ui-assets/brands/example-logo.svg',
    description: 'Sync data to and from Mailchimp',
  },
  {
    id: 14,
    name: 'SendGrid',
    logo: '/ui-assets/brands/example-logo.svg',
    description: 'Sync data to and from SendGrid',
  },
];
