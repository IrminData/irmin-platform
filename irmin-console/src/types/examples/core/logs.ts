import { getRandomDateTimeString } from '@/utils/getRandomDateTimeString';

import { LogEvent, LogEventType, WorkflowRunLogs } from '@/types/core/Log';

import { workspaceUsers } from './users';

/**
 * Example log events for testing
 * {@link LogEvent}
 */
export const logEvents: () => LogEvent[] = () => [
  {
    id: '1',
    type: LogEventType.CREATE,
    timestamp: getRandomDateTimeString(500, 'past', 60),
    description: 'Created a new workflow.',
    user: workspaceUsers()[0],
    workflow: 'management-data-from-excel',
  },
  {
    id: '2',
    type: LogEventType.UPDATE,
    timestamp: getRandomDateTimeString(500, 'past', 60),
    description: 'Workflow ran successfuly.',
    user: workspaceUsers()[0],
    workflow: 'management-data-from-excel',
  },
  {
    id: '3',
    type: LogEventType.ERROR,
    timestamp: getRandomDateTimeString(500, 'past', 60),
    description: 'Error occurred during workflow run.',
    user: workspaceUsers()[1],
  },
  {
    id: '4',
    type: LogEventType.WARNING,
    timestamp: getRandomDateTimeString(500, 'past', 60),
    description: 'Warning: Low disk space on the server.',
  },
  {
    id: '5',
    type: LogEventType.LOGIN,
    timestamp: getRandomDateTimeString(500, 'past', 60),
    description: 'User logged in successfully.',
    user: workspaceUsers()[2],
  },
  {
    id: '6',
    type: LogEventType.LOGOUT,
    timestamp: getRandomDateTimeString(500, 'past', 60),
    description: 'User logged out.',
    user: workspaceUsers()[1],
  },
  {
    id: '7',
    type: LogEventType.DELETE,
    timestamp: getRandomDateTimeString(500, 'past', 60),
    description: 'Deleted the document "Q1 Sales Report".',
  },
  {
    id: '8',
    type: LogEventType.UPDATE,
    timestamp: getRandomDateTimeString(500, 'past', 60),
    description: 'Updated workflow.',
    user: workspaceUsers()[1],
  },
  {
    id: '9',
    type: LogEventType.ERROR,
    timestamp: getRandomDateTimeString(500, 'past', 60),
    description: 'Error occurred during the backup process.',
  },
  {
    id: '10',
    type: LogEventType.CREATE,
    timestamp: getRandomDateTimeString(500, 'past', 60),
    description: 'Created a new folder "Accounting Reports".',
    user: workspaceUsers()[3],
  },
  {
    id: '11',
    type: LogEventType.WARNING,
    timestamp: getRandomDateTimeString(500, 'past', 60),
    description: 'Warning: High memory usage detected.',
  },
  {
    id: '12',
    type: LogEventType.CREATE,
    timestamp: getRandomDateTimeString(500, 'past', 60),
    description: 'Invited new user.',
    user: workspaceUsers()[0],
  },
];

export const workflowRunLogs: () => WorkflowRunLogs = () => ({
  logs: `
[1mRunning &quot;auth:google-analytics&quot; (auth) task [0m
[32m>> [39mAuthenticated successfully with Google Analytics API.
[32m>> [39mAccess token acquired.

[1mRunning &quot;fetch:google-analytics-data&quot; (fetch) task [0m
[32m>> [39mQuerying Google Analytics API for metrics and dimensions...
[32m>> [39mData fetched successfully from the date range 2024-08-01 to 2024-08-31.
Fetched 50,232 sessions, 3,100,421 page views, and 23,950 conversions.

[1mRunning &quot;process:analytics-data&quot; (process) task [0m
[32m>> [39mNormalizing Google Analytics data into structured format...
[32m>> [39mData processing completed successfully.
Processed 3,123,567 records.
[32m>> [39mDetected and removed 45 duplicate records.

[1mRunning &quot;validate:data-integrity&quot; (validate) task [0m
[33mWarning: Some discrepancies detected in page view count for session IDs. [39m
[32m>> [39mValidation completed, all other metrics match source data.

[1mRunning &quot;transform:to-irmin-schema&quot; (transform) task [0m
[32m>> [39mTransforming data into Irmin-compatible schema...
[32m>> [39mData transformation completed. Ready to push 3,123,522 records to Irmin.

[1mRunning &quot;push:irmin-database&quot; (push) task [0m
[32m>> [39mConnecting to Irmin database...
[32m>> [39mConnection successful.

[1mRunning &quot;push:irmin-database&quot; (push) task [0m
[32m>> [39mPushing data to Irmin...
[32m>> [39m3,123,522 records inserted successfully.

[1mRunning &quot;generate:summary-report&quot; (report) task [0m
[32m>> [39mGenerating report for processed data...
[32m>> [39mSummary report generated:
- Sessions: 50,232
- Page Views: 3,100,421
- Conversions: 23,950
- Processed Records: 3,123,522
- Warnings: 1

[1mRunning &quot;clean:temp-files&quot; (clean) task [0m
[32m>> [39mCleaning up temporary files...
[32m>> [39mRemoved 12 temporary files and cache.
[32m>> [39mClean up complete.

[1mRunning &quot;post-processing&quot; (post-process) task [0m
[33mWarning: Data integrity check encountered minor issues with 23 records. [39m
[33mProceeding with the next steps.

[1mRunning &quot;email:notifications&quot; (email) task [0m
[31mError: Failed to send email notifications. SMTP server not responding. [39m
[31mError code: 503 - Service unavailable.

[1mRunning &quot;retry:email-notifications&quot; (email) task [0m
[33mRetrying email notifications in 30 seconds... [39m
[32m>> [39mRetry succeeded. Email notifications sent to 5 recipients.
`,
});
