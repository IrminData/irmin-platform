import { DatatableSchema } from '@/types/internal/Datatable';

export const usersTableSchema: DatatableSchema = {
  table: 'users',
  columns: [
    { name: 'id', type: 'int', isPrimaryKey: true, isNullable: false },
    { name: 'username', type: 'string', isNullable: false, isUnique: true },
    { name: 'email', type: 'string', isNullable: false, isUnique: true },
    { name: 'password', type: 'string', isNullable: false },
    {
      name: 'created_at',
      type: 'timestamp',
      isNullable: false,
    },
    { name: 'updated_at', type: 'timestamp', isNullable: true },
    {
      name: 'role_id',
      type: 'int',
      isNullable: false,
      foreignKey: {
        referencedTable: 'roles',
        referencedColumn: 'id',
        onDelete: 'CASCADE',
      },
    },
  ],
  indexes: ['username', 'email'], // Indexes on username and email for faster querying
};

export const rolesTableSchema: DatatableSchema = {
  table: 'roles',
  columns: [
    { name: 'id', type: 'int', isPrimaryKey: true, isNullable: false },
    {
      name: 'role_name',
      type: 'enum',
      enumValues: ['admin', 'user', 'guest'],
      isNullable: false,
    },
    { name: 'description', type: 'text', isNullable: true },
  ],
};

export const postsTableSchema: DatatableSchema = {
  table: 'posts',
  columns: [
    { name: 'id', type: 'int', isPrimaryKey: true, isNullable: false },
    { name: 'title', type: 'string', length: 255, isNullable: false },
    { name: 'content', type: 'text', isNullable: false },
    {
      name: 'author_id',
      type: 'int',
      isNullable: false,
      foreignKey: {
        referencedTable: 'users',
        referencedColumn: 'id',
        onDelete: 'CASCADE',
      },
    },
    { name: 'published_at', type: 'datetime', isNullable: true },
    {
      name: 'created_at',
      type: 'timestamp',
      isNullable: false,
    },
    { name: 'updated_at', type: 'timestamp', isNullable: true },
  ],
  indexes: ['title', 'author_id'], // Indexes on title and author_id for faster querying
};

export const orderItemsTableSchema: DatatableSchema = {
  table: 'order_items',
  columns: [
    { name: 'id', type: 'int', isPrimaryKey: true, isNullable: false },
    {
      name: 'order_id',
      type: 'int',
      isNullable: false,
      foreignKey: {
        referencedTable: 'orders',
        referencedColumn: 'id',
        onDelete: 'CASCADE',
      },
    },
    {
      name: 'product_id',
      type: 'int',
      isNullable: false,
      foreignKey: {
        referencedTable: 'products',
        referencedColumn: 'id',
        onDelete: 'RESTRICT',
      },
    },
    { name: 'quantity', type: 'int', isNullable: false },
    {
      name: 'price',
      type: 'decimal',
      precision: 10,
      scale: 2,
      isNullable: false,
    },
    {
      name: 'created_at',
      type: 'timestamp',
      isNullable: false,
    },
  ],
  relations: [
    {
      relationType: 'many-to-one',
      relatedTable: 'orders',
      columns: ['order_id'],
      relatedColumns: ['id'],
    },
    {
      relationType: 'many-to-one',
      relatedTable: 'products',
      columns: ['product_id'],
      relatedColumns: ['id'],
    },
  ],
};

export const ordersTableSchema: DatatableSchema = {
  table: 'orders',
  columns: [
    { name: 'id', type: 'int', isPrimaryKey: true, isNullable: false },
    {
      name: 'user_id',
      type: 'int',
      isNullable: false,
      foreignKey: {
        referencedTable: 'users',
        referencedColumn: 'id',
        onDelete: 'CASCADE',
      },
    },
    { name: 'order_date', type: 'date', isNullable: false },
    { name: 'status', type: 'string', length: 50, isNullable: false },
    {
      name: 'total_price',
      type: 'decimal',
      precision: 10,
      scale: 2,
      isNullable: false,
    },
  ],
  relations: [
    {
      relationType: 'one-to-many',
      relatedTable: 'order_items',
      columns: ['id'],
      relatedColumns: ['order_id'],
    },
  ],
};

export const repositorySchemaExample: DatatableSchema[] = [
  usersTableSchema,
  rolesTableSchema,
  postsTableSchema,
  orderItemsTableSchema,
  ordersTableSchema,
];
