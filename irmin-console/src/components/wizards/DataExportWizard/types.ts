import type { Connection } from '@/types/core/Connection';
import type { Repository } from '@/types/core/Repository';
import type { WorkflowSchedule } from '@/types/core/Schedule';
import type { FieldMapping } from '@/types/core/Workflow';

/**
 * Data export wizard data state
 */
export interface DataExportWizardData {
  // Connection data (destination)
  connection: Connection | null;
  createNewConnection: boolean;

  // Repository data (source - existing only)
  repository: Repository | null;

  // Workflow data
  workflowData: {
    name: string;
    description: string;
    documentation: string;
    schedule?: WorkflowSchedule;
    export_from_repository_paths: string[];
    repository_branch: string;
    export_to_connection_path: string;
    field_mappings: FieldMapping[];
  };
}
