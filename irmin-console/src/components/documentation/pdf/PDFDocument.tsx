'use client';

import { Document, Link, Page, Text, View } from '@react-pdf/renderer';

import type { AIApplication } from '@/types/core/AIApplication';
import type { Connection } from '@/types/core/Connection';
import type { Repository } from '@/types/core/Repository';
import type { StoredScript } from '@/types/core/Script';
import type { StoredQuery } from '@/types/core/StoredQuery';
import type { Workflow } from '@/types/core/Workflow';

import { ownerText, tagsText } from './helpers';
import { MarkdownContent } from './markdownToPdf';
import { styles } from './styles';

interface WorkspaceStats {
  repositories: number;
  connections: number;
  workflows: number;
  scripts: number;
  queries: number;
  aiApplications: number;
  importWorkflows: number;
  exportWorkflows: number;
  actionWorkflows: number;
  pipelineWorkflows: number;
}

/** Props for the workspace overview PDF document. */
export interface DocumentationPDFProps {
  workspace: { name: string; slug: string };
  profile?: {
    first_name?: string;
    last_name?: string;
    email?: string;
    company?: string;
  } | null;
  locale: string;
  stats: WorkspaceStats;
  repositories: Repository[];
  connections: Connection[];
  workflows: Workflow[];
  scripts: StoredScript[];
  queries: StoredQuery[];
  aiApplications: AIApplication[];
  repositoryWorkflows: Map<
    string,
    { id: string; name: string; type: string }[]
  >;
  baseUrl: string;
}

/** Workspace overview PDF document rendered with @react-pdf/renderer. */
export default function PDFDocument({
  workspace,
  profile,
  locale,
  stats,
  repositories,
  connections,
  workflows,
  scripts,
  queries,
  aiApplications,
  repositoryWorkflows,
  baseUrl,
}: DocumentationPDFProps) {
  const repositoryNameBySlug = new Map(
    repositories.map((repo) => [repo.slug, repo.name])
  );
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

        {/* Summary */}
        <Text style={styles.sectionTitle}>Workspace summary</Text>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>
            {workspace.name}{' '}
            <Text style={styles.summarySlug}>({workspace.slug})</Text>
          </Text>

          <Text style={[styles.groupTitle, { marginTop: 12 }]}>Resources</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{stats.repositories}</Text>
              <Text style={styles.statLabel}>Repositories</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{stats.connections}</Text>
              <Text style={styles.statLabel}>Connections</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{stats.workflows}</Text>
              <Text style={styles.statLabel}>Workflows</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{stats.scripts}</Text>
              <Text style={styles.statLabel}>Scripts</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{stats.queries}</Text>
              <Text style={styles.statLabel}>Queries</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{stats.aiApplications}</Text>
              <Text style={styles.statLabel}>AI Applications</Text>
            </View>
          </View>

          <Text style={styles.groupTitle}>Workflows</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{stats.importWorkflows}</Text>
              <Text style={styles.statLabel}>Import</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{stats.exportWorkflows}</Text>
              <Text style={styles.statLabel}>Export</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{stats.actionWorkflows}</Text>
              <Text style={styles.statLabel}>Action</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{stats.pipelineWorkflows}</Text>
              <Text style={styles.statLabel}>Pipeline</Text>
            </View>
          </View>
        </View>

        {/* Repositories */}
        {repositories.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Repositories</Text>
            <Text style={styles.sectionDescription}>
              Ownership details, tags, and repository documentation.
            </Text>
            {repositories.map((repo) => {
              const relatedWfs = repositoryWorkflows.get(repo.slug) ?? [];
              return (
                <View key={repo.id} style={styles.card} wrap={false}>
                  <Link
                    src={`${baseUrl}/${locale}/workspace/${workspace.slug}/repositories/${repo.slug}`}
                    style={styles.cardTitle}
                  >
                    {repo.name}
                  </Link>
                  {repo.description && (
                    <Text style={styles.cardDescription}>
                      {repo.description}
                    </Text>
                  )}
                  <View style={styles.fieldRow}>
                    <Text style={styles.fieldLabel}>Owner</Text>
                    <Text style={styles.fieldValue}>
                      {ownerText(repo.owner)}
                    </Text>
                  </View>
                  <View style={styles.fieldRow}>
                    <Text style={styles.fieldLabel}>Default branch</Text>
                    <Text style={styles.fieldValue}>{repo.default_branch}</Text>
                  </View>
                  {tagsText(repo.tags) && (
                    <View style={styles.fieldRow}>
                      <Text style={styles.fieldLabel}>Tags</Text>
                      <Text style={styles.fieldValue}>
                        {tagsText(repo.tags)}
                      </Text>
                    </View>
                  )}
                  {relatedWfs.length > 0 && (
                    <View style={styles.fieldRow}>
                      <Text style={styles.fieldLabel}>Related workflows</Text>
                      <Text style={styles.fieldValue}>
                        {relatedWfs.map((w) => w.name).join(', ')}
                      </Text>
                    </View>
                  )}
                  {repo.documentation && repo.documentation.length > 0 && (
                    <View style={styles.notesSection}>
                      <Text style={styles.notesHeading}>Notes</Text>
                      <MarkdownContent content={repo.documentation} />
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Connections */}
        {connections.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Connections</Text>
            <Text style={styles.sectionDescription}>
              Connection ownership, connector types, tags, and documentation.
            </Text>
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
                {tagsText(conn.tags) && (
                  <View style={styles.fieldRow}>
                    <Text style={styles.fieldLabel}>Tags</Text>
                    <Text style={styles.fieldValue}>{tagsText(conn.tags)}</Text>
                  </View>
                )}
                {conn.documentation && conn.documentation.length > 0 && (
                  <View style={styles.notesSection}>
                    <Text style={styles.notesHeading}>Notes</Text>
                    <MarkdownContent content={conn.documentation} />
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Workflows */}
        {workflows.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Workflows</Text>
            <Text style={styles.sectionDescription}>
              Workflow ownership, status, tags, and related resources.
            </Text>
            {workflows.map((wf) => (
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
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>Scheduled</Text>
                  <Text style={styles.fieldValue}>
                    {wf.schedule?.triggers && wf.schedule.triggers.length > 0
                      ? 'Yes'
                      : 'Not scheduled'}
                  </Text>
                </View>
                {tagsText(wf.tags) && (
                  <View style={styles.fieldRow}>
                    <Text style={styles.fieldLabel}>Tags</Text>
                    <Text style={styles.fieldValue}>{tagsText(wf.tags)}</Text>
                  </View>
                )}
                {wf.documentation && wf.documentation.length > 0 && (
                  <View style={styles.notesSection}>
                    <Text style={styles.notesHeading}>Notes</Text>
                    <MarkdownContent content={wf.documentation} />
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Scripts */}
        {scripts.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Scripts</Text>
            <Text style={styles.sectionDescription}>
              Executable scripts for data processing and automation.
            </Text>
            {scripts.map((script) => (
              <View key={script.id} style={styles.card} wrap={false}>
                <Text
                  style={[
                    styles.cardTitle,
                    { textDecoration: 'none', color: '#111827' },
                  ]}
                >
                  {script.name}
                </Text>
                {script.description && (
                  <Text style={styles.cardDescription}>
                    {script.description}
                  </Text>
                )}
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>Language</Text>
                  <Text style={styles.fieldValue}>
                    {script.language ?? 'go'}
                  </Text>
                </View>
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>Owner</Text>
                  <Text style={styles.fieldValue}>
                    {ownerText(script.owner)}
                  </Text>
                </View>
                {tagsText(script.tags) && (
                  <View style={styles.fieldRow}>
                    <Text style={styles.fieldLabel}>Tags</Text>
                    <Text style={styles.fieldValue}>
                      {tagsText(script.tags)}
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* AI Applications */}
        {aiApplications.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>AI Applications</Text>
            <Text style={styles.sectionDescription}>
              AI Applications connected to this workspace, their data sources
              and custom tools.
            </Text>
            {aiApplications.map((app) => {
              const dataSourceSlugs = Array.from(
                new Set((app.data_sources ?? []).map((ds) => ds.repository))
              );
              const customTools = app.custom_tools ?? [];
              const storedQueryCount = customTools.filter(
                (t) => t.type === 'stored_query'
              ).length;
              const workflowToolCount = customTools.filter(
                (t) => t.type === 'workflow'
              ).length;
              const embeddingCount = customTools.filter(
                (t) => t.type === 'embedding_search'
              ).length;
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
                    <Text style={styles.fieldLabel}>Owner</Text>
                    <Text style={styles.fieldValue}>
                      {ownerText(app.owner)}
                    </Text>
                  </View>
                  <View style={styles.fieldRow}>
                    <Text style={styles.fieldLabel}>Data sources</Text>
                    <Text style={styles.fieldValue}>
                      {dataSourceSlugs.length === 0
                        ? 'None'
                        : dataSourceSlugs
                            .map(
                              (slug) => repositoryNameBySlug.get(slug) ?? slug
                            )
                            .join(', ')}
                    </Text>
                  </View>
                  <View style={styles.fieldRow}>
                    <Text style={styles.fieldLabel}>Custom tools</Text>
                    <Text style={styles.fieldValue}>
                      {storedQueryCount} stored queries, {workflowToolCount}{' '}
                      workflows, {embeddingCount} embedding searches
                    </Text>
                  </View>
                  <View style={styles.fieldRow}>
                    <Text style={styles.fieldLabel}>Access</Text>
                    <Text style={styles.fieldValue}>
                      {writeEnabled ? 'Read/Write' : 'Read only'}
                    </Text>
                  </View>
                  {tagsText(app.tags) && (
                    <View style={styles.fieldRow}>
                      <Text style={styles.fieldLabel}>Tags</Text>
                      <Text style={styles.fieldValue}>
                        {tagsText(app.tags)}
                      </Text>
                    </View>
                  )}
                  {app.documentation && app.documentation.length > 0 && (
                    <View style={styles.notesSection}>
                      <Text style={styles.notesHeading}>Notes</Text>
                      <MarkdownContent content={app.documentation} />
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Queries */}
        {queries.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Queries</Text>
            <Text style={styles.sectionDescription}>
              Saved SQL queries for data analysis and reporting.
            </Text>
            {queries.map((query) => (
              <View key={query.id} style={styles.card} wrap={false}>
                <Text
                  style={[
                    styles.cardTitle,
                    { textDecoration: 'none', color: '#111827' },
                  ]}
                >
                  {query.name}
                </Text>
                {query.description && (
                  <Text style={styles.cardDescription}>
                    {query.description}
                  </Text>
                )}
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>Owner</Text>
                  <Text style={styles.fieldValue}>
                    {ownerText(query.owner)}
                  </Text>
                </View>
                {tagsText(query.tags) && (
                  <View style={styles.fieldRow}>
                    <Text style={styles.fieldLabel}>Tags</Text>
                    <Text style={styles.fieldValue}>
                      {tagsText(query.tags)}
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
      </Page>
    </Document>
  );
}
