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
 * Filter connection schema to only include the relevant paths
 * @param schema - The full connection schema
 * @param paths - The specific paths to filter to
 * @returns The filtered schema or null if no valid paths found
 */
export const getFilteredSchema = (
  schema: ObjectSchema | null | undefined,
  paths: string[]
): ObjectSchema | null => {
  if (!schema || !paths) return schema || null;

  // If no paths, return the full schema
  if (paths.length === 0) return schema;

  // Handle root paths early
  if (paths.some((path) => path === '' || path === '/')) return schema;

  // Find all objects by paths and filter out nulls
  const foundSchemas = paths
    .map((path) => findObjectByPath(schema, path))
    .filter((s): s is ObjectSchema => s !== undefined);

  if (foundSchemas.length === 0) return null;
  if (foundSchemas.length === 1) return foundSchemas[0];

  // Remove redundant paths (if a parent path contains a child path, remove the child)
  const optimizedSchemas = removeRedundantPaths(foundSchemas);

  if (optimizedSchemas.length === 1) return optimizedSchemas[0];

  // Try to find a common parent that contains all the schemas
  const commonParent = findCommonParent(schema, optimizedSchemas);
  if (commonParent && shouldUseCommonParent(commonParent, optimizedSchemas)) {
    return commonParent;
  }

  // Create an intelligent combined schema based on the types
  return createCombinedSchema(optimizedSchemas);
};

/**
 * Remove schemas that are children of other schemas in the list
 */
const removeRedundantPaths = (schemas: ObjectSchema[]): ObjectSchema[] => {
  return schemas.filter((schema) => {
    return !schemas.some(
      (otherSchema) =>
        otherSchema !== schema &&
        schema.path.startsWith(otherSchema.path + '/') &&
        otherSchema.type === 'group'
    );
  });
};

/**
 * Find the closest common parent that contains all the given schemas
 */
const findCommonParent = (
  root: ObjectSchema,
  targetSchemas: ObjectSchema[]
): ObjectSchema | null => {
  if (targetSchemas.length === 0) return null;

  // Get all paths of target schemas
  const targetPaths = targetSchemas.map((s) => s.path);

  // Find the longest common path prefix
  const commonPathPrefix = findLongestCommonPathPrefix(targetPaths);

  if (!commonPathPrefix) return null;

  // Find the parent object that matches this prefix
  return findObjectByPath(root, commonPathPrefix) || null;
};

/**
 * Find the longest common path prefix among paths
 */
const findLongestCommonPathPrefix = (paths: string[]): string | null => {
  if (paths.length === 0) return null;
  if (paths.length === 1) {
    // Return parent path
    const parentPath = paths[0].split('/').slice(0, -1).join('/');
    return parentPath || null;
  }

  const pathSegments = paths.map((path) => path.split('/'));
  const minLength = Math.min(
    ...pathSegments.map((segments) => segments.length)
  );

  const commonPrefix: string[] = [];

  for (let i = 0; i < minLength - 1; i++) {
    // -1 to get parent, not the items themselves
    const segment = pathSegments[0][i];
    if (pathSegments.every((segments) => segments[i] === segment)) {
      commonPrefix.push(segment);
    } else {
      break;
    }
  }

  return commonPrefix.length > 0 ? commonPrefix.join('/') : null;
};

/**
 * Determine if we should use the common parent instead of creating a combined schema
 */
const shouldUseCommonParent = (
  parent: ObjectSchema,
  targetSchemas: ObjectSchema[]
): boolean => {
  if (parent.type !== 'group' || !parent.children) return false;

  // Use parent if it doesn't contain too many extra items (threshold: 2x the target count)
  const targetCount = targetSchemas.length;
  const parentChildCount = parent.children.length;

  return parentChildCount <= targetCount * 2;
};

/**
 * Create an intelligently combined schema based on the types and relationships
 */
const createCombinedSchema = (schemas: ObjectSchema[]): ObjectSchema => {
  // Analyze the types of schemas we're combining
  const types = schemas.map((s) => s.type);
  const uniqueTypes = [...new Set(types)];

  // Determine the best name and path for the combined schema
  const commonPathParts = findCommonPathStructure(schemas.map((s) => s.path));
  const baseName = generateCombinedName(schemas);
  const basePath =
    commonPathParts.length > 0
      ? commonPathParts.join('/') + '/combined'
      : 'combined';

  // If all schemas are structured and have similar content types, create a more specific group
  if (uniqueTypes.length === 1 && uniqueTypes[0] === 'structured') {
    const contentTypes = schemas
      .filter(
        (s): s is ObjectSchema & { type: 'structured' } =>
          s.type === 'structured'
      )
      .map((s) => s.content_type)
      .filter((ct): ct is string => Boolean(ct));

    const uniqueContentTypes = [...new Set(contentTypes)];

    return {
      type: 'group',
      name: baseName,
      path: basePath,
      description: `Combined ${uniqueContentTypes.length === 1 ? uniqueContentTypes[0] : 'structured'} data from ${schemas.length} sources`,
      children: schemas,
      restrictions:
        uniqueContentTypes.length === 1
          ? {
              only_structured: true,
              allowed_content_types: uniqueContentTypes,
            }
          : {
              only_structured: true,
            },
    };
  }

  // If all schemas are binary, create a binary-specific group
  if (uniqueTypes.length === 1 && uniqueTypes[0] === 'binary') {
    return {
      type: 'group',
      name: baseName,
      path: basePath,
      description: `Combined binary data from ${schemas.length} sources`,
      children: schemas,
      restrictions: {
        only_binary: true,
      },
    };
  }

  // Mixed types or all groups - create a general group
  return {
    type: 'group',
    name: baseName,
    path: basePath,
    description: `Combined data from ${schemas.length} sources (${uniqueTypes.join(', ')})`,
    children: schemas,
  };
};

/**
 * Find common path structure among schemas
 */
const findCommonPathStructure = (paths: string[]): string[] => {
  if (paths.length === 0) return [];

  const pathSegments = paths.map((path) => path.split('/').filter(Boolean));
  const minLength = Math.min(
    ...pathSegments.map((segments) => segments.length)
  );

  const commonParts: string[] = [];

  for (let i = 0; i < minLength; i++) {
    const segment = pathSegments[0][i];
    if (pathSegments.every((segments) => segments[i] === segment)) {
      commonParts.push(segment);
    } else {
      break;
    }
  }

  return commonParts;
};

/**
 * Generate a meaningful name for the combined schema
 */
const generateCombinedName = (schemas: ObjectSchema[]): string => {
  const names = schemas.map(
    (s) => s.name || s.path.split('/').pop() || 'unknown'
  );

  if (names.length <= 2) {
    return names.join(' + ');
  }

  // For more than 2 items, use a more concise format
  const commonWords = findCommonWords(names);
  if (commonWords.length > 0) {
    return `${commonWords[0]} (${schemas.length} items)`;
  }

  return `Combined Data (${schemas.length} items)`;
};

/**
 * Find common words in names to create better combined names
 */
const findCommonWords = (names: string[]): string[] => {
  if (names.length === 0) return [];

  const words = names.map((name) =>
    name
      .toLowerCase()
      .replace(/\.[^.]*$/, '') // Remove file extensions
      .split(/[_\-\s]+/)
      .filter(Boolean)
  );

  const firstWords = words[0];
  return firstWords.filter((word) =>
    words.every((nameWords) => nameWords.includes(word))
  );
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
