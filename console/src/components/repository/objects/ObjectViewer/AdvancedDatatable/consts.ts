import { colorSchemeDark, themeQuartz } from 'ag-grid-community';

export const DEFAULT_COL_DEF = {
  sortable: true,
  resizable: true,
  filter: true,
  flex: 1,
  minWidth: 100,
};

export const PAGINATION_PAGE_SIZE = 20;
export const PAGINATION_PAGE_SIZE_SELECTOR = [20, 50, 100];

export const THEME_LIGHT = themeQuartz;
export const THEME_DARK = themeQuartz.withPart(colorSchemeDark);
