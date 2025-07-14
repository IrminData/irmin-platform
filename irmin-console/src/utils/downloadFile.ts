/**
 * Function to download content as a file
 * @param content - Content to download
 * @param filename - Name of the downloaded file
 * @param mimeType - MIME type of the content
 */
export const downloadFile = (
  content: Blob | string,
  filename: string,
  mimeType: string
) => {
  const blob =
    typeof content === 'string'
      ? new Blob([content], { type: mimeType })
      : content;
  const url = URL.createObjectURL(blob);

  // Create an invisible anchor element to trigger download
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();

  // Cleanup
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
