'use client';

import { Document, Link, Page, Text, View } from '@react-pdf/renderer';

import type { Dictionary } from '@/lib/dict';

import type { AIApplication } from '@/types/core/AIApplication';
import type { Connection } from '@/types/core/Connection';
import type { Repository } from '@/types/core/Repository';
import type { StoredScript } from '@/types/core/Script';
import type { StoredQuery } from '@/types/core/StoredQuery';
import type { Workflow } from '@/types/core/Workflow';

import {
  formatPDFNumber,
  ownerText,
  tagsText,
  workflowTypeText,
} from './helpers';
import { MarkdownContent } from './markdownToPdf';
import { PDF_COLORS, styles } from './styles';

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
  dict: Dictionary;
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
  dict,
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
          <Text style={styles.logoText}>Irmin</Text>
          {profile && (
            <Text style={styles.headerMeta}>
              {dict.catalog.createdBy}: {ownerText(profile)}
            </Text>
          )}
          <Text style={styles.headerMeta}>
            {new Date().toLocaleString(locale ?? 'en')}
          </Text>
        </View>

        {/* Summary */}
        <Text style={styles.sectionTitle}>{dict.catalog.summaryTitle}</Text>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>
            {workspace.name}{' '}
            <Text style={styles.summarySlug}>({workspace.slug})</Text>
          </Text>

          <Text style={[styles.groupTitle, { marginTop: 12 }]}>
            {dict.common.resources}
          </Text>
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>
                {formatPDFNumber(stats.repositories, locale)}
              </Text>
              <Text style={styles.statLabel}>
                {dict.repository.repositories}
              </Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>
                {formatPDFNumber(stats.connections, locale)}
              </Text>
              <Text style={styles.statLabel}>
                {dict.connections.connections}
              </Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>
                {formatPDFNumber(stats.workflows, locale)}
              </Text>
              <Text style={styles.statLabel}>{dict.workflow.workflows}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>
                {formatPDFNumber(stats.scripts, locale)}
              </Text>
              <Text style={styles.statLabel}>
                {dict.consoleNavigation.scripts}
              </Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>
                {formatPDFNumber(stats.queries, locale)}
              </Text>
              <Text style={styles.statLabel}>{dict.query.queries}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>
                {formatPDFNumber(stats.aiApplications, locale)}
              </Text>
              <Text style={styles.statLabel}>
                {dict.consoleNavigation.aiApplications}
              </Text>
            </View>
          </View>

          <Text style={styles.groupTitle}>{dict.workflow.workflows}</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>
                {formatPDFNumber(stats.importWorkflows, locale)}
              </Text>
              <Text style={styles.statLabel}>{dict.workflow.import}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>
                {formatPDFNumber(stats.exportWorkflows, locale)}
              </Text>
              <Text style={styles.statLabel}>{dict.workflow.export}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>
                {formatPDFNumber(stats.actionWorkflows, locale)}
              </Text>
              <Text style={styles.statLabel}>{dict.workflow.action}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>
                {formatPDFNumber(stats.pipelineWorkflows, locale)}
              </Text>
              <Text style={styles.statLabel}>
                {dict.workflow.pipeline.pipeline}
              </Text>
            </View>
          </View>
        </View>

        {/* Repositories */}
        {repositories.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>
              {dict.repository.repositories}
            </Text>
            <Text style={styles.sectionDescription}>
              {dict.catalog.repositorySectionDescription}
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
                    <Text style={styles.fieldLabel}>{dict.common.owner}</Text>
                    <Text style={styles.fieldValue}>
                      {ownerText(repo.owner)}
                    </Text>
                  </View>
                  <View style={styles.fieldRow}>
                    <Text style={styles.fieldLabel}>
                      {dict.catalog.defaultBranch}
                    </Text>
                    <Text style={styles.fieldValue}>{repo.default_branch}</Text>
                  </View>
                  {tagsText(repo.tags) && (
                    <View style={styles.fieldRow}>
                      <Text style={styles.fieldLabel}>{dict.common.tags}</Text>
                      <Text style={styles.fieldValue}>
                        {tagsText(repo.tags)}
                      </Text>
                    </View>
                  )}
                  {relatedWfs.length > 0 && (
                    <View style={styles.fieldRow}>
                      <Text style={styles.fieldLabel}>
                        {dict.catalog.relatedWorkflows}
                      </Text>
                      <Text style={styles.fieldValue}>
                        {relatedWfs.map((w) => w.name).join(', ')}
                      </Text>
                    </View>
                  )}
                  {repo.documentation && repo.documentation.length > 0 && (
                    <View style={styles.notesSection}>
                      <Text style={styles.notesHeading}>
                        {dict.catalog.notesHeading}
                      </Text>
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
            <Text style={styles.sectionTitle}>
              {dict.connections.connections}
            </Text>
            <Text style={styles.sectionDescription}>
              {dict.catalog.connectionSectionDescription}
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
                  <Text style={styles.fieldLabel}>
                    {dict.connectors.connector}
                  </Text>
                  <Text style={styles.fieldValue}>
                    {conn.connector?.name ?? ''}
                  </Text>
                </View>
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>{dict.common.owner}</Text>
                  <Text style={styles.fieldValue}>{ownerText(conn.owner)}</Text>
                </View>
                {tagsText(conn.tags) && (
                  <View style={styles.fieldRow}>
                    <Text style={styles.fieldLabel}>{dict.common.tags}</Text>
                    <Text style={styles.fieldValue}>{tagsText(conn.tags)}</Text>
                  </View>
                )}
                {conn.documentation && conn.documentation.length > 0 && (
                  <View style={styles.notesSection}>
                    <Text style={styles.notesHeading}>
                      {dict.catalog.notesHeading}
                    </Text>
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
            <Text style={styles.sectionTitle}>{dict.workflow.workflows}</Text>
            <Text style={styles.sectionDescription}>
              {dict.catalog.workflowSectionDescription}
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
                  <Text style={styles.fieldLabel}>
                    {dict.catalog.pdfTypeLabel}
                  </Text>
                  <Text style={styles.fieldValue}>
                    {workflowTypeText(wf.type, dict)}
                  </Text>
                </View>
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>{dict.list.status}</Text>
                  <Text style={styles.fieldValue}>{wf.status ?? ''}</Text>
                </View>
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>{dict.common.owner}</Text>
                  <Text style={styles.fieldValue}>{ownerText(wf.owner)}</Text>
                </View>
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>
                    {dict.catalog.scheduleLabel}
                  </Text>
                  <Text style={styles.fieldValue}>
                    {wf.schedule?.triggers && wf.schedule.triggers.length > 0
                      ? dict.workflow.scheduled
                      : dict.workflow.notScheduled}
                  </Text>
                </View>
                {tagsText(wf.tags) && (
                  <View style={styles.fieldRow}>
                    <Text style={styles.fieldLabel}>{dict.common.tags}</Text>
                    <Text style={styles.fieldValue}>{tagsText(wf.tags)}</Text>
                  </View>
                )}
                {wf.documentation && wf.documentation.length > 0 && (
                  <View style={styles.notesSection}>
                    <Text style={styles.notesHeading}>
                      {dict.catalog.notesHeading}
                    </Text>
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
            <Text style={styles.sectionTitle}>
              {dict.consoleNavigation.scripts}
            </Text>
            <Text style={styles.sectionDescription}>
              {dict.catalog.scriptSectionDescription}
            </Text>
            {scripts.map((script) => (
              <View key={script.id} style={styles.card} wrap={false}>
                <Text
                  style={[
                    styles.cardTitle,
                    { textDecoration: 'none', color: PDF_COLORS.ink },
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
                  <Text style={styles.fieldLabel}>
                    {dict.catalog.pdfLanguageLabel}
                  </Text>
                  <Text style={styles.fieldValue}>
                    {script.language ?? 'go'}
                  </Text>
                </View>
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>{dict.common.owner}</Text>
                  <Text style={styles.fieldValue}>
                    {ownerText(script.owner)}
                  </Text>
                </View>
                {tagsText(script.tags) && (
                  <View style={styles.fieldRow}>
                    <Text style={styles.fieldLabel}>{dict.common.tags}</Text>
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
            <Text style={styles.sectionTitle}>
              {dict.consoleNavigation.aiApplications}
            </Text>
            <Text style={styles.sectionDescription}>
              {dict.catalog.aiApplicationSectionDescription}
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
                    <Text style={styles.fieldLabel}>{dict.common.owner}</Text>
                    <Text style={styles.fieldValue}>
                      {ownerText(app.owner)}
                    </Text>
                  </View>
                  <View style={styles.fieldRow}>
                    <Text style={styles.fieldLabel}>
                      {dict.catalog.aiApplicationDataSources}
                    </Text>
                    <Text style={styles.fieldValue}>
                      {dataSourceSlugs.length === 0
                        ? dict.catalog.aiApplicationNoDataSources
                        : dataSourceSlugs
                            .map(
                              (slug) => repositoryNameBySlug.get(slug) ?? slug
                            )
                            .join(', ')}
                    </Text>
                  </View>
                  <View style={styles.fieldRow}>
                    <Text style={styles.fieldLabel}>
                      {dict.catalog.aiApplicationCustomTools}
                    </Text>
                    <Text style={styles.fieldValue}>
                      {dict.catalog.aiApplicationCustomToolsBreakdown
                        .replace(
                          '{storedQueries}',
                          formatPDFNumber(storedQueryCount, locale)
                        )
                        .replace(
                          '{workflows}',
                          formatPDFNumber(workflowToolCount, locale)
                        )
                        .replace(
                          '{embeddings}',
                          formatPDFNumber(embeddingCount, locale)
                        )}
                    </Text>
                  </View>
                  <View style={styles.fieldRow}>
                    <Text style={styles.fieldLabel}>
                      {dict.catalog.pdfAccessLabel}
                    </Text>
                    <Text style={styles.fieldValue}>
                      {writeEnabled
                        ? dict.catalog.aiApplicationWriteEnabled
                        : dict.catalog.aiApplicationReadOnly}
                    </Text>
                  </View>
                  {tagsText(app.tags) && (
                    <View style={styles.fieldRow}>
                      <Text style={styles.fieldLabel}>{dict.common.tags}</Text>
                      <Text style={styles.fieldValue}>
                        {tagsText(app.tags)}
                      </Text>
                    </View>
                  )}
                  {app.documentation && app.documentation.length > 0 && (
                    <View style={styles.notesSection}>
                      <Text style={styles.notesHeading}>
                        {dict.catalog.notesHeading}
                      </Text>
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
            <Text style={styles.sectionTitle}>{dict.query.queries}</Text>
            <Text style={styles.sectionDescription}>
              {dict.catalog.querySectionDescription}
            </Text>
            {queries.map((query) => (
              <View key={query.id} style={styles.card} wrap={false}>
                <Text
                  style={[
                    styles.cardTitle,
                    { textDecoration: 'none', color: PDF_COLORS.ink },
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
                  <Text style={styles.fieldLabel}>{dict.common.owner}</Text>
                  <Text style={styles.fieldValue}>
                    {ownerText(query.owner)}
                  </Text>
                </View>
                {tagsText(query.tags) && (
                  <View style={styles.fieldRow}>
                    <Text style={styles.fieldLabel}>{dict.common.tags}</Text>
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
