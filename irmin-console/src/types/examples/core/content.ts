import { IrminAPIUnstructuredResponse } from '@/types/core/IrminAPIResponse';

/**
 * Type of the content for the example response
 */
export enum ContentType {
  image = 'image',
  audio = 'audio',
  video = 'video',
  text = 'text',
  json = 'json',
  zip = 'zip',
  parquet = 'parquet',
  avro = 'avro',
  orc = 'orc',
  csv = 'csv',
}

// Helper function to get a random content type
function getRandomContentType(): ContentType {
  const contentTypes = Object.values(ContentType);
  const randomIndex = Math.floor(Math.random() * contentTypes.length);
  return contentTypes[randomIndex];
}

/**
 * Get example response for unstrucured API response
 *
 * @param type - (optional) type of the content to generate
 */
export const content = async (
  type?: ContentType
): Promise<IrminAPIUnstructuredResponse> => {
  try {
    const contentType = type ?? getRandomContentType();
    if (contentType === 'parquet') {
      const parquetRes = await fetch(
        'https://raw.githubusercontent.com/Teradata/kylo/refs/heads/master/samples/sample-data/parquet/userdata1.parquet',
        { mode: 'cors' }
      );
      return new Blob([await parquetRes.arrayBuffer()], {
        type: 'application/vnd.apache.parquet',
      });
    } else if (contentType === 'avro') {
      const avroRes = await fetch(
        'https://raw.githubusercontent.com/Teradata/kylo/refs/heads/master/samples/sample-data/avro/userdata5.avro',
        { mode: 'cors' }
      );
      return new Blob([await avroRes.arrayBuffer()], {
        type: 'application/vnd.apache.avro',
      });
    } else if (contentType === 'orc') {
      const orcRes = await fetch(
        'https://raw.githubusercontent.com/Teradata/kylo/refs/heads/master/samples/sample-data/orc/userdata1_orc',
        { mode: 'cors' }
      );
      return new Blob([await orcRes.arrayBuffer()], {
        type: 'application/vnd.apache.orc',
      });
    } else if (contentType === 'csv') {
      const csvRes = await fetch(
        'https://raw.githubusercontent.com/Teradata/kylo/refs/heads/master/samples/sample-data/csv/userdata1.csv',
        { mode: 'cors' }
      );
      return new Blob([await csvRes.arrayBuffer()], {
        type: 'text/csv',
      });
    } else if (contentType === 'audio') {
      const audioRes = await fetch(
        'https://raw.githubusercontent.com/rafaelreis-hotmart/Audio-Sample-files/refs/heads/master/sample.mp3',
        { mode: 'cors' }
      );
      return new Blob([await audioRes.arrayBuffer()], {
        type: 'audio/mpeg',
      });
    } else if (contentType === 'video') {
      const videoRes = await fetch(
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        { mode: 'cors' }
      );
      return new Blob([await videoRes.arrayBuffer()], {
        type: 'video/mp4',
      });
    } else if (contentType === 'image') {
      const imageRes = await fetch('https://picsum.photos/200/300', {
        mode: 'cors',
      });
      return await imageRes.blob();
    } else if (contentType === 'zip') {
      const zipRes = await fetch(
        'https://raw.githubusercontent.com/readmeio/import-samples/refs/heads/master/import-sample-single-version.zip',
        { mode: 'cors' }
      );
      return new Blob([await zipRes.arrayBuffer()], {
        type: 'application/zip',
      });
    } else if (contentType === 'json') {
      const jsonRes = await fetch(
        'https://baconipsum.com/api/?type=meat-and-filler&format=json&paras=10'
      );
      return await jsonRes.json();
    }
    const textRes = await fetch(
      'https://baconipsum.com/api/?type=meat-and-filler&format=text&paras=10'
    );
    return await textRes.text();
  } catch (error) {
    console.warn(
      (error as Error).message,
      'Failed to fetch example content for IrminAPIUnstructuredResponse'
    );
    return `
      This is an example response from the API.
      You are seeing this because the API is not available.
      This is a fake response, not the real thing.
      You might also be in offline mode.
    `;
  }
};
