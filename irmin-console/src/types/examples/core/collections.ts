import { Collection, RepositorySchema } from '@/types/api/Collection';
import {
  FileCollectionData,
  FileSchema,
} from '@/types/internal/FileCollection';
import {
  FolderCollectionData,
  FolderSchema,
} from '@/types/internal/FolderCollection';
import {
  StreamCollectionData,
  StreamSchema,
} from '@/types/internal/StreamCollection';
import {
  TableCollectionData,
  TableSchema,
} from '@/types/internal/TableCollection';

/**
 * Get example Repository Collections
 *
 * Array of {@link Collection}
 */
export const collections = (): Collection[] => [
  {
    id: 0,
    name: 'sales',
    original_repository: 'excel-kpis',
    formatted_name: 'excel-kpis.sales',
    type: 'table',
  },
  {
    id: 1,
    name: 'expenses',
    original_repository: 'excel-kpis',
    formatted_name: 'excel-kpis.expenses',
    type: 'table',
  },
  {
    id: 2,
    name: 'profit_by_month',
    original_repository: 'excel-kpis',
    formatted_name: 'excel-kpis.profit_by_month',
    type: 'table',
  },
  {
    id: 3,
    name: 'sessions',
    original_repository: 'main-google-analytics',
    formatted_name: 'main-google-analytics.sessions',
    type: 'table',
  },
  {
    id: 4,
    name: 'users',
    original_repository: 'main-google-analytics',
    formatted_name: 'main-google-analytics.users',
    type: 'table',
  },
  {
    id: 5,
    name: 'pageviews',
    original_repository: 'main-google-analytics',
    formatted_name: 'main-google-analytics.pageviews',
    type: 'table',
  },
  {
    id: 6,
    name: 'events',
    original_repository: 'main-google-analytics',
    formatted_name: 'main-google-analytics.events',
    type: 'table',
  },
  {
    id: 7,
    name: 'users',
    original_repository: 'app-data',
    formatted_name: 'app-data.users',
    type: 'table',
  },
  {
    id: 8,
    name: 'downloads',
    original_repository: 'app-data',
    formatted_name: 'app-data.downloads',
    type: 'table',
  },
  {
    id: 9,
    name: 'sessions',
    original_repository: 'app-data',
    formatted_name: 'app-data.sessions',
    type: 'table',
  },
  {
    id: 10,
    name: 'purchase_events',
    original_repository: 'app-data',
    formatted_name: 'app-data.purchase_events',
    type: 'table',
  },
  {
    id: 11,
    name: 'ad_clicks',
    original_repository: 'app-data',
    formatted_name: 'app-data.ad_clicks',
    type: 'table',
  },
  {
    id: 12,
    name: 'ad_impressions',
    original_repository: 'app-use-data',
    formatted_name: 'app-data.ad_impressions',
    type: 'table',
  },
  {
    id: 13,
    name: 'sales',
    original_repository: 'kpis-from-excel',
    formatted_name: 'kpis-from-excel.sales',
    type: 'table',
  },
  {
    id: 14,
    name: 'expenses',
    original_repository: 'kpis-from-excel',
    formatted_name: 'kpis-from-excel.expenses',
    type: 'table',
  },
  {
    id: 15,
    name: 'profit_by_month',
    original_repository: 'kpis-from-excel',
    formatted_name: 'kpis-from-excel.profit_by_month',
    type: 'table',
  },
  {
    id: 16,
    name: 'inventory',
    original_repository: 'management-data-from-excel',
    formatted_name: 'management-data-from-excel.inventory',
    type: 'table',
  },
  {
    id: 17,
    name: 'employees',
    original_repository: 'management-data-from-excel',
    formatted_name: 'management-data-from-excel.employees',
    type: 'table',
  },
  {
    id: 18,
    name: 'sales',
    original_repository: 'google-sheets-kpis',
    formatted_name: 'google-sheets-kpis.sales',
    type: 'table',
  },
  {
    id: 19,
    name: 'inventory',
    original_repository: 'google-sheets-kpis',
    formatted_name: 'google-sheets-kpis.inventory',
    type: 'table',
  },
  {
    id: 20,
    name: 'expenses',
    original_repository: 'google-sheets-kpis',
    formatted_name: 'google-sheets-kpis.expenses',
    type: 'table',
  },
  {
    id: 21,
    name: 'profit_by_month',
    original_repository: 'google-sheets-kpis',
    formatted_name: 'google-sheets-kpis.profit_by_month',
    type: 'table',
  },
  {
    id: 22,
    name: 'employees',
    original_repository: 'google-sheets-kpis',
    formatted_name: 'google-sheets-kpis.employees',
    type: 'table',
  },
  {
    id: 23,
    name: 'top-100-ad-clicking-users',
    original_repository: 'top-100-ad-clicking-users',
    formatted_name: 'top-100-ad-clicking-users.top-100-ad-clicking-users',
    type: 'table',
  },
  {
    id: 24,
    name: 'profile-images',
    original_repository: 'app-data',
    formatted_name: 'app-data.profile-images',
    type: 'folder',
  },
  {
    id: 25,
    name: 'audit-log',
    original_repository: 'app-data',
    formatted_name: 'app-data.audit-log',
    type: 'stream',
  },
  {
    id: 26,
    name: 'error-log',
    original_repository: 'app-data',
    formatted_name: 'app-data.error-log',
    type: 'stream',
  },
  {
    id: 27,
    name: 'app-docker-file',
    original_repository: 'app-data',
    formatted_name: 'app-data.app-docker-file',
    type: 'file',
  },
];

/**
 * Get example {@link TableSchema} object
 */
const tableSchema = (): TableSchema => ({
  type: 'table',
  columns: [
    {
      name: 'id',
      type: 'int',
    },
    {
      name: 'name',
      type: 'string',
    },
    {
      name: 'email',
      type: 'string',
    },
    {
      name: 'age',
      type: 'int',
    },
    {
      name: 'is_active',
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
      email: 'johndoe@example.com',
      jobTitle: 'Software Engineer',
      company: 'TechCorp',
      isActive: true,
    },
    {
      name: 'Jane Doe',
      age: 26,
      city: 'Toronto',
      country: 'Canada',
      email: 'janedoe@example.com',
      jobTitle: 'Product Manager',
      company: 'Innovatech',
      isActive: false,
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
    },
    {
      name: 'Jane Brown',
      age: 31,
      city: 'Moscow',
      country: 'Russia',
      email: 'janebrown@example.com',
      jobTitle: 'HR Coordinator',
      company: 'PeopleOps',
      isActive: false,
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
    },
  ],
});

/**
 * Get example {@link StreamSchema} object
 */
const streamSchema = (): StreamSchema => ({
  type: 'stream',
  fields: [
    {
      name: 'timestamp',
      type: 'timestamp',
    },
    {
      name: 'level',
      type: 'string',
    },
    {
      name: 'message',
      type: 'string',
    },
  ],
  isLive: true,
});

/**
 * Get example {@link StreamCollectionData} object
 */
export const streamCollectionData = (): StreamCollectionData => ({
  type: 'stream',
  entries: [
    {
      timestamp: '2021-10-01T12:00:00Z',
      level: 'info',
      message: 'This is an info message',
    },
    {
      timestamp: '2021-10-01T12:01:00Z',
      level: 'warning',
      message: 'This is a warning message',
    },
    {
      timestamp: '2021-10-01T12:02:00Z',
      level: 'error',
      message: 'This is an error message',
    },
    {
      timestamp: '2021-10-01T12:03:00Z',
      level: 'info',
      message: 'This is another info message',
    },
    {
      timestamp: '2021-10-01T12:04:00Z',
      level: 'warning',
      message: 'This is another warning message',
    },
    {
      timestamp: '2021-10-01T12:05:00Z',
      level: 'error',
      message: 'This is another error message',
    },
  ],
});

/**
 * Get exampe {@link FileSchema} object
 */
const fileSchema = (): FileSchema => ({
  type: 'file',
  name: 'example.jpg',
  size: 1024,
  extension: 'jpg',
  created_at: '2021-10-01T12:00:00Z',
  modified_at: '2021-10-01T12:00:00Z',
  metadata: {
    dimensions: '1920x1080',
  },
});

/**
 * Get example {@link FileCollectionData} object
 */
export const fileCollectionData = (): FileCollectionData => ({
  type: 'file',
  content: 'This is example content of a file',
});

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
export const folderCollectionData = (): FolderCollectionData => ({
  type: 'folder',
  items: folderSchema().items.map((item) => {
    if (item.type === 'file') {
      return {
        ...item,
        content: fileCollectionData().content,
      };
    }
    return item;
  }),
});

/**
 * Get example {@link RepositorySchema} object
 */
export const repositorySchema = (): RepositorySchema => [
  ...collections().map((collection) => ({
    ...collection,
    schema:
      collection.type === 'table'
        ? tableSchema()
        : collection.type === 'stream'
          ? streamSchema()
          : collection.type === 'file'
            ? fileSchema()
            : folderSchema(),
  })),
];
