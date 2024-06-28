export interface ConnectionAdditionalData {
  connector: string;
  nextSync: string;
  nextSyncTimestamp: Date;
  status: 'running' | 'errors' | 'stopped';
  parts: string[];
}
export interface Connection {
  id: number;
  name: string;
  logo: string | null;
  description: string | null;
}

export interface ConnectionWithAdditionalData
  extends Connection,
    ConnectionAdditionalData {}
