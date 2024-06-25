import { faker } from '@faker-js/faker';
import { DataRow, DataSet, Visualisation, Column } from '@/types/DataSet';

// Helper functions (same as in the previous route)
const generateRandomDataRow = (columns: Column[]): DataRow => {
  const row: DataRow = {};
  columns.forEach((column) => {
    row[column.selector] = faker.helpers.arrayElement([
      faker.number.int(),
      faker.lorem.word(),
      faker.datatype.boolean(),
    ]);
  });
  return row;
};

const generateRandomColumns = (): Column[] => {
  const numberOfColumns = faker.number.int({ min: 3, max: 10 });
  return Array.from({ length: numberOfColumns }, (_, index) => ({
    name: `Column${index + 1}`,
    selector: `column${index + 1}`,
  }));
};

const createFakeVisualisation = (id: number): Visualisation => ({
  id,
  title: faker.commerce.productName(),
  type: faker.helpers.arrayElement(['table', 'line', 'bar']),
  data: {
    labels: Array.from({ length: 5 }, () => faker.lorem.word()),
    datasets: Array.from(
      { length: faker.number.int({ min: 1, max: 3 }) },
      () => ({
        label: faker.commerce.department(),
        data: Array.from({ length: 5 }, () =>
          faker.number.int({ min: 0, max: 100 })
        ),
        backgroundColor: faker.color.rgb(),
        borderColor: faker.color.rgb(),
      })
    ),
  },
});

const generateSourceScript = (source: 'sql' | 'python'): string => {
  if (source === 'sql') {
    return `SELECT ${faker.database.column()} FROM ${faker.company.name().replace(/\s/g, '_')};`;
  } else if (source === 'python') {
    return `import pandas as pd\n\ndf = pd.DataFrame({\n  'Column1': [${faker.number.int()}, ${faker.number.int()}, ${faker.number.int()}],\n  'Column2': ['${faker.lorem.word()}', '${faker.lorem.word()}', '${faker.lorem.word()}'],\n  'Column3': [${faker.datatype.boolean()}, ${faker.datatype.boolean()}, ${faker.datatype.boolean()}]\n})\n\ndf.head()`;
  }
  return '';
};

const createFakeDataSet = (id: number): DataSet => {
  const source: 'sql' | 'python' | 'connection' = faker.helpers.arrayElement([
    'sql',
    'python',
    'connection',
  ]);

  const sourceConnections = [
    'Google Analytics',
    'Main DB',
    'Snowflake',
    'Redshift',
    'BigQuery',
  ];

  const cronParts = [
    faker.helpers.arrayElement([
      faker.number.int({ min: 0, max: 59 }).toString(),
      '*',
    ]), // minute
    faker.helpers.arrayElement([
      faker.number.int({ min: 0, max: 23 }).toString(),
      '*',
    ]), // hour
    faker.helpers.arrayElement([
      faker.number.int({ min: 1, max: 28 }).toString(),
      '*',
    ]), // day of month
    faker.helpers.arrayElement([
      faker.number.int({ min: 1, max: 12 }).toString(),
      '*',
    ]), // month
    faker.helpers.arrayElement([
      faker.number.int({ min: 0, max: 6 }).toString(),
      '*',
    ]), // day of week
  ].join(' ');

  const columns = generateRandomColumns();

  return {
    id,
    name: faker.company.name(),
    documentation: `
      # ${faker.company.catchPhrase()}
      ${faker.lorem.paragraphs(2)}
    `,
    refreshSchedule: cronParts,
    sourceWorkspace: faker.company.name(),
    status: faker.helpers.arrayElement(['private', 'public', 'connected']),
    source,
    sourceScript: source !== 'connection' ? generateSourceScript(source) : null,
    scriptFile: source !== 'connection' ? `/scripts/data_${id}.py` : null,
    sourceConnection:
      source === 'connection'
        ? faker.helpers.arrayElement(sourceConnections)
        : null,
    visualisations: Array.from(
      { length: faker.number.int({ min: 1, max: 5 }) },
      (_, index) => createFakeVisualisation(id * 10 + index)
    ),
    columns,
    data: Array.from({ length: faker.number.int({ min: 5, max: 20 }) }, () =>
      generateRandomDataRow(columns)
    ),
  };
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const dataSetId = parseInt(id as string, 10);

  if (isNaN(dataSetId)) {
    return new Response(JSON.stringify({ error: 'Invalid dataset ID' }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  const dataSet = createFakeDataSet(dataSetId);
  return new Response(JSON.stringify(dataSet), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}
