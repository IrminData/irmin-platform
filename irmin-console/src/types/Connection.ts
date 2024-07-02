export interface ConnectionAdditionalData {
  connector: string;
  nextSync: string;
  nextSyncTimestamp: Date;
  status: 'error' | 'warning' | 'running' | 'paused' | 'default';
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
