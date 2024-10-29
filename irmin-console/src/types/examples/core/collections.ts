import { getRandomDateTimeString } from '@/utils/getRandomDateTimeString';

import { Collection, RepositorySchema } from '@/types/core/Collection';
import { FileCollectionData, FileSchema } from '@/types/core/FileCollection';
import {
  FolderCollectionData,
  FolderSchema,
} from '@/types/core/FolderCollection';
import { TableCollectionData, TableSchema } from '@/types/core/TableCollection';

/**
 * Get example Repository Collections
 *
 * Array of {@link Collection}
 */
export const collections = (): Collection[] => [
  {
    name: 'sales',
    repository: 'excel-kpis',
    type: 'table',
    is_immutable: true,
    last_modified: getRandomDateTimeString(60, 'past', 1),
    size: 1024,
  },
  {
    name: 'expenses',
    repository: 'excel-kpis',
    type: 'table',
    is_immutable: true,
    last_modified: getRandomDateTimeString(60, 'past', 1),
    size: 2048,
  },
  {
    name: 'profit_by_month',
    repository: 'excel-kpis',
    type: 'table',
    is_immutable: true,
    last_modified: getRandomDateTimeString(60, 'past', 1),
    size: 4096,
  },
  {
    name: 'sessions',
    repository: 'main-google-analytics',
    type: 'table',
    workflow: '0',
    is_immutable: true,
    last_modified: getRandomDateTimeString(60, 'past', 1),
    size: 8192,
  },
  {
    name: 'users',
    repository: 'main-google-analytics',
    type: 'table',
    workflow: '0',
    is_immutable: true,
    last_modified: getRandomDateTimeString(60, 'past', 1),
    size: 16384,
  },
  {
    name: 'pageviews',
    repository: 'main-google-analytics',
    type: 'table',
    workflow: '0',
    is_immutable: true,
    last_modified: getRandomDateTimeString(60, 'past', 1),
    size: 32768,
  },
  {
    name: 'events',
    repository: 'main-google-analytics',
    type: 'table',
    workflow: '0',
    is_immutable: true,
    last_modified: getRandomDateTimeString(60, 'past', 1),
    size: 65536,
  },
  {
    name: 'users',
    repository: 'app-data',
    type: 'table',
    workflow: '2',
    is_immutable: true,
    last_modified: getRandomDateTimeString(60, 'past', 1),
    size: 131072,
  },
  {
    name: 'downloads',
    repository: 'app-data',
    type: 'table',
    workflow: '2',
    is_immutable: true,
    last_modified: getRandomDateTimeString(60, 'past', 1),
    size: 262144,
  },
  {
    name: 'sessions',
    repository: 'app-data',
    type: 'table',
    workflow: '2',
    is_immutable: true,
    last_modified: getRandomDateTimeString(60, 'past', 1),
    size: 524288,
  },
  {
    name: 'purchase_events',
    repository: 'app-data',
    type: 'table',
    workflow: '2',
    is_immutable: true,
    last_modified: getRandomDateTimeString(60, 'past', 1),
    size: 1048576,
  },
  {
    name: 'ad_clicks',
    repository: 'app-data',
    type: 'table',
    workflow: '2',
    is_immutable: true,
    last_modified: getRandomDateTimeString(60, 'past', 1),
    size: 2097152,
  },
  {
    name: 'ad_impressions',
    repository: 'app-data',
    type: 'table',
    workflow: '2',
    is_immutable: true,
    last_modified: getRandomDateTimeString(60, 'past', 1),
    size: 4194304,
  },
  {
    name: 'sales',
    repository: 'kpis-from-excel',
    type: 'table',
    workflow: '4',
    is_immutable: true,
    last_modified: getRandomDateTimeString(60, 'past', 1),
    size: 8388608,
  },
  {
    name: 'expenses',
    repository: 'kpis-from-excel',
    type: 'table',
    workflow: '4',
    is_immutable: true,
    last_modified: getRandomDateTimeString(60, 'past', 1),
    size: 16777216,
  },
  {
    name: 'profit_by_month',
    repository: 'kpis-from-excel',
    type: 'table',
    workflow: '4',
    is_immutable: true,
    last_modified: getRandomDateTimeString(60, 'past', 1),
    size: 33554432,
  },
  {
    name: 'inventory',
    repository: 'management-data-from-excel',
    type: 'table',
    is_immutable: false,
    last_modified: getRandomDateTimeString(60, 'past', 1),
    size: 67108864,
  },
  {
    name: 'employees',
    repository: 'management-data-from-excel',
    type: 'table',
    is_immutable: false,
    last_modified: getRandomDateTimeString(60, 'past', 1),
    size: 134217728,
  },
  {
    name: 'sales',
    repository: 'google-sheets-kpis',
    type: 'table',
    is_immutable: false,
    last_modified: getRandomDateTimeString(60, 'past', 1),
    size: 268435456,
  },
  {
    name: 'inventory',
    repository: 'google-sheets-kpis',
    type: 'table',
    is_immutable: false,
    last_modified: getRandomDateTimeString(60, 'past', 1),
    size: 536870912,
  },
  {
    name: 'expenses',
    repository: 'google-sheets-kpis',
    type: 'table',
    is_immutable: false,
    last_modified: getRandomDateTimeString(60, 'past', 1),
    size: 1073741824,
  },
  {
    name: 'profit_by_month',
    repository: 'google-sheets-kpis',
    type: 'table',
    is_immutable: false,
    last_modified: getRandomDateTimeString(60, 'past', 1),
    size: 2147483648,
  },
  {
    name: 'employees',
    repository: 'google-sheets-kpis',
    type: 'table',
    is_immutable: false,
    last_modified: getRandomDateTimeString(60, 'past', 1),
    size: 4294967296,
  },
  {
    name: 'top-100-ad-clicking-users',
    repository: 'top-100-ad-clicking-users',
    type: 'table',
    is_immutable: false,
    last_modified: getRandomDateTimeString(60, 'past', 1),
    size: 8589934592,
  },
  {
    name: 'profile-images',
    repository: 'app-data',
    type: 'folder',
    workflow: '2',
    is_immutable: true,
    last_modified: getRandomDateTimeString(60, 'past', 1),
  },
  {
    name: 'app-docker-file',
    repository: 'app-data',
    type: 'file',
    is_immutable: false,
    last_modified: getRandomDateTimeString(60, 'past', 1),
    size: 17179869184,
  },
];

/**
 * Get example {@link TableSchema} object
 */
const tableSchema = (): TableSchema => ({
  type: 'table',
  columns: [
    {
      name: 'name',
      type: 'string',
    },
    {
      name: 'age',
      type: 'int',
    },
    {
      name: 'city',
      type: 'string',
    },
    {
      name: 'country',
      type: 'string',
    },
    {
      name: 'email',
      type: 'string',
    },
    {
      name: 'jobTitle',
      type: 'string',
    },
    {
      name: 'company',
      type: 'string',
    },
    {
      name: 'isActive',
      type: 'boolean',
    },
    {
      name: 'created_at',
      type: 'timestamp',
    },
  ],
});

/**
 * Get example {@link TableCollectionData} object
 */
export const tableCollectionData = (): TableCollectionData => ({
  type: 'table',
  rows: [
    {
      name: 'John Doe',
      age: 25,
      city: 'New York',
      country: 'USA',
      email: 'john@example.com',
      jobTitle: 'Software Engineer',
      company: 'TechCorp',
      isActive: true,
      created_at: '2021-10-01T12:00:00Z',
    },
    {
      name: 'Jane Doe',
      age: 26,
      city: 'Toronto',
      country: 'Canada',
      email: 'jane@example.com',
      jobTitle: 'Product Manager',
      company: 'Innovatech',
      isActive: false,
      created_at: '2021-10-01T12:00:00Z',
    },
    {
      name: 'John Smith',
      age: 30,
      city: 'London',
      country: 'UK',
      email: 'johnsmith@example.com',
      jobTitle: 'Data Analyst',
      company: 'DataSolve',
      isActive: true,
      created_at: '2021-10-01T12:00:00Z',
    },
    {
      name: 'Jane Smith',
      age: 22,
      city: 'Paris',
      country: 'France',
      email: 'janesmith@example.com',
      jobTitle: 'Graphic Designer',
      company: 'DesignHub',
      isActive: false,
      created_at: '2021-10-01T12:00:00Z',
    },
    {
      name: 'John Johnson',
      age: 28,
      city: 'Berlin',
      country: 'Germany',
      email: 'johnjohnson@example.com',
      jobTitle: 'DevOps Engineer',
      company: 'CloudBase',
      isActive: true,
      created_at: '2021-10-01T12:00:00Z',
    },
    {
      name: 'Jane Johnson',
      age: 29,
      city: 'Tokyo',
      country: 'Japan',
      email: 'janejohnson@example.com',
      jobTitle: 'UX Researcher',
      company: 'UserFirst',
      isActive: false,
      created_at: '2021-10-01T12:00:00Z',
    },
    {
      name: 'John Williams',
      age: 27,
      city: 'Sydney',
      country: 'Australia',
      email: 'johnwilliams@example.com',
      jobTitle: 'Accountant',
      company: 'FinancePro',
      isActive: true,
      created_at: '2021-10-01T12:00:00Z',
    },
    {
      name: 'Jane Williams',
      age: 24,
      city: 'Cape Town',
      country: 'South Africa',
      email: 'janewilliams@example.com',
      jobTitle: 'Marketing Specialist',
      company: 'BrandMakers',
      isActive: false,
      created_at: '2021-10-01T12:00:00Z',
    },
    {
      name: 'John Brown',
      age: 23,
      city: 'Rio de Janeiro',
      country: 'Brazil',
      email: 'johnbrown@example.com',
      jobTitle: 'Sales Manager',
      company: 'SalesForce',
      isActive: true,
      created_at: '2021-10-01T12:00:00Z',
    },
    {
      name: 'Jane Brown',
      age: 31,
      city: 'Kyiv',
      country: 'Ukraine',
      email: 'janebrown@example.com',
      jobTitle: 'HR Coordinator',
      company: 'PeopleOps',
      isActive: false,
      created_at: '2021-10-01T12:00:00Z',
    },
    {
      name: 'John Davis',
      age: 33,
      city: 'Beijing',
      country: 'China',
      email: 'johndavis@example.com',
      jobTitle: 'Business Analyst',
      company: 'BizInsights',
      isActive: true,
      created_at: '2021-10-01T12:00:00Z',
    },
    {
      name: 'Jane Davis',
      age: 32,
      city: 'New Delhi',
      country: 'India',
      email: 'janedavis@example.com',
      jobTitle: 'Consultant',
      company: 'AdvisoryCo',
      isActive: false,
      created_at: '2021-10-01T12:00:00Z',
    },
    {
      name: 'John Miller',
      age: 34,
      city: 'Seoul',
      country: 'South Korea',
      email: 'johnmiller@example.com',
      jobTitle: 'Project Manager',
      company: 'PM Solutions',
      isActive: true,
      created_at: '2021-10-01T12:00:00Z',
    },
    {
      name: 'Jane Miller',
      age: 35,
      city: 'Cairo',
      country: 'Egypt',
      email: 'janemiller@example.com',
      jobTitle: 'Architect',
      company: 'UrbanBuild',
      isActive: false,
      created_at: '2021-10-01T12:00:00Z',
    },
    {
      name: 'John Wilson',
      age: 36,
      city: 'Cape Town',
      country: 'South Africa',
      email: 'johnwilson@example.com',
      jobTitle: 'Research Scientist',
      company: 'LabWorks',
      isActive: true,
      created_at: '2021-10-01T12:00:00Z',
    },
    {
      name: 'Jane Wilson',
      age: 37,
      city: 'Lagos',
      country: 'Nigeria',
      email: 'janewilson@example.com',
      jobTitle: 'Financial Analyst',
      company: 'FinAdvisors',
      isActive: false,
      created_at: '2021-10-01T12:00:00Z',
    },
    {
      name: 'John Moore',
      age: 38,
      city: 'Mexico City',
      country: 'Mexico',
      email: 'johnmoore@example.com',
      jobTitle: 'Operations Manager',
      company: 'GlobalOps',
      isActive: true,
      created_at: '2021-10-01T12:00:00Z',
    },
    {
      name: 'Jane Moore',
      age: 39,
      city: 'Buenos Aires',
      country: 'Argentina',
      email: 'janemoore@example.com',
      jobTitle: 'Content Strategist',
      company: 'MediaHouse',
      isActive: false,
      created_at: '2021-10-01T12:00:00Z',
    },
    {
      name: 'John Taylor',
      age: 40,
      city: 'Santiago',
      country: 'Chile',
      email: 'johntaylor@example.com',
      jobTitle: 'Engineer',
      company: 'BuildTech',
      isActive: true,
      created_at: '2021-10-01T12:00:00Z',
    },
    {
      name: 'Jane Taylor',
      age: 41,
      city: 'Helsinki',
      country: 'Finland',
      email: 'janetaylor@example.com',
      jobTitle: 'Legal Advisor',
      company: 'LawFirm',
      isActive: false,
      created_at: '2021-10-01T12:00:00Z',
    },
  ],
});

/**
 * Get exampe {@link FileSchema} object
 */
const fileSchema = (): FileSchema => ({
  type: 'file',
  name: 'example.png',
  size: 23910,
  created_at: '2021-10-01T12:00:00Z',
  modified_at: '2021-10-01T12:00:00Z',
  metadata: {
    dimensions: '1920x1080',
  },
});

/**
 * Get example {@link FileCollectionData} object
 */
export const fileCollectionData = (): FileCollectionData => {
  const schema = fileSchema();
  return {
    ...schema,
    content:
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAEACAIAAADTED8xAAADMElEQVR4nOzVwQnAIBQFQYXff81RUkQCOyDj1YOPnbXWPmeTRef+/3O/OyBjzh3CD95BfqICMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMO0TAAD//2Anhf4QtqobAAAAAElFTkSuQmCC',
  };
};

/**
 * Get example {@link FolderSchema} object
 */
const folderSchema = (): FolderSchema => ({
  type: 'folder',
  items: [
    {
      type: 'file',
      file: fileSchema(),
    },
    {
      type: 'folder',
      name: 'subfolder',
      created_at: '2021-10-01T12:00:00Z',
      modified_at: '2021-10-01T12:00:00Z',
      children: {
        type: 'folder',
        items: [
          {
            type: 'file',
            file: fileSchema(),
          },
        ],
      },
    },
  ],
});

/**
 * Get example {@link FolderCollectionData} object
 */
export const folderCollectionData = (): FolderCollectionData => {
  const schema = folderSchema();
  return {
    ...schema,
    name: 'example-folder',
    items: folderSchema().items.map((item) => {
      if (item.type === 'file') {
        return {
          ...item,
          content: fileCollectionData().content,
        };
      }
      return item;
    }),
  };
};

/**
 * Get example {@link RepositorySchema} object
 */
export const repositorySchema = (): RepositorySchema => [
  ...collections().map((collection) => ({
    ...collection,
    schema:
      collection.type === 'table'
        ? tableSchema()
        : collection.type === 'file'
          ? fileSchema()
          : folderSchema(),
  })),
];

/**
 * Get example collection data
 *
 * @param type - (optional) Type of collection data to return
 */
export const collectionData = (type?: 'table' | 'file' | 'folder') => {
  if (type === 'table') return tableCollectionData();
  if (type === 'file') return fileCollectionData();
  if (type === 'folder') return folderCollectionData();
  return tableCollectionData();
};
