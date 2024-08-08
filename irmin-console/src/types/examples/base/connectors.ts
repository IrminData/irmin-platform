import { Connector } from '@/types/api/Connector';

/**
 * Example connectors
 *
 * Array of {@link Connector}
 */
export const connectors: Connector[] = [
  {
    id: 0,
    name: 'PostgreSQL',
    logo: '/logo.svg',
    description: 'Sync data to and from PostgreSQL databases',
  },
  {
    id: 1,
    name: 'MySQL',
    logo: '/logo.svg',
    description: 'Sync data to and from MySQL databases',
  },
  {
    id: 2,
    name: 'MongoDB',
    logo: '/logo.svg',
    description: 'Sync data to and from MongoDB databases',
  },
  {
    id: 3,
    name: 'Google Sheets',
    logo: '/logo.svg',
    description: 'Sync data to and from Google Sheets',
  },
  {
    id: 4,
    name: 'Google Analytics',
    logo: '/logo.svg',
    description: 'Sync data from Google Analytics',
  },
  {
    id: 5,
    name: 'Excel',
    logo: '/logo.svg',
    description: 'Upload a local Excel file to Irmin',
  },
  {
    id: 6,
    name: 'Google Analytics',
    logo: '/logo.svg',
    description: 'Sync data from Google Analytics',
  },
  {
    id: 7,
    name: 'Pipedrive',
    logo: '/logo.svg',
    description: 'Sync data to and from Pipedrive CRM',
  },
  {
    id: 8,
    name: 'HubSpot',
    logo: '/logo.svg',
    description: 'Sync data to and from HubSpot CRM',
  },
  {
    id: 9,
    name: 'Microsoft Dynamics',
    logo: '/logo.svg',
    description: 'Sync data to and from Microsoft Dynamics CRM',
  },
  {
    id: 10,
    name: 'Salesforce',
    logo: '/logo.svg',
    description: 'Sync data to and from Salesforce CRM',
  },
  {
    id: 11,
    name: 'Shopify',
    logo: '/logo.svg',
    description: 'Sync data to and from Shopify',
  },
  {
    id: 12,
    name: 'Stripe',
    logo: '/logo.svg',
    description: 'Sync data to and from Stripe',
  },
  {
    id: 13,
    name: 'Mailchimp',
    logo: '/logo.svg',
    description: 'Sync data to and from Mailchimp',
  },
  {
    id: 14,
    name: 'SendGrid',
    logo: '/logo.svg',
    description: 'Sync data to and from SendGrid',
  },
];
