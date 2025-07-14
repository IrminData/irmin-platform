import type { Dictionary } from '@/lib/dict';

import type { SearchResult } from '@/types/core/Search';
import type { ConsoleSearchItem } from '@/types/internal/ConsoleSearch';
import { ConsoleSearchItemType } from '@/types/internal/ConsoleSearch';

/**
 * Convert API SearchResult to ConsoleSearchItem format
 */
export function convertSearchResultToConsoleItem(
  dict: Dictionary,
  result: SearchResult,
  locale: string,
  workspaceSlug: string
): ConsoleSearchItem | null {
  const { type } = result;

  switch (type) {
    case 'repository':
      if (result.repository) {
        return {
          title: result.repository.name,
          description: result.repository.description || '-',
          link: `/${locale}/workspace/${workspaceSlug}/repositories/${result.repository.slug}`,
          type: ConsoleSearchItemType.Repository,
        };
      }
      break;
    case 'repository_object':
      if (result.repository_object) {
        const urlEncodedPath = encodeURIComponent(
          result.repository_object.path
        );
        return {
          title: result.repository_object.name,
          description: `${result.repository_object.type} ${dict.repository.objects.object} • ${result.repository_object.repository_slug}@${result.repository_object.ref}`,
          link: `/${locale}/workspace/${workspaceSlug}/repositories/${result.repository_object.repository_slug}/object?path=${urlEncodedPath}&ref=${result.repository_object.ref}`,
          type:
            result.repository_object.type === 'structured'
              ? ConsoleSearchItemType.StructuredObject
              : result.repository_object.type === 'binary'
                ? ConsoleSearchItemType.BinaryObject
                : ConsoleSearchItemType.GroupObject,
        };
      }
      break;
    case 'workflow':
      if (result.workflow) {
        return {
          title: result.workflow.name,
          description: result.workflow.description || '-',
          link: `/${locale}/workspace/${workspaceSlug}/workflows/${result.workflow.id}`,
          type: ConsoleSearchItemType.Workflow,
        };
      }
      break;
    case 'connection':
      if (result.connection) {
        return {
          title: result.connection.name,
          description: result.connection.description || '-',
          link: `/${locale}/workspace/${workspaceSlug}/connections/${result.connection.id}`,
          type: ConsoleSearchItemType.Connection,
        };
      }
      break;
    case 'user':
      if (result.user) {
        return {
          title:
            `${result.user.first_name} ${result.user.last_name}`.trim() ||
            result.user.email,
          description: result.user.email,
          link: `/${locale}/workspace/${workspaceSlug}/settings/users`,
          type: ConsoleSearchItemType.User,
        };
      }
      break;
    default:
      return null;
  }

  return null;
}
