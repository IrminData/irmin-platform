'use client';

import { useTheme } from 'next-themes';
import ReactDiffViewer from 'react-diff-viewer-continued';

/**
 * Component to display the difference between two texts
 */
const TextDiff = ({
  base,
  compare,
  splitView = true,
  hideLineNumbers = true,
  showDiffOnly = true,
}: {
  base?: string;
  compare?: string;
  splitView?: boolean;
  hideLineNumbers?: boolean;
  showDiffOnly?: boolean;
}) => {
  const { resolvedTheme } = useTheme();
  return (
    <ReactDiffViewer
      oldValue={base}
      newValue={compare}
      splitView={splitView}
      hideLineNumbers={hideLineNumbers}
      showDiffOnly={showDiffOnly}
      useDarkTheme={resolvedTheme === 'dark'}
    />
  );
};

export default TextDiff;
