'use client';

import { useTheme } from 'next-themes';
import ReactDiffViewer from 'react-diff-viewer';

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
  const { theme } = useTheme();
  return (
    <ReactDiffViewer
      oldValue={base}
      newValue={compare}
      splitView={splitView}
      hideLineNumbers={hideLineNumbers}
      showDiffOnly={showDiffOnly}
      useDarkTheme={theme === 'dark'}
    />
  );
};

export default TextDiff;
