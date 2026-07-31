'use client';

import { Document, Link, Page, Text, View } from '@react-pdf/renderer';

import type { AIApplication } from '@/types/core/AIApplication';
import type { Connection } from '@/types/core/Connection';
import type { Repository } from '@/types/core/Repository';
import type { Workflow } from '@/types/core/Workflow';

import { ownerText } from './helpers';
import { styles } from './styles';

/** Props for the data flows PDF document. */
export interface SchemaPDFProps {
  workspace: { name: string; slug: string };
  profile?: {
    first_name?: string;
    last_name?: string;
    email?: string;
    company?: string;
  } | null;
  locale: string;
  workflows: Workflow[];
  connections: Connection[];
  repositories: Repository[];
  aiApplications: AIApplication[];
  connectionById: Map<string, Connection>;
  repositoryBySlug: Map<string, Repository>;
  baseUrl: string;
}

/** Data flows PDF document rendered with @react-pdf/renderer. */
export default function PDFSchemaDocument({
  workspace,
  profile,
  locale,
  workflows,
  connections,
  repositories,
  aiApplications,
  connectionById,
  repositoryBySlug,
  baseUrl,
}: SchemaPDFProps) {
  // Build workflow flow paths
  const workflowPaths = workflows
    .filter(
      (wf) =>
        wf.type === 'import' || wf.type === 'export' || wf.type === 'pipeline'
    )
    .map((wf) => {
      const w = wf.workflowable;
      const connId =
        w && 'connection_id' in w ? (w.connection_id as string) : undefined;
      const repoSlug =
        w && 'repository' in w ? (w.repository as string) : undefined;
      const conn = connId ? connectionById.get(connId) : undefined;
      const repo = repoSlug ? repositoryBySlug.get(repoSlug) : undefined;
      return { workflow: wf, connection: conn, repository: repo };
    });

  // Count workflow usage per connection/repository
  const connectionUsage = new Map<string, number>();
  const repoUsage = new Map<string, number>();
  for (const wf of workflows) {
    const w = wf.workflowable;
    if (w && 'connection_id' in w && w.connection_id) {
      const id = w.connection_id as string;
      connectionUsage.set(id, (connectionUsage.get(id) ?? 0) + 1);
    }
    if (w && 'repository' in w && w.repository) {
      const slug = w.repository as string;
      repoUsage.set(slug, (repoUsage.get(slug) ?? 0) + 1);
    }
  }

  return (
    <Document>
      <Page size='A4' style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logoText}>IRMIN</Text>
          {profile && (
            <Text style={styles.headerMeta}>
              Created by: {ownerText(profile)}
            </Text>
          )}
          <Text style={styles.headerMeta}>
            {new Date().toLocaleString(locale ?? 'en')}
          </Text>
        </View>

        {/* Data Flows */}
        <Text style={styles.sectionTitle}>Data flows</Text>
        <Text style={styles.sectionDescription}>
          How connections, workflows, and repositories relate to each other.
        </Text>

        {workflowPaths.map(
          ({ workflow: wf, connection: conn, repository: repo }) => (
            <View key={wf.id} style={styles.card} wrap={false}>
              <Link
                src={`${baseUrl}/${locale}/workspace/${workspace.slug}/workflows/${wf.id}`}
                style={styles.cardTitle}
              >
                {wf.name}
              </Link>
              {wf.description && (
                <Text style={styles.cardDescription}>{wf.description}</Text>
              )}
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Type</Text>
                <Text style={styles.fieldValue}>
                  {wf.type
                    ? wf.type.charAt(0).toUpperCase() + wf.type.slice(1)
                    : ''}
                </Text>
              </View>
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Status</Text>
                <Text style={styles.fieldValue}>{wf.status ?? ''}</Text>
              </View>
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Owner</Text>
                <Text style={styles.fieldValue}>{ownerText(wf.owner)}</Text>
              </View>
              {/* Flow chain — direction depends on workflow type */}
              <View style={[styles.flowChain, { marginTop: 8 }]}>
                {wf.type === 'export' ? (
                  <>
                    {repo && (
                      <>
                        <Text style={styles.flowNode}>{repo.name}</Text>
                        <Text style={styles.flowArrow}>{'\u2192'}</Text>
                      </>
                    )}
                    <Text style={styles.flowNode}>{wf.name}</Text>
                    {conn && (
                      <>
                        <Text style={styles.flowArrow}>{'\u2192'}</Text>
                        <Text style={styles.flowNode}>{conn.name}</Text>
                        <Text style={styles.flowArrow}>{'\u2192'}</Text>
                        <Text style={styles.flowNode}>
                          {conn.connector?.name ?? 'Connector'}
                        </Text>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    {conn && (
                      <>
                        <Text style={styles.flowNode}>
                          {conn.connector?.name ?? 'Connector'}
                        </Text>
                        <Text style={styles.flowArrow}>{'\u2192'}</Text>
                        <Text style={styles.flowNode}>{conn.name}</Text>
                        <Text style={styles.flowArrow}>{'\u2192'}</Text>
                      </>
                    )}
                    <Text style={styles.flowNode}>{wf.name}</Text>
                    {repo && (
                      <>
                        <Text style={styles.flowArrow}>{'\u2192'}</Text>
                        <Text style={styles.flowNode}>{repo.name}</Text>
                      </>
                    )}
                  </>
                )}
              </View>
            </View>
          )
        )}

        {/* AI Application Flows */}
        {aiApplications.length > 0 && (
          <View>
            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>
              AI Application flows
            </Text>
            <Text style={styles.sectionDescription}>
              Which AI Applications read from which repositories.
            </Text>
            {aiApplications.map((app) => {
              const slugs = Array.from(
                new Set((app.data_sources ?? []).map((ds) => ds.repository))
              );
              const writeEnabled = app.tools?.write_enabled ?? false;
              return (
                <View key={app.id} style={styles.card} wrap={false}>
                  <Link
                    src={`${baseUrl}/${locale}/workspace/${workspace.slug}/ai-applications/${app.id}`}
                    style={styles.cardTitle}
                  >
                    {app.name}
                  </Link>
                  {app.description && (
                    <Text style={styles.cardDescription}>
                      {app.description}
                    </Text>
                  )}
                  <View style={styles.fieldRow}>
                    <Text style={styles.fieldLabel}>Access</Text>
                    <Text style={styles.fieldValue}>
                      {writeEnabled ? 'Read/Write' : 'Read only'}
                    </Text>
                  </View>
                  <View style={styles.fieldRow}>
                    <Text style={styles.fieldLabel}>Owner</Text>
                    <Text style={styles.fieldValue}>
                      {ownerText(app.owner)}
                    </Text>
                  </View>
                  <View style={[styles.flowChain, { marginTop: 8 }]}>
                    {slugs.length === 0 ? (
                      <Text style={styles.flowNode}>No data sources</Text>
                    ) : (
                      <>
                        {slugs.map((slug, idx) => {
                          const repo = repositoryBySlug.get(slug);
                          return (
                            <View
                              key={`${app.id}-${slug}`}
                              style={{ flexDirection: 'row' }}
                            >
                              <Text style={styles.flowNode}>
                                {repo?.name ?? slug}
                              </Text>
                              {idx < slugs.length - 1 ? (
                                <Text style={styles.flowNode}>, </Text>
                              ) : null}
                            </View>
                          );
                        })}
                        <Text style={styles.flowArrow}>{'\u2192'}</Text>
                        <Text style={styles.flowNode}>{app.name}</Text>
                      </>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Component Directory */}
        <Text style={[styles.sectionTitle, { marginTop: 32 }]}>
          Component directory
        </Text>

        {/* Repositories */}
        {repositories.length > 0 && (
          <View>
            <Text style={styles.groupTitle}>Repositories</Text>
            {repositories.map((repo) => (
              <View key={repo.id} style={styles.card} wrap={false}>
                <Link
                  src={`${baseUrl}/${locale}/workspace/${workspace.slug}/repositories/${repo.slug}`}
                  style={styles.cardTitle}
                >
                  {repo.name}
                </Link>
                {repo.description && (
                  <Text style={styles.cardDescription}>{repo.description}</Text>
                )}
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>Owner</Text>
                  <Text style={styles.fieldValue}>{ownerText(repo.owner)}</Text>
                </View>
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>Used by</Text>
                  <Text style={styles.fieldValue}>
                    {repoUsage.get(repo.slug) ?? 0} workflows
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Connections */}
        {connections.length > 0 && (
          <View>
            <Text style={styles.groupTitle}>Connections</Text>
            {connections.map((conn) => (
              <View key={conn.id} style={styles.card} wrap={false}>
                <Link
                  src={`${baseUrl}/${locale}/workspace/${workspace.slug}/connections/${conn.id}`}
                  style={styles.cardTitle}
                >
                  {conn.name}
                </Link>
                {conn.description && (
                  <Text style={styles.cardDescription}>{conn.description}</Text>
                )}
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>Connector</Text>
                  <Text style={styles.fieldValue}>
                    {conn.connector?.name ?? ''}
                  </Text>
                </View>
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>Owner</Text>
                  <Text style={styles.fieldValue}>{ownerText(conn.owner)}</Text>
                </View>
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>Used by</Text>
                  <Text style={styles.fieldValue}>
                    {connectionUsage.get(conn.id) ?? 0} workflows
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* AI Applications */}
        {aiApplications.length > 0 && (
          <View>
            <Text style={styles.groupTitle}>AI Applications</Text>
            {aiApplications.map((app) => {
              const slugs = Array.from(
                new Set((app.data_sources ?? []).map((ds) => ds.repository))
              );
              return (
                <View key={app.id} style={styles.card} wrap={false}>
                  <Link
                    src={`${baseUrl}/${locale}/workspace/${workspace.slug}/ai-applications/${app.id}`}
                    style={styles.cardTitle}
                  >
                    {app.name}
                  </Link>
                  {app.description && (
                    <Text style={styles.cardDescription}>
                      {app.description}
                    </Text>
                  )}
                  <View style={styles.fieldRow}>
                    <Text style={styles.fieldLabel}>Owner</Text>
                    <Text style={styles.fieldValue}>
                      {ownerText(app.owner)}
                    </Text>
                  </View>
                  <View style={styles.fieldRow}>
                    <Text style={styles.fieldLabel}>Consumes</Text>
                    <Text style={styles.fieldValue}>
                      {slugs.length} repositories
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </Page>
    </Document>
  );
}
