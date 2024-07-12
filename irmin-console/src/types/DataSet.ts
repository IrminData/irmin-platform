export interface Column {
  name: string;
  selector: string;
}

export interface DataRow {
  [key: string]: number | string | boolean;
}

export interface Visualisation {
  id: number;
  title: string;
  type: 'table' | 'line' | 'bar';
  data: {
    labels: string[];
    datasets: {
      data: number[] | string[];
      label?: string;
      backgroundColor?: string;
      borderColor?: string;
    }[];
  };
}

export interface DataSet {
  id: number;
  name: string;
  documentation: string;
  refreshSchedule: string;
  sourceWorkspace: string;
  status: 'private' | 'public' | 'connected';
  source: 'sql' | 'python' | 'js' | 'connection';
  sourceScript: string | null;
  scriptFile: string | null;
  sourceConnection: string | null;
  visualisations: Visualisation[];
  columns: Column[];
  data: DataRow[];
}
