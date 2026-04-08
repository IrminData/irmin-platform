'use client';

import { pdf } from '@react-pdf/renderer';

import type { DocumentationPDFProps } from './pdf/PDFDocument';
import PDFDocument from './pdf/PDFDocument';
import type { SchemaPDFProps } from './pdf/PDFSchemaDocument';
import PDFSchemaDocument from './pdf/PDFSchemaDocument';

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Generate and download the Workspace Overview PDF.
 */
export async function downloadDocumentationPDF(
  props: DocumentationPDFProps & { filename: string }
) {
  const { filename, ...data } = props;
  const blob = await pdf(<PDFDocument {...data} />).toBlob();
  downloadBlob(blob, filename);
}

/**
 * Generate and download the Data Flows PDF.
 */
export async function downloadSchemaPDF(
  props: SchemaPDFProps & { filename: string }
) {
  const { filename, ...data } = props;
  const blob = await pdf(<PDFSchemaDocument {...data} />).toBlob();
  downloadBlob(blob, filename);
}
