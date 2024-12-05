import { getRandomDateTimeString } from '@/utils/getRandomDateTimeString';

import { ObjectSchema } from '@/types/core/ObjectSchema';

export const objectSchema = (): ObjectSchema => ({
  name: 'root',
  path: '/',
  description: 'Root directory of the repository containing all objects',
  type: 'group',
  children: [
    {
      name: 'photos',
      path: '/photos',
      type: 'group',
      last_modified: getRandomDateTimeString(60, 'past', 1),
      description: 'Folder containing photo files',
      children: [
        {
          name: 'photo-123.jpg',
          path: '/photos/photo-123.jpg',
          type: 'binary',
          content_type: 'image/jpeg',
          last_modified: getRandomDateTimeString(60, 'past', 1),
          size: 2048,
          description: 'Photo 123',
        },
        {
          name: 'photo-456.jpg',
          path: '/photos/photo-456.jpg',
          type: 'binary',
          content_type: 'image/jpeg',
          last_modified: getRandomDateTimeString(60, 'past', 1),
          size: 2048,
          description: 'Photo 456',
        },
      ],
    },
    {
      name: 'docs',
      path: '/docs',
      type: 'group',
      last_modified: getRandomDateTimeString(60, 'past', 1),
      description: 'Folder containing document files',
      children: [
        {
          name: 'document.pdf',
          path: '/docs/document.pdf',
          type: 'binary',
          content_type: 'application/pdf',
          last_modified: getRandomDateTimeString(60, 'past', 1),
          size: 10240,
          description: 'PDF document',
        },
      ],
    },
    {
      name: 'data.csv',
      path: '/data.csv',
      type: 'structured',
      content_type: 'text/csv',
      last_modified: getRandomDateTimeString(60, 'past', 1),
      size: 4096,
      schema: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Identifier for the data row' },
            value: { type: 'number', description: 'Value for the row' },
          },
          required: ['id', 'value'],
        },
      },
      description: 'CSV dataset',
    },
    {
      name: 'product-info.json',
      path: '/product-info.json',
      type: 'structured',
      content_type: 'application/json',
      last_modified: getRandomDateTimeString(60, 'past', 1),
      size: 5120,
      schema: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Product ID' },
          name: { type: 'string', description: 'Product name' },
          price: { type: 'number', description: 'Product price' },
        },
        required: ['id', 'name', 'price'],
        additionalProperties: false,
      },
      description: 'Product information in JSON format',
    },
    {
      name: 'data.parquet',
      path: '/data.parquet',
      type: 'structured',
      content_type: 'application/vnd.apache.parquet',
      last_modified: getRandomDateTimeString(60, 'past', 1),
      size: 8192,
      schema: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            field1: { type: 'string', description: 'Field 1 data' },
            field2: { type: 'number', description: 'Field 2 data' },
          },
        },
      },
      description: 'Parquet dataset',
    },
    {
      name: 'example.txt',
      path: '/example.txt',
      type: 'binary',
      content_type: 'text/plain',
      last_modified: getRandomDateTimeString(60, 'past', 1),
      size: 1024,
      description: 'Example text file',
    },
  ],
});

export const tableObjectSchema = (): ObjectSchema => ({
  name: 'users',
  path: '/users',
  type: 'structured',
  content_type: 'application/json',
  last_modified: getRandomDateTimeString(60, 'past', 1),
  size: 10240,
  schema: {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        userId: {
          type: 'string',
          description: 'Unique identifier for the user',
        },
        username: { type: 'string', description: 'Username of the user' },
        email: { type: 'string', description: 'Email address of the user' },
        created_at: {
          type: 'string',
          format: 'date-time',
          description: 'Account creation date',
        },
      },
      required: ['userId', 'username', 'email', 'created_at'],
    },
  },
  description: 'Table containing user information',
});
