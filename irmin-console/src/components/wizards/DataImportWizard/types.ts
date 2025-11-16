import type { Connection } from '@/types/core/Connection';
import type { Connector } from '@/types/core/Connector';
import type { Repository } from '@/types/core/Repository';
import type { WorkflowSchedule } from '@/types/core/Schedule';
import type { FieldMapping } from '@/types/core/Workflow';
import type {
  DynamicFields,
  DynamicFieldValues,
} from '@/types/internal/DynamicField';

/**
 * Data import wizard data state
 */
export interface DataImportWizardData {
  // Connection data
  connection: Connection | null;
  createNewConnection: boolean;
  connectionData: {
    name: string;
    description: string;
    connector: Connector | undefined;
    connectionDetailsFields: DynamicFields | undefined;
    connectionSettingsFields: DynamicFields | undefined;
    connectionDetails: DynamicFieldValues | undefined;
    connectionSettings: DynamicFieldValues | undefined;
  };

  // Repository data
  repository: Repository | null;
  createNewRepository: boolean;
  repositoryData: {
    name: string;
    description: string;
    default_branch: string;
  };

  // Workflow data
  workflowData: {
    name: string;
    description: string;
    documentation: string;
    schedule?: WorkflowSchedule;
    import_from_connection_paths: string[];
    repository_branch: string;
    import_to_repository_path: string;
    field_mappings: FieldMapping[];
  };
}
