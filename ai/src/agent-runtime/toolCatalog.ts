/* eslint-disable import-x/no-unused-modules -- Public agent runtime module. */
import type { DynamicStructuredTool } from 'langchain';

export type ToolCapability =
  | 'documentation.retrieve'
  | 'repository.read'
  | 'query.execute'
  | 'query.author'
  | 'script.read'
  | 'script.write'
  | 'script.execute'
  | 'script.author'
  | 'workflow.read'
  | 'context.read';

const CAPABILITY_TOOLS: Readonly<Record<ToolCapability, readonly string[]>> = {
  'documentation.retrieve': [
    'irmin_retrieve_docs_context',
    'irmin_hyde_search',
    'irmin_duckdb_hyde_search',
  ],
  'repository.read': [
    'irmin_list_repositories',
    'irmin_get_repository',
    'irmin_list_repository_objects',
    'irmin_get_repository_object_schema',
    'irmin_list_repository_branches',
    'irmin_list_repository_tags',
    'irmin_list_repository_commits',
  ],
  'query.execute': ['irmin_execute_sql'],
  'query.author': ['query_sql_assistant'],
  'script.read': ['irmin_list_scripts', 'irmin_get_script_content'],
  'script.write': ['irmin_create_script', 'irmin_update_script'],
  'script.execute': ['irmin_execute_script'],
  'script.author': ['scripting_assistant'],
  'workflow.read': ['irmin_list_workflows', 'irmin_get_workflow'],
  'context.read': ['irmin_get_context', 'irmin_get_batch_context'],
};

/** Capability-based projection over the transport tool catalog. */
export class ToolCatalog {
  select(
    tools: readonly DynamicStructuredTool[],
    capabilities: readonly ToolCapability[]
  ): DynamicStructuredTool[] {
    const names = new Set(this.namesFor(capabilities));
    return tools.filter((tool) => names.has(tool.name));
  }

  namesFor(capabilities: readonly ToolCapability[]): string[] {
    return [...new Set(capabilities.flatMap((key) => CAPABILITY_TOOLS[key]))];
  }
}

export const toolCatalog = new ToolCatalog();
