import {
  ActionWorkflowableInput,
  ExportWorkflowableInput,
  ImportWorkflowableInput,
  PipelineStageActionInput,
  PipelineStageConnectionInput,
  PipelineStageRepositoryInput,
  PipelineWorkflowableInput,
  WorkflowableInput,
} from '@/types/internal/WorkflowInput';

/**
 * Creates a FormData object from the provided `WorkflowableInput` object.
 *
 * This function serialises the `WorkflowableInput` into a FormData object by appending each of its properties
 * as individual fields. Depending on the input type, it processes and appends the relevant properties accordingly.
 *
 * @param input - The `WorkflowableInput` object containing the workflowable configuration.
 * @returns A FormData object containing the `WorkflowableInput` fields, ready to be used in an HTTP request.
 *
 * @example
 * ```typescript
 * const input: ExportWorkflowableInput = {
 *   type: 'export',
 *   connection: '123',
 *   connection_path: '/path/to/connection',
 *   repository: 'my-repo',
 *   branch: 'main',
 *   path: '/path/to/repo',
 * };
 * const formData = createWorkflowableFormData(input);
 * ```
 */
export default function createWorkflowableFormData(
  input: WorkflowableInput
): FormData {
  const formData = new FormData();

  // determine the input type and serialise accordingly
  switch (input.type) {
    case 'pipeline': {
      // serialise pipeline workflowable input
      const pipelineInput = input as PipelineWorkflowableInput;
      formData.append('live', pipelineInput.live.toString());

      // iterate through each stage and serialise its properties
      pipelineInput.stages.forEach((stage, index) => {
        formData.append(`stage[${index}].type`, stage.type);
        formData.append(`stage[${index}].description`, stage.description);
        formData.append(`stage[${index}].write`, stage.write.toString());
        formData.append(`stage[${index}].read`, stage.read.toString());

        if (stage.type === 'action') {
          // serialise properties specific to PipelineStageActionInput
          formData.append(
            `stage[${index}].executable`,
            (stage as PipelineStageActionInput).executable
          );
        } else if (stage.type === 'connection') {
          // serialise properties specific to PipelineStageConnectionInput
          const connectionStage = stage as PipelineStageConnectionInput;
          formData.append(
            `stage[${index}].connection`,
            connectionStage.connection
          );
          formData.append(
            `stage[${index}].connection_write_path`,
            connectionStage.connection_write_path
          );
          formData.append(
            `stage[${index}].connection_read_path`,
            connectionStage.connection_read_path
          );
        } else if (stage.type === 'repository') {
          // serialise properties specific to PipelineStageRepositoryInput
          const repositoryStage = stage as PipelineStageRepositoryInput;
          formData.append(
            `stage[${index}].repository`,
            repositoryStage.repository
          );
          formData.append(`stage[${index}].branch`, repositoryStage.branch);
          formData.append(`stage[${index}].path`, repositoryStage.path);
        }
      });
      break;
    }
    case 'action': {
      // serialise action workflowable input
      const actionInput = input as ActionWorkflowableInput;
      formData.append('executable', actionInput.executable);
      if (actionInput.repository) {
        formData.append('repository', actionInput.repository);
      }
      if (actionInput.branch) {
        formData.append('branch', actionInput.branch);
      }
      if (actionInput.path) {
        formData.append('path', actionInput.path);
      }
      break;
    }
    case 'export': {
      // serialise export workflowable input
      const exportInput = input as ExportWorkflowableInput;
      formData.append('connection', exportInput.connection);
      formData.append('connection_path', exportInput.connection_path);
      formData.append('repository', exportInput.repository);
      formData.append('branch', exportInput.branch);
      formData.append('path', exportInput.path);
      break;
    }
    case 'import': {
      // serialise import workflowable input
      const importInput = input as ImportWorkflowableInput;
      formData.append('connection', importInput.connection);
      formData.append('connection_path', importInput.connection_path);
      formData.append('repository', importInput.repository);
      formData.append('branch', importInput.branch);
      formData.append('path', importInput.path);
      break;
    }
    default:
      throw new Error('Unsupported workflowable input type');
  }

  return formData;
}
