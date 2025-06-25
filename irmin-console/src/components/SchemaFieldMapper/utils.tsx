import { TbFile, TbFolder, TbTable } from 'react-icons/tb';

import type { ObjectSchema } from '@/types/core/ObjectSchema';
import type { FieldMapping } from '@/types/core/Workflow';

import type { Field, FileGroup } from './types';

export const extractFieldsFromSchema = (schema: ObjectSchema): Field[] => {
  const fields: Field[] = [];

  const processSchema = (obj: ObjectSchema) => {
    if (obj.type === 'structured' && obj.schema) {
      let properties: typeof obj.schema.properties;
      let required: typeof obj.schema.required;

      // Handle different schema types
      if (obj.schema.type === 'object' && obj.schema.properties) {
        // Direct object schema
        properties = obj.schema.properties;
        required = obj.schema.required;
      } else if (
        obj.schema.type === 'array' &&
        obj.schema.items?.type === 'object' &&
        obj.schema.items.properties
      ) {
        // Array of objects schema
        properties = obj.schema.items.properties;
        required = obj.schema.items.required;
      }

      if (properties) {
        Object.entries(properties).forEach(([fieldName, fieldSchema]) => {
          fields.push({
            path: `${obj.path}.${fieldName}`,
            name: fieldName,
            type: fieldSchema.type,
            format: fieldSchema.format,
            source: obj.path,
            description: fieldSchema.description,
            required: required?.includes(fieldName),
          });
        });
      }
    } else if (obj.type === 'group' && obj.children) {
      obj.children.forEach((child) => processSchema(child));
    }
  };

  processSchema(schema);
  return fields;
};

export const groupFieldsByFile = (schema: ObjectSchema | null): FileGroup[] => {
  if (!schema) return [];

  // Handle the case where the schema itself is a structured object
  if (schema.type === 'structured') {
    const fields = extractFieldsFromSchema(schema).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
    return [
      {
        filePath: schema.path,
        fields,
        fileType: schema.type,
        contentType: schema.content_type,
        size: schema.size,
        description: schema.description,
      },
    ];
  }

  // Handle the case where the schema is a group containing children
  if (schema.type === 'group') {
    return (schema.children ?? [])
      .filter((child) => child.type === 'structured')
      .map((child) => {
        const fields = extractFieldsFromSchema(child).sort((a, b) =>
          a.name.localeCompare(b.name)
        );
        return {
          filePath: child.path,
          fields,
          fileType: child.type,
          contentType:
            child.type === 'structured' ? child.content_type : undefined,
          size: child.type === 'structured' ? child.size : undefined,
          description: child.description,
        };
      })
      .sort((a, b) => a.filePath.localeCompare(b.filePath));
  }

  // For binary objects or other types, return empty array
  return [];
};

export const getFileIcon = (fileType: string) => {
  switch (fileType) {
    case 'group':
      return (
        <TbFolder className='h-5 w-5 text-yellow-500 dark:text-yellow-400' />
      );
    case 'structured':
      return <TbTable className='h-5 w-5 text-blue-500 dark:text-blue-400' />;
    case 'binary':
    default:
      return <TbFile className='h-5 w-5 text-gray-500 dark:text-gray-400' />;
  }
};

export const isFieldMapped = (
  field: Field,
  isSource: boolean,
  mappings: FieldMapping[]
) => {
  return mappings.some((m) =>
    isSource ? m.source_path === field.path : m.destination_path === field.path
  );
};

/**
 * Find an object in the schema tree by path
 */
export const findObjectByPath = (
  root: ObjectSchema,
  path: string
): ObjectSchema | undefined => {
  if (root.path === path) return root;
  if (root.type === 'group' && root.children) {
    for (const child of root.children) {
      const found = findObjectByPath(child, path);
      if (found) return found;
    }
  }
  return undefined;
};

/**
 * Filter connection schema to only include the relevant path
 * @param schema - The full connection schema
 * @param connectionPath - The specific path to filter to
 * @returns The filtered schema or null if path not found
 */
export const getFilteredConnectionSchema = (
  schema: ObjectSchema | null | undefined,
  connectionPath: string
): ObjectSchema | null => {
  if (!schema || !connectionPath) return schema || null;

  // If connection path is empty or root, return the full schema
  if (connectionPath === '' || connectionPath === '/') return schema;

  // Find the specific object at the connection path
  const filteredSchema = findObjectByPath(schema, connectionPath);
  return filteredSchema || null;
};

export const autoMapIdenticalFields = (
  sourceSchema: ObjectSchema | null,
  destinationSchema: ObjectSchema | null,
  mappings: FieldMapping[]
) => {
  if (!sourceSchema || !destinationSchema) return;

  const sourceFields = extractFieldsFromSchema(sourceSchema!);
  const destinationFields = extractFieldsFromSchema(destinationSchema!);

  const newMappings: FieldMapping[] = [...mappings];
  let autoMappedCount = 0;

  // Group fields by their source file
  const sourceByFile = sourceFields.reduce(
    (acc, field) => {
      if (!acc[field.source]) acc[field.source] = [];
      acc[field.source].push(field);
      return acc;
    },
    {} as Record<string, Field[]>
  );

  const destinationByFile = destinationFields.reduce(
    (acc, field) => {
      if (!acc[field.source]) acc[field.source] = [];
      acc[field.source].push(field);
      return acc;
    },
    {} as Record<string, Field[]>
  );

  // Find matching files and auto-map identical field names
  Object.keys(sourceByFile).forEach((sourceFile) => {
    Object.keys(destinationByFile).forEach((destFile) => {
      const sourceFileName =
        sourceFile
          .split('/')
          .pop()
          ?.replace(/\.[^/.]+$/, '') || '';
      const destFileName =
        destFile
          .split('/')
          .pop()
          ?.replace(/\.[^/.]+$/, '') || '';

      if (
        sourceFileName === destFileName ||
        sourceFileName.includes(destFileName) ||
        destFileName.includes(sourceFileName)
      ) {
        sourceByFile[sourceFile].forEach((sourceField) => {
          destinationByFile[destFile].forEach((destField) => {
            if (sourceField.name === destField.name) {
              const isDestAlreadyMapped = newMappings.some(
                (m) => m.destination_path === destField.path
              );

              if (!isDestAlreadyMapped) {
                newMappings.push({
                  source_path: sourceField.path,
                  source_field: sourceField.name,
                  destination_path: destField.path,
                  destination_field: destField.name,
                });
                autoMappedCount++;
              }
            }
          });
        });
      }
    });
  });

  return { newMappings, autoMappedCount };
};
