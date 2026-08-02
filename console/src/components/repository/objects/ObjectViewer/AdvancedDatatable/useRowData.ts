import { useMemo } from 'react';

import type { TableRow } from '@/types/internal/Datatable';

import type { ColumnType } from './types';

export const useRowData = (
  items: TableRow[],
  columnsWithTypes: Record<string, ColumnType>
) => {
  return useMemo(() => {
    if (items.length === 0 || Object.keys(columnsWithTypes).length === 0) {
      return [];
    }

    try {
      // Make sure values in the data are matching the columns
      return items.map((item) => {
        const newItem: TableRow = { ...item };
        Object.keys(columnsWithTypes).forEach((key) => {
          try {
            if (newItem[key] === undefined || newItem[key] === null) {
              newItem[key] = ''; // or undefined?
            }

            const type = columnsWithTypes[key];
            if (type === 'int') {
              newItem[key] = parseInt(newItem[key] as string);
            }
            if (type === 'float') {
              newItem[key] = parseFloat(newItem[key] as string);
            }
            if (type === 'boolean' && typeof newItem[key] !== 'boolean') {
              newItem[key] = newItem[key] === 'true';
            }
          } catch (e) {
            console.error(e);
          }
        });
        return newItem;
      });
    } catch (error) {
      console.error('Error formatting data:', error);
      return [];
    }
  }, [items, columnsWithTypes]);
};
