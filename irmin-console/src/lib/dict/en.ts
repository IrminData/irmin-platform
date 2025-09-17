/**
 * English dictionary, key-value pairs for static strings in the application
 */
const en = {
  // === CORE APPLICATION ===
  common: {
    // Basic actions
    loading: 'Loading...',
    cancel: 'Cancel',
    confirm: 'Confirm',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    view: 'View',
    create: 'Create',
    update: 'Update',
    add: 'Add',
    remove: 'Remove',
    upload: 'Upload',
    download: 'Download',
    back: 'Back',
    next: 'Next',
    previous: 'Previous',
    close: 'Close',
    open: 'Open',
    refresh: 'Refresh',
    tryAgain: 'Try again',

    // Search and navigation
    search: 'Search',
    filters: 'Filters',
    noResults: 'No results',
    loadMore: 'Load more',
    selectAll: 'Select All',

    // Status and feedback
    success: 'Success',
    error: 'Error',
    info: 'Info',
    yes: 'Yes',
    no: 'No',

    // Content
    name: 'Name',
    description: 'Description',
    email: 'Email',
    message: 'Message',
    overview: 'Overview',
    actions: 'Actions',
    logs: 'Logs',
    timestamp: 'Timestamp',
    lastModified: 'Last modified',
    size: 'Size',
    color: 'Color',

    // Forms
    fieldRequired: 'This field is required',
    fieldInvalid: 'This field is invalid',
    resetForm: 'Clear form',
    pleaseFixErrors: 'Please fix the errors above',
    messagePlaceholder: 'Write your message here...',

    // Messages and alerts
    insufficientPermissions: 'Insufficient permissions',
    ohNo: 'Oh no!',
    pageNotFound: 'Page not found',
    somethingWentWrong: 'Something went wrong',
    weEncounteredError: 'We encountered an error',
    tryAgainOrContactSupport: 'Please try again or contact support',
    goBackHome: 'Go back to the home page',
    goBackConsole: 'Go back to Irmin Console',
    noOptionsMessage: 'No options',
    downloadSuccess: 'Download successful',
    dangerZone: 'Danger zone',

    // Confirmations
    areYouSureYouWantToDelete: 'Are you sure you want to delete this item?',
    areYouSureYouWantToTransferOwnership:
      'Are you sure you want to transfer the ownership of this item?',

    // Contact and support
    contactUs: 'Contact Us',
    readMore: 'Read more',

    // Language and localization
    selectLanguage: 'Select language',
  },

  // === USER INTERFACE ===
  theme: {
    toggle: 'Toggle theme',
    light: 'Light',
    dark: 'Dark',
    system: 'System',
  },

  search: {
    advancedSearch: 'Advanced search',
    searchDescription:
      'Search across repositories, workflows, connections, and more',
    searchPlaceholder: 'Search for anything...',
    contentTypes: 'Content Types',
    fromDate: 'From Date',
    toDate: 'To Date',
    resultsPerPage: 'Results per page',
    noResultsFound: 'No results found',
    tryAdjustingFilters: 'Try adjusting your search terms or filters',
    startSearching: 'Start searching',
    startSearchingDescription:
      'Enter a search term above to find repositories, workflows, connections, and more',
    searchingText: 'Searching...',
    resultsFoundFor: 'results found for',
    resultFoundFor: 'result found for',
  },

  // === NAVIGATION ===
  consoleNavigation: {
    searchPlaceholder: 'Search for data and more',
    irmin: 'Irmin',
    irminConsole: 'Irmin Console',
    irminWebsite: 'Irmin Website',
    workspace: 'Workspace',
    workspaces: 'Workspaces',
    settings: 'Settings',
    usefulLinks: 'Useful links',
    editor: 'Editor',
    queries: 'Queries',
    workspaceSettings: 'Workspace',
    goToWebsite: 'Go to website',
    myProfile: 'My Profile',
    signOut: 'Sign out',
    guides: 'Guides',
    contactSupport: 'Contact our team',
    developerDocs: 'Developer Docs',
    termsAndPrivacy: 'Terms & Privacy',

    staticSearchItems: {
      guides: 'Irmin Guides',
      documentation: 'Irmin Documentation',
      termsAndPrivacy: 'Terms of Use & Privacy Policy',
      createWorkspace: 'Create new workspace',
      workspaceDocumentation: 'Workspace Documentation',
      myProfile: 'My Profile',
      manageWorkspaces: 'Manage Workspaces',
      editor: 'Editor',
      workspaceSettings: 'Workspace settings',
      createWorkflow: 'Create new workflow',
      createConnection: 'Create new connection',
      createRepository: 'Create new repository',

      description: {
        irminWebsite: 'Go to the Irmin website',
        contactUs: 'Contact our team',
        guides: 'Read the Irmin guides',
        documentation: 'Read the Irmin documentation',
        termsAndPrivacy: 'Read the terms and privacy policy',
        createWorkspace: 'Create a new workspace on Irmin',
        logs: 'View logs of your current workspace',
        workspaceDocumentation: 'View workspace documentation',
        myProfile: 'View and edit your profile',
        manageWorkspaces: 'Manage your workspaces',
        editor: 'Write and run scripts',
        workspaceSettings: 'Edit workspace settings',
        workflows: 'View and manage workflows',
        actions: 'View and manage action workflows',
        imports: 'View and manage import workflows',
        exports: 'View and manage export workflows',
        pipelines: 'View and manage pipeline workflows',
        createWorkflow: 'Create a new workflow of any type',
        connections: 'View and manage connections',
        createConnection: 'Create a new connection to use in your workflows',
        repositories: 'View and manage repositories',
        createRepository: 'Create a new repository to store your data',
      },
    },
  },

  // === WORKSPACE ===
  workspace: {
    general: 'General',
    users: 'Users',
    policies: 'Policies',
    invites: 'Invites',
    tags: 'Tags',
    billing: 'Billing',
    deletionWarning:
      'Are you sure you want to delete this workspace? This action cannot be undone and will remove all data associated with this workspace.',
    generalSettings: 'General Settings',
    workspaceName: 'Workspace Name',
    workspaceDescription: 'Workspace Description',
    noWorkspaceDescription: 'No description provided',
    saveChanges: 'Save Changes',
    deletionNote:
      'Deleting your workspace will remove all data associated with it. This action is irreversible.',
    deleteWorkspace: 'Delete Workspace',
    billingSettings: 'Billing Settings',
    billingNote:
      'You can currently only manage billing by contacting our team.',
    addTags: 'Add tags',
    failedToLoadTags: 'Failed to load tags',
    failedToLoadWorkspaces: 'Failed to load workspaces',
    member: 'member',
    members: 'members',
    noMembersYet: 'No members yet',
  },

  workspaceSwitcher: {
    manageWorkspaces: 'Manage Workspaces',
    selectWorkspace: 'Select a workspace',
    createNewWorkspace: 'Create new workspace',
    createFirstWorkspace: 'Create your first workspace',
    createFirstWorkspaceDescription:
      'Workspaces help you organize your data, workflows, and team collaboration. Get started by creating your first workspace.',
    workspace: 'Workspace',
    leaveWorkspace: 'Leave workspace',
    leaveWorkspaceConfirm: 'Are you sure you want to leave this workspace?',
  },

  consoleHome: {
    welcomeToWorkspace: 'Get started on Irmin with these quick actions:',
    createNewConnection: 'Create new connection',
    createNewConnectionDescription:
      'Connect a new data source or export destination for your workspace',
    runScriptOnData: 'Run script on data',
    runScriptOnDataDescription:
      'Write and run scripts on your data to automate tasks or find insights',
    setupWorkflow: 'Setup a workflow',
    setupWorkflowDescription:
      'Automate data tasks with workflows. Data ingestion, transformation, and export',
    browseRepositories: 'Data and repositories',
    browseRepositoriesDescription:
      'Browse, query, and manage your data, in a Git-like environment',
  },

  // === DATA MANAGEMENT ===
  repository: {
    repository: 'Repository',
    repositories: 'Repositories',
    sqlQuery: 'SQL Query',
    runQuery: 'Run query',
    createNewRepository: 'Create new repository',
    immutableWarning: 'Immutable repository or branch',
    immutableWarningDescription:
      'Current repository or selected branch are immutable and cannot be edited.',

    branches: {
      branches: 'Branches',
      currentBranch: 'Current',
      branch: 'Branch',
      ref: 'Ref',
      createBranch: 'Create branch',
      primary: 'Primary',
      primaryBranch: 'Primary branch',
      newBranchName: 'New branch name',
      fromBranch: 'From branch',
      confirmDeleteBranch: 'Are you sure you want to delete this branch?',
    },

    tags: {
      tag: 'Tag',
      tags: 'Tags',
      tagDescription: 'A tag is an immutable pointer to a single commit.',
      createTag: 'Create tag',
      newTagName: 'New tag name',
      fromCommit: 'From commit',
      confirmDeleteTag: 'Are you sure you want to delete this tag?',
      currentlyViewing: 'Currently viewing',
    },

    commit: {
      commits: 'Commits',
      commitHash: 'Commit hash',
      copyHash: 'Copy hash',
      commitHashCopied: 'Commit hash copied to clipboard',
      uncommittedChanges: 'Uncommitted changes',
      showingUncommittedChangesFor: 'Showing uncommitted changes for',
      commitChanges: 'Commit changes',
      revertChanges: 'Revert changes',
      confirmRevertChanges:
        'Are you sure you want to revert all uncommitted changes?',
      noUncommittedChanges: 'There are no uncommitted changes',
      noUncommittedChangesDescription:
        'To compare changes, you need to have uncommitted changes in the current branch',
      commitNewChangesTo: 'Commit new changes to',
      commitMessage: 'Commit message',
      commitMessagePlaceholder: 'Describe your changes',
    },

    compare: {
      compare: 'Compare',
      switchDirection: 'Switch direction',
      baseBranch: 'Base branch',
      compareBranch: 'Compare to branch',
      merge: 'Merge',
      into: 'into',
      comparing: 'Comparing',
      and: 'and',
      bytes: 'bytes',
      modified: 'modified',
      moved: 'moved',
      conflict: 'conflict',
      hideChanges: 'Hide changes',
      fetchChanges: 'Fetch changes',
      thereIsNothingToCompare: 'There is nothing to compare or merge',
      thereIsNothingToCompareSubtitle:
        'You need to use two different sources to get a valid comparison.',
      baseContent: 'Base content',
      comparedContent: 'Compared content',
      mergeStrategy: 'Merge strategy',
      squashCommits: 'Squash commits',
      mergeCommitDescription: 'Merge commit description',
      defaultStrategy: 'Default',
      destWinsStrategy: 'Destination wins',
      sourceWinsStrategy: 'Source wins',
      mergeExplanation:
        'In case of a merge conflict, this option will force the merge process to automatically favour changes from the base ("Destination wins") or from the comparison ("Source wins"). In case no selection is made, the merge process will fail in case of a conflict.',
    },

    objects: {
      object: 'Object',
      objects: 'Objects',
      noObjects: 'No objects found',
      noObjectsMessage:
        'Start by uploading files or create a workflow to populate this repository.',
      uploadObject: 'Upload object',
      path: 'Path',
      currentPath: 'Current path',
      currentName: 'Current name',
      type: 'Type',
      contentType: 'Content-Type',
      view: 'View',
      unsupportedContentType: 'Unsupported content type',
      contentUnavailable: 'Object content unavailable',
      viewSchema: 'View schema',
      filterObjects: 'Filter objects',
      uploadAndReplace: 'Upload and replace',
      moveOrRename: 'Move or rename',
      changeHistory: 'Change history',
      targetRepository: 'Target repository',
      targetBranch: 'Target branch',
      objectName: 'Object name',
      fileToUpload: 'File to upload',
      pathInRepository: 'Path in the repository',
      noFilesSelected: 'Select files to upload before submitting',
      binary: 'Binary',
      group: 'Group',
      structured: 'Structured',
      children: 'Children',
      hideChildren: 'Hide children',
      showChildren: 'Show children',
      unknownType: 'Unknown type',
      hideSchema: 'Hide schema',
      showSchema: 'Show schema',
      enterPath: 'Enter repository path (e.g. path/to/file.json)',
      newObjectWillBeCreated: 'New object will be created',
    },

    settings: {
      deletionNote:
        'Deleting this repository will remove all data associated with it. This action is irreversible.',
      deleteRepository: 'Delete repository',
    },

    schema: {
      schema: 'Schema',
      noSchema: 'No schema available',
    },
  },

  // === CONNECTIONS ===
  connections: {
    connection: 'Connection',
    connections: 'Connections',

    settings: {
      title: 'Connection settings',
      saveChanges: 'Save changes',
      deletionNote:
        'Deleting this connection will remove all data associated with it. This action is irreversible.',
      delete: 'Delete connection',
      areYouSureYouWantToDelete:
        'Are you sure you want to delete this connection?',
    },

    create: {
      selectConnector: 'Select a connector',
      establishConnection: 'Establish connection',
      configureSettings: 'Configure settings',
      configureConnection: 'Configure connection',
      createNewConnection: 'Create new connection',
      pleaseSelectConnector: 'Please select a connector to continue.',
      confirmConnectorSelection: 'Confirm connector selection and continue',
      selectedConnector: 'Selected connector',
      categoryAll: 'All',
      connectionName: 'Connection name',
      connectionNamePlaceholder: 'eg. My Google Analytics connection',
      connectionDescription: 'Connection description',
      connectionDescriptionPlaceholder:
        'Enter a description for the connection, so you can remember what it is used for',
      addCustomConnector: 'Add custom connector',
      continueAndTest: 'Continue & test connection',
      createConnection: 'Create connection',
      continue: 'Continue',
      goBack: 'Go back',
      success: 'Connection successful',
      failed: 'Connection failed',
      configuration_valid: 'Connection configuration valid',
      configuration_invalid: 'Connection configuration invalid',
      contactSupport: 'Contact support',
      requiredFieldsMissing: 'Required fields are missing',
    },
  },

  connectors: {
    connector: 'Connector',
    connectors: 'Connectors',
    version: 'Version',
    author: 'Author',
    authorEmail: 'Author email',
    categories: 'Categories',
    capabilities: 'Capabilities',
    locales: 'Locales',
  },

  // === WORKFLOWS ===
  workflow: {
    workflows: 'Workflows',
    importWorkflows: 'Import workflows',
    actionWorkflows: 'Action workflows',
    exportWorkflows: 'Export workflows',
    pipelineWorkflows: 'Pipeline workflows',
    actions: 'Actions',
    imports: 'Imports',
    exports: 'Exports',
    pipelines: 'Pipelines',
    triggerRun: 'Trigger workflow run',
    triggeringRun: 'Triggering run',
    workflow: 'Workflow',
    import: 'Import',
    action: 'Action',
    export: 'Export',
    run: 'Run',
    noStatus: 'No status',
    startedAt: 'Started at',
    finishedAt: 'Finished at',
    scheduled: 'Scheduled',
    notScheduled: 'Not scheduled',
    openInEditor: 'Open in editor',
    executableScriptFile: 'Executable script file',
    scriptInputData: 'Input data',

    scriptInputFiles: {
      title: 'Script Input Files',
      inputFile: 'Input File',
      addInputFile: 'Add Input File',
      path: 'Path',
      save: 'Save Input Files',
    },

    scriptResultDestinationRepository: 'Result to repository',
    scriptResultDestinationBranch: 'Result to branch',
    scriptResultDestinationPath: 'Result to path',
    importSourceConnection: 'Import from connection',
    importSourceConnectionPath: 'Import from connection path',
    importDestinationRepository: 'Import to repository',
    importDestinationBranch: 'Import to branch',
    importDestinationPath: 'Import to path',
    exportDestinationConnection: 'Export to connection',
    exportDestinationConnectionPath: 'Export to connection path',
    exportSourceRepository: 'Export from repository',
    exportSourceBranch: 'Export from branch',
    exportSourcePath: 'Export from path',
    livePipeline: 'Live pipeline',
    triggeredBy: 'Triggered by',
    duration: 'Duration',
    addPath: 'Add Path',
    removePath: 'Remove path',
    multiplePaths: 'Multiple paths',

    tabs: {
      data: 'Data',
      schedule: 'Schedule',
    },

    settings: {
      saveChanges: 'Save changes',
      deletionNote:
        'Deleting this workflow will remove all data associated with it. This action is irreversible.',
      delete: 'Delete workflow',
      areYouSureYouWantToDelete:
        'Are you sure you want to delete this workflow?',
      resumeWorkflow: 'Resume',
      pauseWorkflow: 'Pause',
    },

    create: {
      createNewWorkflow: 'Create new workflow',
      createNewActionWorkflow: 'Create new action workflow',
      createNewImportWorkflow: 'Create new import workflow',
      createNewExportWorkflow: 'Create new export workflow',
      createNewPipelineWorkflow: 'Create new pipeline workflow',
      configureFieldMappings: 'Configure field mappings',
      configureImport: 'Configure import',
      configureAction: 'Configure action',
      configureExport: 'Configure export',
      configurePipeline: 'Configure pipeline',
      configureWorkflow: 'Configure workflow',
      confirmAndCreate: 'Confirm and create',
      confirmAndContinue: 'Confirm and continue',
      goBack: 'Go back',
    },

    pipeline: {
      pipeline: 'Pipeline',
      livePipeline: 'Live pipeline',
      addNewStage: 'Add new stage',
      addStage: 'Add stage',
      stage: 'Stage',
      descriptionPlaceholder: 'Describe what this pipeline stage does',
      write: 'Write',
      read: 'Read',
      executablePath: 'Executable path',
      executablePathDescription:
        'Path to the action script e.g. /path/to/script.py',
      connectionWritePath: 'Write Path',
      connectionWritePathDescription:
        'Path to write within the connection e.g. /path/to/write',
      connectionReadPath: 'Read Path',
      connectionReadPathDescription:
        'Path to read within the connection e.g. /path/to/read',
      moveUp: 'Move up',
      moveDown: 'Move down',
      savePipelineStages: 'Save pipeline stages',
      noStages: 'No stages',
    },

    schedule: {
      workflowSchedule: 'Workflow schedule',
      frequency: 'Frequency',
      interval: 'Interval',
      weekdays: 'Weekdays',
      trigger: 'Trigger',
      triggers: 'Triggers',
      timeTrigger: 'Time based trigger',
      repositoryEventTrigger: 'Repository event trigger',
      workflowRunEventTrigger: 'Workflow run event trigger',
      addTrigger: 'Add trigger',
      maxRetries: 'Max Retries',
      maxRuntime: 'Max Runtime (seconds)',
      minInterval: 'Min Interval (seconds)',
      triggerType: 'Trigger Type',
      timeFormat: 'Time Format',
      recurrenceRule: 'Recurrence Rule',
      cronExpression: 'Cron Expression',
      event: 'Event',
      saveSchedule: 'Save Schedule',
      presets: 'Presets',
      custom: 'Custom',

      cron: {
        selectPreset: 'Select a preset schedule',
        generatedCron: 'Generated Cron Expression',
        nextExecutionTimes: 'Next Execution Times',
        invalidCron: 'Invalid cron expression. Please check your syntax.',
        minutes: 'Minutes',
        hours: 'Hours',
        dayOfMonth: 'Day of Month',
        month: 'Month',
        dayOfWeek: 'Day of Week',
        everyMinute: 'Every minute (*)',
        everyHour: 'Every hour (*)',
        everyDay: 'Every day (*)',
        everyMonth: 'Every month (*)',
        everyWeekday: 'Every day (*)',
        specificMinute: 'Specific minute',
        specificHour: 'Specific hour',
        specificDay: 'Specific day',
        specificMonth: 'Specific month',
        specificWeekday: 'Specific day',
        cronSyntax: 'Cron Syntax',
        cronSyntaxDescription: 'A cron expression consists of 5 fields:',
        cronSyntaxNote: '* = any value, 0 = Sunday for weekday',
        copyToClipboard: 'Copy to clipboard',
        copied: 'Copied!',
        copyCron: 'Copy cron expression',
        cronSyntaxHelp: 'Cron syntax help',
      },

      rrule: {
        selectPreset: 'Select a preset schedule',
        generatedRRule: 'Generated RRule',
        nextExecutionTimes: 'Next Execution Times',
        invalidRRule: 'Invalid RRule. Please check your settings.',
        frequency: 'Frequency',
        interval: 'Interval',
        weekdays: 'Weekdays',
        startDate: 'Start Date',
        none: 'None',
        everyDay: 'Every day',
        selected: 'selected',
        rruleSyntax: 'RRule Syntax',
        rruleSyntaxDescription:
          'RRule (Recurrence Rule) is a standard format for defining recurring events. Common options include:',
        rruleSyntaxOptions: {
          freq: 'FREQ: Frequency (SECONDLY, MINUTELY, HOURLY, DAILY, WEEKLY, MONTHLY, YEARLY)',
          interval: 'INTERVAL: Interval between recurrences',
          byday: 'BYDAY: Days of the week (MO, TU, WE, TH, FR, SA, SU)',
          byhour: 'BYHOUR: Hours of the day (0-23)',
          byminute: 'BYMINUTE: Minutes of the hour (0-59)',
        },
        copyToClipboard: 'Copy to clipboard',
        copied: 'Copied!',
        copyRRule: 'Copy RRule',
        rruleSyntaxHelp: 'RRule syntax help',
      },
    },
  },

  // === DEVELOPMENT TOOLS ===
  editor: {
    writeYourJS: 'Write your JavaScript here...',
    writeYourGo: 'Write your Go script here...',
    writeYourSQL: 'Write your SQL query here...',
    writeYourPython: 'Write your Python script here...',
    writeYourText: 'Write your text here...',
    writeYourMarkdown: 'Write your Markdown here...',
    writeYourJSON: 'Write your JSON here...',
    newScriptTitle: 'Create a new script',
    newScriptSubtitle:
      'Start writing your script in your preferred language and save it as a workflow',
    scriptExecutionStarted: 'Script execution started',
    scriptNeedsToBeSaved:
      'Script needs to be saved before running. Save the script in the editor and run it again.',
  },

  query: {
    queryExecutionStarted: 'Query execution started',
    results: 'Results',
    errors: 'Errors',
    noErrors: 'No errors',
    queryResults: 'Query results',
    createQuery: 'Create query',
    saveAsWorkflow: 'Save as workflow',
    run: 'Run',
    rowsReturnedIn: 'rows returned in',
    exportTable: 'export table (.csv)',
    search: 'Search in results',
    newQuery: 'New query',
    selectedQuery: 'Selected query',
  },

  fileNavigator: {
    original: 'Original',
    saveFile: 'Save file',
    createFile: 'Create file',
    createFolder: 'Create folder',
    updateFile: 'Update file',
    updateFolder: 'Update folder',
    copyFolder: 'Copy folder',
    copyFile: 'Copy file',
    open: 'Open',
    rename: 'Rename',
    move: 'Move',
    root: 'Root',
    rootDirectory: 'Root directory',
    newNameOfTheFile: 'New name of the file',
    newNameOfTheFolder: 'New name of the folder',
    newPathOfTheFile: 'New path of the file',
    newPathOfTheFolder: 'New path of the folder',
    newFileName: 'New file name',
    newFolderName: 'New folder name',
    newFilePath: 'New file path',
    newFolderPath: 'New folder path',
    deleteConfirmation: 'Are you sure you want to delete',
    deleteFolderWarning: 'All files and folders inside will be deleted',

    errors: {
      invalidType: 'Invalid item type (file or folder)',
      noExtension: 'No extension provided',
      invalidExtension: 'Invalid file extension (js, py, sql)',
      emptyName: 'Name is empty',
      longName: 'Name is too long',
      invalidName: 'Invalid name',
      invalidPath: 'Invalid path',
      pathExists: 'Path already exists',
      parentPathNotExist: 'Parent path does not exist',
    },
  },

  // === ASSISTANT ===
  assistant: {
    // Assistant Section
    title: 'Assistant',
    conversations: 'Conversations',
    noConversationSelected: 'No conversation selected',
    noConversationSelectedDescription:
      'Select an existing conversation from the sidebar or create a new one to start chatting with the AI assistant.',
    noMessagesInTheConversation: 'No messages in the conversation',
    noMessagesInTheConversationDescription:
      'This conversation has no messages. Start by sending a message to the assistant.',
    assistantInterfaceError: 'Assistant Interface Error',
    failedToLoadAssistantInterface: 'Failed to load assistant interface',
    openSidebar: 'Open sidebar',
    openInFullPage: 'Open in full page',

    // Conversations List
    newConversation: 'New Conversation',

    // Conversation Details
    created: 'Created',
    lastUpdated: 'Last updated',
    lastMessage: 'Last message',
    totalMessages: 'Total Messages',
    userMessages: 'User Messages',
    assistantMessages: 'Assistant Messages',
    estimatedTokens: 'Estimated Tokens',
    openConversation: 'Open Conversation',
    deleteConversation: 'Delete Conversation',
    clearConversation: 'Clear Conversation',

    // Assistant Chat
    askMeAnything:
      'Ask me anything - coding, business, writing, or general questions...',
    toggleWebSearch: 'Toggle web search simulation',
    search: 'Search',

    // Chat Suggestions
    showCodeExamples: 'Show me code examples',
    explainBusinessConcepts: 'Explain business concepts',
    helpWithWriting: 'Help with writing',
    analyzeMarketTrends: 'Analyze market trends',

    // Chat Elements
    webSearchResult: 'Web search result',
    tool: 'Tool',
    back: 'Back',
    forward: 'Forward',
    thisIsDetailedExplanation:
      'This is a detailed explanation of the {approach} approach.',

    // Message Actions
    copyMessage: 'Copy message',
    messageCopied: 'Message copied to clipboard',
    copyFailed: 'Failed to copy message',

    // Tool and Reasoning Elements
    toolCalls: 'Tool Calls',
    thinkingSteps: 'Thinking Steps',
    iteration: 'Iteration',
    iterations: 'iterations',
    systemMessage: 'System Message',
    streamCompleted: 'Stream completed',
    error: 'Error',
    likeThisResponse: 'Like this response',
    dislikeThisResponse: 'Dislike this response',
    thisResponseWasGeneratedThrough: 'This response was generated through',
    ofReasoningAndToolUsage: 'of reasoning and tool usage',
  },

  // === USER MANAGEMENT ===
  users: {
    removeUserConfirmation: 'Are you sure you want to remove this user?',
    transferOwnershipConfirmation:
      'Are you sure you want to transfer ownership?',
    usersAndPermissions: 'Users & Permissions',
    invites: 'Invites to the workspace',
    inviteUser: 'Invite a User',
    changeProfilePicture: 'Change profile picture',
    firstName: 'First name',
    lastName: 'Last name',
    email: 'Email',
    phone: 'Phone',
    company: 'Company',
    role: 'Role',
    noRole: 'No role',
    updateProfile: 'Update profile',
    transferOwnership: 'Transfer ownership',
    removeFromWorkspace: 'Remove from workspace',
    resendInvite: 'Resend invite',
    cancelInvite: 'Cancel invite',
    invite: 'Invite',
  },

  invite: {
    acceptInvitation: 'Accept Invitation',
    declineInvitation: 'Decline invitation',
    workspaceInvitation: 'Workspace Invitation',
    workspaceInvitationDescription: 'You have been invited to join a workspace',
    invitedBy: 'Invited by',
    workspace: 'Workspace',
    role: 'Role',
  },

  tokens: {
    apiTokens: 'API tokens',
    noTokens: 'You have no API tokens',
    createAPIToken: 'Create API token',
    validFor: 'Valid for (in seconds)',
    expiresAt: 'Expires at',
    revokeToken: 'Revoke token',
    yourAPIToken: 'Your API Token',
    storeTokenDescription:
      'This token will only be shown once. Please copy it and store it securely.',
    tokenRevealed: 'Token Revealed',
    revealToken: 'Reveal token',
    copied: 'Copied!',
    copyToken: 'Copy token',
  },

  policy: {
    title: 'Access Policies',
    description: 'Manage access policies and permissions',
    addPolicy: 'Add Policy',
    createPolicy: 'Create New Policy',
    createPolicyDescription: 'Define a new access policy for your workspace',
    editPolicy: 'Edit Policy',
    editPolicyDescription: 'Modify the access policy settings',
    deletePolicy: 'Delete Policy',
    deletePolicyDescription:
      'Are you sure you want to delete this policy? This action cannot be undone.',
    effect: 'Effect',
    action: 'Action',
    resource: 'Resource',
    principal: 'Principal',
    resourceId: 'Resource ID (Optional)',
    resourceIdPlaceholder: 'Leave empty for all resources',
    loading: 'Loading policies...',
    error: 'Error loading policies',
    noPolicies: 'No policies found',
    creating: 'Creating...',
    updating: 'Updating...',
    deleting: 'Deleting...',
    effectAllow: 'Allow',
    effectDeny: 'Deny',
    actionRead: 'Read',
    actionCreate: 'Create',
    actionUpdate: 'Update',
    actionDelete: 'Delete',
    principalWorkspaceUser: 'User',
    principalRole: 'Role',
    principalEveryone: 'Everyone',
    allResources: 'All',

    tooltips: {
      effect: 'Whether the policy explicitly denies or allows the action',
      action:
        'What action is being allowed or denied (create, read, update, delete)',
      resource: 'The type of resource on which the action can be performed',
      principal:
        'Who this policy applies to (specific user, role, or everyone)',
      resourceId:
        'Optional specific resource ID. Leave empty to apply to all resources of this type',
    },
  },

  // === LOGGING & MONITORING ===
  logs: {
    workspaceLogs: 'Workspace audit logs',
    connectionLogs: 'Connection audit logs',
    repositoryLogs: 'Repository audit logs',
    userAuditLogs: 'User audit logs',
    workflowLogs: 'Workflow audit logs',
    noLogsFound: 'No logs found',
    system: 'System',
    foundLogEvents: 'Found log events',
    storedQueryLogs: 'Query audit logs',
    policyLogs: 'Policy audit logs',
    repositoryObjectLogs: 'Repository object audit logs',
  },

  // === DOCUMENTATION ===
  documentation: {
    documentation: 'Documentation',
    startTypingDocumentation:
      'Start typing your documentation and notes here...',
    schema: 'Schema',
    workspace: 'Workspace',
    createdBy: 'Created by',
  },

  // === LIST COMPONENTS ===
  list: {
    status: 'Status',
    runs: 'Runs',
    actions: 'Actions',
    view: 'View',
    delete: 'Delete',
    edit: 'Edit',
    owner: 'Owner',
    author: 'Author',
    lastUpdated: 'Last updated',
    createdAt: 'Created at',
    immutable: 'Immutable',
    source: 'Source',
    destination: 'Destination',
    searchPlaceholder: 'Type to search...',
    noItemsFound: 'No items found',

    emptyState: {
      repositories: {
        title: 'No repositories yet',
        description:
          'Repositories store your data in a Git-like structure. Create your first repository to get started.',
      },
      workflows: {
        title: 'No workflows yet',
        description:
          'Workflows automate your data tasks. Create import, export, action, or pipeline workflows to get started.',
      },
      connections: {
        title: 'No connections yet',
        description:
          'Connections allow you to import from and export to external data sources. Create your first connection to get started.',
      },
      users: {
        title: 'No users yet',
        description: 'Invite team members to collaborate on this workspace.',
      },
      invites: {
        title: 'No pending invites',
        description:
          "When you invite people to this workspace, they'll appear here until they accept or decline.",
      },
      queries: {
        title: 'No saved queries',
        description:
          'Start by writing a SQL query in the editor and save it for future use.',
      },
      tokens: {
        title: 'No API tokens',
        description:
          'API tokens allow you to authenticate with the Irmin API programmatically. Create your first token to get started.',
      },
      commits: {
        title: 'No commits yet',
        description:
          'Start making changes to your repository to see commits here.',
      },
      tags: {
        title: 'No tags yet',
        description:
          'Tags are immutable pointers to specific commits. Create tags to mark important versions.',
      },
      branches: {
        title: 'No branches yet',
        description:
          'Branches allow you to work on different versions of your data simultaneously.',
      },
      objects: {
        title: 'No objects yet',
        description:
          'Start by uploading files or create a workflow to populate this repository.',
      },
      editor: {
        title: 'No files or folders',
        description: 'Create your first file or folder to get started',
      },
      generic: {
        title: 'No items found',
        description:
          "Try adjusting your search or filters to find what you're looking for.",
      },
    },
  },

  // === UTILITIES ===
  schemaFieldMapper: {
    title: 'Field Mapper',
    description:
      'Click a source field, then click a destination field to create a mapping',
    descriptionWithSelection:
      'Click a destination field to map "{fieldName}" from {source}',
    sourceSchema: 'Source Schema',
    destinationSchema: 'Destination Schema',
    fieldMappings: 'Field Mappings',
    noMappingsYet: 'No mappings yet',
    autoMapIdenticalFields: 'Auto-Map Identical Fields',
    clearAllMappings: 'Clear All Mappings',
    fields: 'fields',
    mapped: 'mapped',
    required: 'required',
    fileSize: '{size}KB',
    autoMappedSuccess: 'Auto-mapped {count} identical fields!',
    noIdenticalFieldsFound: 'No identical fields found to auto-map.',
    sourceEmpty: 'Source is empty - no fields to map',
    destinationEmpty: 'Destination is empty - nothing needs replacement',
  },
};

export default en;
