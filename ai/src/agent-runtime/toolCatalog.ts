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

function capabilityOf(tool: DynamicStructuredTool): string | undefined {
  const direct = tool.metadata?.irminCapability;
  if (typeof direct === 'string') return direct;
  const descriptor = tool.metadata?.irminDescriptor;
  if (typeof descriptor !== 'object' || descriptor === null) return undefined;
  const capability = (descriptor as Record<string, unknown>).capability;
  return typeof capability === 'string' ? capability : undefined;
}

/** Capability-based projection over the transport tool catalog. */
export class ToolCatalog {
  private readonly capabilitiesByName = new Map<string, string>();

  select(
    tools: readonly DynamicStructuredTool[],
    capabilities: readonly ToolCapability[]
  ): DynamicStructuredTool[] {
    this.remember(tools);
    const requested = new Set<string>(capabilities);
    return tools.filter((tool) => {
      const capability = capabilityOf(tool);
      return capability !== undefined && requested.has(capability);
    });
  }

  namesFor(
    tools: readonly DynamicStructuredTool[],
    capabilities: readonly ToolCapability[]
  ): string[] {
    this.remember(tools);
    const requested = new Set<string>(capabilities);
    return tools
      .filter((tool) => {
        const capability = capabilityOf(tool);
        return capability !== undefined && requested.has(capability);
      })
      .map((tool) => tool.name);
  }

  hasCapability(
    toolName: string,
    capabilities: readonly ToolCapability[]
  ): boolean {
    const capability = this.capabilitiesByName.get(toolName);
    return (
      capability !== undefined &&
      capabilities.includes(capability as ToolCapability)
    );
  }

  private remember(tools: readonly DynamicStructuredTool[]): void {
    for (const tool of tools) {
      const capability = capabilityOf(tool);
      if (capability) this.capabilitiesByName.set(tool.name, capability);
    }
  }
}

export const toolCatalog = new ToolCatalog();
