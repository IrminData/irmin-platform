import { IrminAPIResponse } from './IrminAPIResponse';

export interface Connector {
  id: number;
  name: string;
  logo: string;
  description: string;
}
export interface ConnectorAPIResponse extends IrminAPIResponse {
  data: Connector[];
}

export interface ConnectionDetails {
  [key: string]: any;
}

export interface ConnectionSettings {
  [key: string]: any;
}

export interface ConnectionSetupAPIResponse extends IrminAPIResponse {
  [key: string]: any;
}
