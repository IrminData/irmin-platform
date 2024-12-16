import { Connector } from '@/types/core/Connector';

import { ConnectorInfo } from './ConnectorInfo';

/**
 * Connector information section
 *
 * @param props - The props for the component
 * @param props.connector - The connector object
 */
const ConnectorSection = ({ connector }: { connector: Connector }) => {
  return (
    <div className='container relative mx-auto max-w-6xl px-4'>
      <ConnectorInfo connector={connector} />
    </div>
  );
};

export default ConnectorSection;
