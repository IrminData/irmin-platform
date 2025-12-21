import { useMemo } from 'react';

import type {
  ColDef,
  ICellRendererParams,
  ValueFormatterParams,
} from 'ag-grid-community';

import { useLocale } from '@/context/LocaleContext';

import type { TableRow } from '@/types/internal/Datatable';

import type { ColumnType } from './types';

export const useColumnDefs = (items: TableRow[]) => {
  const { locale } = useLocale();

  return useMemo(() => {
    if (items.length === 0) {
      return {
        columnDefs: [] as ColDef[],
        columnsWithTypes: {} as Record<string, ColumnType>,
      };
    }

    try {
      // Get all properties from the items to use as columns
      const allProperties = items
        .map((item) => Object.keys(item))
        .flat()
        .filter((value, index, self) => self.indexOf(value) === index);

      // Store the matched types of the columns
      const columnsWithTypes: Record<string, ColumnType> = {};

      // Create columns from the properties
      const columnDefs: ColDef[] = allProperties.map((key) => {
        // Get the first value of the key to determine the type
        const exampleValue = items.find((item) => item[key])?.[key];

        // Determine the type of the column
        if (typeof exampleValue === 'number') {
          if (Number.isInteger(exampleValue)) {
            columnsWithTypes[key] = 'int';
            return {
              field: key,
              headerName: key,
              filter: 'agNumberColumnFilter',
            };
          }
          columnsWithTypes[key] = 'float';
          return {
            field: key,
            headerName: key,
            filter: 'agNumberColumnFilter',
          };
        }
        if (typeof exampleValue === 'boolean') {
          columnsWithTypes[key] = 'boolean';
          return {
            field: key,
            headerName: key,
            cellRenderer: (params: ICellRendererParams) => (
              <input type='checkbox' checked={params.value} readOnly />
            ),
          };
        }
        if (
          typeof exampleValue === 'string' &&
          new Date(exampleValue).toString() !== 'Invalid Date' &&
          !Number.isNaN(Date.parse(exampleValue))
        ) {
          columnsWithTypes[key] = 'date';
          return {
            field: key,
            headerName: key,
            filter: 'agDateColumnFilter',
            valueFormatter: (params: ValueFormatterParams) => {
              if (!params.value) return '';
              return new Date(params.value).toLocaleString(locale);
            },
          };
        }
        // If nothing else matches, use text column
        columnsWithTypes[key] = 'string';
        return {
          field: key,
          headerName: key,
          filter: 'agTextColumnFilter',
        };
      });

      return { columnDefs, columnsWithTypes };
    } catch (error) {
      console.error('Error processing columns:', error);
      return { columnDefs: [], columnsWithTypes: {} };
    }
  }, [items, locale]);
};
