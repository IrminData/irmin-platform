export interface Connector {
  id: number;
  name: string;
  logo: string;
  description: string;
}

export interface ConnectionDetailsAndSettingsFields {
  [key: string]: 'text' | 'password' | 'number' | 'integer' | 'float';
}

export interface ConnectionDetailsAndSettings {
  [key: string]: string | number;
}
