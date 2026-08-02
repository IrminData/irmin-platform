'use client';

import { AiOutlineDownload } from 'react-icons/ai';
import { TbAlertTriangle, TbExclamationCircle } from 'react-icons/tb';

import { Button } from '@/components/ui/button';

import { useLocale } from '@/context/LocaleContext';

import { formatByteSize, formatRowCount } from '@/utils/dataSizeUtils';

type DataType = 'table' | 'json' | 'blob';
type Severity = 'error' | 'warning';

interface DataSizeWarningProps {
  dataSize: number;
  type: DataType;
  severity?: Severity;
  contentType?: string;
  downloadUrl?: string;
  onDownload?: () => void;
  onContinue?: () => void;
}

/**
 * Component to display when data is too large to render safely
 *
 * @param props - The props for the component
 * @param props.dataSize - Size of the data (bytes for JSON/blob, row count for tables)
 * @param props.type - Type of data (table, json, blob)
 * @param props.severity - Severity level (error blocks rendering, warning allows continue)
 * @param props.contentType - Content type for blob files
 * @param props.downloadUrl - Download URL for blob files
 * @param props.onDownload - Function to trigger download
 * @param props.onContinue - Function to continue rendering despite warning
 */
const DataSizeWarning = ({
  dataSize,
  type,
  severity = 'error',
  contentType,
  downloadUrl,
  onDownload,
  onContinue,
}: DataSizeWarningProps) => {
  const { dict } = useLocale();

  const isError = severity === 'error';
  const isWarning = severity === 'warning';

  const getFormattedSize = () => {
    if (type === 'table') {
      return formatRowCount(dataSize);
    }
    return formatByteSize(dataSize);
  };

  const getTitle = () => {
    if (isError) {
      return type === 'table'
        ? dict.dataSizeWarning.tableTooLarge
        : type === 'json'
          ? dict.dataSizeWarning.jsonTooLarge
          : dict.dataSizeWarning.fileTooLarge;
    }
    return type === 'table'
      ? dict.dataSizeWarning.largeTableWarning
      : type === 'json'
        ? dict.dataSizeWarning.largeJsonWarning
        : dict.dataSizeWarning.largeFileWarning;
  };

  const getMessage = () => {
    if (isError) {
      return type === 'table'
        ? dict.dataSizeWarning.tableTooLargeMessage
        : type === 'json'
          ? dict.dataSizeWarning.jsonTooLargeMessage
          : dict.dataSizeWarning.fileTooLargeMessage;
    }
    return type === 'table'
      ? dict.dataSizeWarning.largeTableMessage
      : type === 'json'
        ? dict.dataSizeWarning.largeJsonMessage
        : dict.dataSizeWarning.largeFileMessage;
  };

  return (
    <div
      className={`
        flex w-full flex-col items-center justify-center gap-4 px-4 py-12
        text-center
      `}
    >
      <div
        className={`
          flex items-center justify-center rounded-full p-4
          ${
            isError
              ? `
                bg-red-100
                dark:bg-red-900/20
              `
              : `
                bg-yellow-100
                dark:bg-yellow-900/20
              `
          }
        `}
      >
        {isError ? (
          <TbExclamationCircle
            className={`
              text-red-600
              dark:text-red-400
            `}
            size={48}
          />
        ) : (
          <TbAlertTriangle
            className={`
              text-yellow-600
              dark:text-yellow-400
            `}
            size={48}
          />
        )}
      </div>

      <div className='flex flex-col gap-2'>
        <h3
          className={`
            text-lg font-semibold
            ${
              isError
                ? `
                  text-red-600
                  dark:text-red-400
                `
                : `
                  text-yellow-600
                  dark:text-yellow-400
                `
            }
          `}
        >
          {getTitle()}
        </h3>
        <p
          className={`
            text-sm text-gray-600
            dark:text-gray-400
          `}
        >
          {getMessage()}
        </p>
        <p
          className={`
            font-mono text-xs text-gray-500
            dark:text-gray-500
          `}
        >
          {dict.dataSizeWarning.sizeLabel} {getFormattedSize()}
          {contentType && ` (${contentType})`}
        </p>
      </div>

      <div
        className={`
          flex flex-col gap-2
          sm:flex-row
        `}
      >
        {downloadUrl ? (
          <a href={downloadUrl} download>
            <Button icon={<AiOutlineDownload />} variant='accent'>
              {dict.common.download || 'Download'}
            </Button>
          </a>
        ) : onDownload ? (
          <Button
            icon={<AiOutlineDownload />}
            variant='accent'
            onClick={onDownload}
          >
            {type === 'table'
              ? dict.dataSizeWarning.downloadCsv
              : dict.common.download}
          </Button>
        ) : null}

        {isWarning && onContinue && (
          <Button variant='secondary' onClick={onContinue}>
            {dict.dataSizeWarning.renderAnyway}
          </Button>
        )}
      </div>

      {isWarning && (
        <p
          className={`
            text-xs text-gray-500
            dark:text-gray-600
          `}
        >
          {dict.dataSizeWarning.performanceWarning}
        </p>
      )}
    </div>
  );
};

export default DataSizeWarning;
