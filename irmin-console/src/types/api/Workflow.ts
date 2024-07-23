import { Connector } from './Connector';
import { Dataset } from './Dataset';

// ---------   Generic workflows ---------
type WorkflowableType = 'connection' | 'action' | 'export'; // Source app/Enums/WorkflowType.php
export interface Workflow {
  id: number;
  workflowable_type: WorkflowableType;
  workflowable_id: number;
  workflowable: Connection | Action | ExportSync;
  cron_syntax?: string;
  status: WorkflowStatus;
  created_at: string;
  updated_at: string;
  name: string; // Currently is part of the Connection, but would be nice to have it here
  description?: string; // Something we don't have or ask for yet, but I think we could add it to the API and the DB schema in advance
  documentation?: string; // Same as above, but longer
  result?: Dataset; // If a workspace results in data, it should be wrapped as a Dataset. Not relevant for Export Workflows.
}
export type ConnectionWorkflow = Workflow & { workflowable: Connection };
export type ExportWorkflow = Workflow & { workflowable: ExportSync };
export type ActionWorkflow = Workflow & { workflowable: Action };

export interface WorkflowRun {
  id: number;
  workflow_id: number;
  status: WorkflowStatus;
  started_at: string;
  finished_at?: string;
}

// Source: app/Enums/WorkflowStatus.php
export type WorkflowStatus =
  | 'paused'
  | 'pending'
  | 'initiating'
  | 'running'
  | 'complete'
  | 'error';

// ---------  Connection workflows ---------
interface Connection {
  details: string; // String which contains a JSON object
  settings: string; // String which contains a JSON object
  connector: Connector;
}

// ---------  Export workflows ---------
interface ExportSync {
  destination: Connection;
  source: Dataset;
}

// ---------  Action workflows ---------
interface Action {
  path: string;
}
