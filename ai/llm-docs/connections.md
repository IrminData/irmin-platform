# Data Connections and Connectors

## Overview

Irmin provides a flexible connector system for integrating with various data sources and destinations.

## Connectors

Connectors are a universal way to interact with external services, data sources, and export targets. They are external applications that interface with Irmin for data movement operations.

## Connections

Connections are stored configuration definitions, like credentials and settings, for interacting with external systems using Connectors. These connections can then be used in workflows to move data between Irmin and the external system.

Always validate the connection configuration with the connector before creating a new connection or updating the configuration of an existing one. Use the `validate_connector_configuration` tool.

### Connection Schemas

Using the `get_connection_schema` tool, you can get the Object Schema of a connection. The schema describes what data can be read from and written to the connection.

## Connection Details and Settings

Connection Details and Settings are configurations required by the Connector to interact with the external system its connecting to. These configurations are stored in the Connection object and are passed to the Connector to authenticate and communicate with the external system.

The Connector can specify the information required to use its operations using `Dynamic Fields`. Connection Details and Settings field requirements are defined by the Connector and are specific to the external system being connected to.

There are two different configurations which can be used:

- `details`: Credentials required to authenticate with the external system, such as API keys, client IDs, and client secrets.
- `settings`: Configurations specific to the external system, such as account IDs, project IDs, and other settings.

## Dynamic Fields

Dynamic Fields are used for defining fields in a form. These fields can be used to capture a variety of input types, ranging from simple text inputs to complex structures like file uploads or multi-option selections.

```typescript
/**
 * Object used to define a field for user to fill in
 */
export interface DynamicField {
  type:
    | 'text'
    | 'textarea'
    | 'password'
    | 'email'
    | 'checkbox'
    | 'integer'
    | 'float'
    | 'select'
    | 'radio'
    | 'file'
    | 'date'
    | 'time'
    | 'datetime';
  label: string;
  min?: FieldValue;
  max?: FieldValue;
  multiple?: boolean; // Indicates if multiple values can be selected
  options?: {
    key: string;
    value: string;
  }[]; // List of key-value pairs for selection options
  help_text?: string; // Optional help text for the field
  example?: string; // Example value, used as placeholder
  default?: FieldValue | FieldValue[]; // Default value(s) for the field
  required?: boolean; // Indicates if the field is required
  required_with?: string[]; // List of other fields that, if filled, require this field to be filled as well
}
```

## Example Dynamic Fields and Field Values

The following example shows a MySQL connection details and settings.

```typescript
// Connection Details
const mysqlConnectionDetails: DynamicFields = {
  host: {
    type: 'text',
    label: 'Host',
    required: true,
    example: 'localhost',
  },
  username: {
    type: 'text',
    label: 'Username',
    required: true,
    example: 'root',
  },
  password: {
    type: 'password',
    label: 'Password',
    required: true,
    min: 8,
    help_text: 'Minimum 8 characters.',
  },
  defaultDatabase: {
    type: 'text',
    label: 'Database',
    required: true,
    example: 'defaultdb',
    default: 'defaultdb',
  },
  port: {
    type: 'integer',
    label: 'Port',
    required: false,
  },
  ssl: {
    type: 'checkbox',
    label: 'Use SSL',
    required: false,
  },
};

// Connection Settings
const mysqlConnectionSettings: DynamicFields = {
  database: {
    type: 'select',
    label: 'Database',
    required: true,
    options: [
      { key: 'my_database', value: 'My Database' },
      { key: 'defaultdb', value: 'Default Database' },
    ],
    default: 'defaultdb',
  },
};
```

The values passed to these fields when creating a connection could be:

```typescript
const mysqlConnectionDetails: DynamicFieldValues = {
  host: 'localhost',
  username: 'root',
  password: 'password',
  defaultDatabase: 'defaultdb',
  port: 3306,
  ssl: false,
};

const mysqlConnectionSettings: DynamicFieldValues = {
  database: 'my_database',
};
```