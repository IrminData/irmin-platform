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
    download: 'Download',
    back: 'Back',
    next: 'Next',
    continue: 'Continue',
    previous: 'Previous',
    saveChanges: 'Save Changes',
    close: 'Close',
    refresh: 'Refresh',
    tryAgain: 'Try again',
    hideAdvancedOption: 'Hide advanced options',
    showAdvancedOptions: 'Show advanced options',

    // Error display
    pageNotFoundDescription:
      "The page you're looking for doesn't exist or has been moved.",
    errorDetails: 'Error details',
    reportIssue: 'Report issue',
    showDetails: 'Show details',
    hideDetails: 'Hide details',
    copy: 'Copy',
    copied: 'Copied',
    visual: 'Visual',
    stackTrace: 'Stack trace',

    // Search and navigation
    search: 'Search',
    filters: 'Filters',
    noResults: 'No results',
    loadMore: 'Load more',
    selectAll: 'Select All',

    // Status and feedback
    success: 'Success',
    successful: 'Successful',
    error: 'Error',
    failed: 'Failed',
    info: 'Info',
    optional: 'Optional',
    all: 'All',

    // Pagination and filtering
    showing: 'Showing',
    of: 'of',
    page: 'Page',
    clearFilters: 'Clear filters',

    // Content
    name: 'Name',
    description: 'Description',
    email: 'Email',
    overview: 'Overview',
    actions: 'Actions',
    logs: 'Logs',
    timestamp: 'Timestamp',
    lastModified: 'Last modified',
    size: 'Size',
    color: 'Color',
    owner: 'Owner',
    tags: 'Tags',

    // Forms
    fieldRequired: 'This field is required',
    fieldInvalid: 'This field is invalid',
    resetForm: 'Clear form',
    pleaseFixErrors: 'Please fix the errors above',

    // Messages and alerts
    insufficientPermissions: 'Insufficient permissions',
    ohNo: 'Oh no!',
    pageNotFound: 'Page not found',
    somethingWentWrong: 'Something went wrong',
    weEncounteredError: 'We encountered an error',
    tryAgainOrContactSupport: 'Please try again or contact support',
    goBackHome: 'Go back to the home page',
    noOptionsMessage: 'No options',
    downloadSuccess: 'Download successful',
    dangerZone: 'Danger zone',

    // Confirmations
    areYouSureYouWantToDelete: 'Are you sure you want to delete this item?',
    areYouSureYouWantToTransferOwnership:
      'Are you sure you want to transfer the ownership of this item?',
    saved: 'Saved successfully',
    deleted: 'Deleted successfully',

    createFromTemplate: 'Create from Template',
    templates: {
      title: 'Template Library',
      description: 'Choose a template to get started quickly',
      searchTemplates: 'Search templates...',
      noTemplatesFound: 'No templates found',
      noPlaceholders: 'No placeholders to fill in this template',
      selectTemplate: 'Select a template',
      fillPlaceholders: 'Fill Template Placeholders',
      example: 'Example',
      preview: 'Preview',
      createNew: 'Create New',
      replaceCurrent: 'Replace Current',
    },

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
    scripts: 'Scripts',
    queries: 'Queries',
    aiApplications: 'AI Applications',
    workspaceSettings: 'Workspace',
    goToWebsite: 'Go to website',
    myProfile: 'My Profile',
    signOut: 'Sign out',
    guides: 'Guides',
    contactSupport: 'Contact our team',
    developerDocs: 'Developer Docs',

    staticSearchItems: {
      guides: 'Irmin Guides',
      documentation: 'Irmin Documentation',
      termsAndPrivacy: 'Terms of Use & Privacy Policy',
      createWorkspace: 'Create new workspace',
      workspaceDocumentation: 'Workspace Documentation',
      myProfile: 'My Profile',
      manageWorkspaces: 'Manage Workspaces',
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
        scripts: 'Write and run scripts',
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
        createAIApplication:
          'Create a new AI application to expose your data to AI tools',
      },
    },
  },

  // === AI APPLICATIONS ===
  aiApplication: {
    aiApplication: 'AI Application',
    createAIApplication: 'Create AI Application',
    dataSources: 'data sources',
    dataSource: 'data source',
    toolsEnabled: 'tools enabled',
    toolEnabled: 'tool enabled',
    dataSourcesDescription:
      'Configure which repositories and paths this AI Application can access. Data sources define the scope of data available to connected LLM agents.',
    noDataSourcesConfigured:
      'No data sources configured. Add a data source to allow the AI Application to access your workspace data.',
    dataSourcePathHint:
      'Leave empty or use "/" to include the entire repository',
    deleteAIApplication: 'Delete AI Application',
    deleteWarning:
      'Deleting this AI Application will revoke all API keys and remove access for any connected LLM agents. This action cannot be undone.',
    // Overview section
    apiKey: 'API Key',
    apiKeyDescription:
      'Use this API key to authenticate requests to the AI Application API and MCP server.',
    apiKeyOnlyShownOnce:
      'API key is only shown once when the AI Application is created. Contact the owner if you need access.',
    mcpEndpoint: 'MCP Endpoint',
    restApiEndpoint: 'REST API Endpoint',
    enabledTools: 'Enabled Tools',
    // Tools
    toolQueryName: 'SQL Query',
    toolQueryDescription: 'Execute SQL queries on workspace data',
    toolSchemaName: 'Schema',
    toolSchemaDescription: 'Get data schema for repository objects',
    toolListObjectsName: 'List Objects',
    toolListObjectsDescription: 'List files and folders in repositories',
    toolGetContentName: 'Get Content',
    toolGetContentDescription: 'Read content of text-based files',
    toolVectorSearchName: 'Vector Search',
    toolVectorSearchDescription: 'Semantic search on embeddings',
    toolDocsName: 'Documentation',
    toolDocsDescription: 'Access AI Application documentation',
    // Write Tools
    toolWriteName: 'Write Operations',
    toolWriteDescription: 'Allow agents to modify data in repositories',
    writeConfigTitle: 'Write Configuration',
    writeFileUpload: 'File Upload',
    writeFileUpdate: 'File Update',
    writePatch: 'JSON Patch Operations',
    writeAutoCommit: 'Auto-commit changes',
    writeRequireCommitMessage: 'Require commit message',
    writeCommitMessagePrefix: 'Commit message prefix',
    writeRequireApproval: 'Require human approval',
    // Pending Writes
    pendingWritesTitle: 'Pending Writes',
    pendingWritesDescription:
      'Review and approve write operations from AI agents',
    pendingWritesError: 'Failed to load pending writes',
    noPendingWrites: 'No pending writes to review',
    howToConnect: 'How to Connect',
    howToConnectMcp:
      'Use the <strong>MCP Endpoint</strong> to connect with Cursor, Claude Desktop, or other MCP clients.',
    howToConnectApiKey:
      'Include your <strong>API Key</strong> as a Bearer token in the Authorization header.',
    howToConnectTools:
      'Enable specific tools below to expose capabilities to your AI agent.',
    apiReference: 'API Reference',
    toolsControlDescription:
      'Control which capabilities are exposed via the MCP server.',
    hideApiKey: 'Hide API Key',
    showApiKey: 'Show API Key',
    copyApiKey: 'Copy API Key',
    // Custom Tools
    customTools: 'Custom Tools',
    customToolsDescription:
      'Define custom tools that AI can use to execute specific queries, workflows, or searches.',
    noCustomTools:
      'No custom tools defined yet. Add a custom tool to extend AI capabilities.',
    addCustomTool: 'Add Custom Tool',
    editCustomTool: 'Edit Custom Tool',
    customToolDialogDescription: 'Configure a custom tool that AI can use.',
    toolName: 'Tool Name',
    toolNameHint:
      'Lowercase letters, numbers, and underscores only. Must start with a letter.',
    toolDescriptionHint:
      'This description helps AI understand when to use this tool.',
    toolType: 'Type',
    storedQuery: 'Stored Query',
    selectQuery: 'Select a query',
    workflow: 'Workflow',
    selectWorkflow: 'Select a workflow',
    embeddingPath: 'Embedding Path',
    embeddingPathHint: 'Unified path to the embedding file.',
    topK: 'Top K Results',
    embeddingFilter: 'Metadata Filter',
    embeddingFilterHint:
      'Filter results by metadata. One key=value pair per line.',
    // Activity / Tool Logs
    activity: 'Activity',
    activityDescription:
      'View all tool calls made through this AI Application, including inputs, execution time, and status.',
    noActivityYet: 'No activity recorded yet',
    noActivityDescription:
      'Tool calls made through the AI Application will appear here.',
    toolCalls: 'Tool Calls',
    avgDuration: 'Avg Duration',
    noInputs: 'No inputs',
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
    workspaceName: 'Workspace Name',
    workspaceDescription: 'Workspace Description',
    noWorkspaceDescription: 'No description provided',
    deletionNote:
      'Deleting your workspace will remove all data associated with it. This action is irreversible.',
    deleteWorkspace: 'Delete Workspace',
    billingSettings: 'Billing Settings',
    billingNote:
      'You can currently only manage billing by contacting our team.',
    apiMcp: 'API/MCP',
    api: {
      settings: 'API/MCP Settings',
      restApi: 'REST API',
      mcp: 'MCP',
      apiBaseUrl: 'API Base URL',
      mcpUrl: 'MCP Server URL',
      apiDescription:
        'Use the REST API to programmatically interact with your workspace data, repositories, workflows, and more.',
      mcpDescription:
        'Use the Model Context Protocol (MCP) server to integrate Irmin with AI assistants and development tools like Claude Desktop.',
      getApiToken: 'Get API Token',
      getMcpToken: 'Get MCP Token',
      viewApiDocs: 'View API Documentation',
      apiUsageNote:
        'To use the API, you need an API token. Create one in your profile settings.',
      apiExampleTitle: 'Example API Request',
      apiExampleDescription: 'Make a request to the API using curl:',
      apiExampleCurl:
        'curl -X GET "<API_URL>/api/v1/workspaces" \\\n  -H "Authorization: Bearer <your-api-token>" \\\n  -H "Content-Type: application/json"',
      apiExampleNote:
        'Replace <your-api-token> above with your personalAPI token from the tokens page.',
      mcpUsageNote:
        'To use the MCP server, you need an API token. Create one in your profile settings.',
      mcpAuthHeader: 'Authorization: Bearer <your-api-token>',
      mcpAuthHeaderLabel: 'Authorization Header',
      mcpClaudeDesktopTitle: 'Add to Claude Desktop',
      mcpClaudeDesktopDescription:
        'Add this configuration to your Claude Desktop config file:',
      mcpClaudeDesktopConfig:
        '{\n  "mcpServers": {\n    "irmin": {\n      "url": "<MCP_URL>",\n      "headers": {\n        "Authorization": "Bearer <your-api-token>"\n      }\n    }\n  }\n}',
      mcpConfigNote:
        'Replace <MCP_URL> with the MCP Server URL above and <your-api-token> with your API token from the tokens page.',
      viewMcpDocs: 'View MCP Documentation',
    },
    addTags: 'Add tags',
    failedToLoadTags: 'Failed to load tags',
    failedToLoadWorkspaces: 'Failed to load workspaces',
    member: 'member',
    members: 'members',
    noMembersYet: 'No members yet',
  },

  workspaceSwitcher: {
    selectWorkspace: 'Select a workspace',
    createNewWorkspace: 'Create new workspace',
    createFirstWorkspace: 'Create your first workspace',
    createFirstWorkspaceDescription:
      'Workspaces help you organize your data, workflows, and team collaboration. Get started by creating your first workspace.',
    workspace: 'Workspace',
    leaveWorkspace: 'Leave workspace',
    leaveWorkspaceConfirm: 'Are you sure you want to leave this workspace?',
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
      selectBranch: 'Select branch',
      ref: 'Ref',
      createBranch: 'Create branch',
      primary: 'Primary',
      primaryBranch: 'Primary branch',
      newBranchName: 'New branch name',
      fromBranch: 'From branch',
      confirmDeleteBranch: 'Are you sure you want to delete this branch?',
    },

    tags: {
      tags: 'Tags',
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
      changes: 'Changes',
      resetBranch: 'Reset branch to this commit',
      confirmResetBranch: 'Reset branch to commit?',
      resetBranchDescription:
        'This will move the current branch pointer to this commit. Any commits after this point will no longer be on this branch. This action cannot be undone.',
      revertCommit: 'Revert this commit',
      confirmRevertCommit: 'Revert this commit?',
      revertCommitDescription:
        'This will create a new commit that undoes the changes from this commit. The original commit will remain in history. This is a safe, non-destructive operation.',
    },

    compare: {
      compare: 'Compare',
      switchDirection: 'Switch direction',
      baseBranch: 'Base ref',
      compareBranch: 'Compare to ref',
      customRef: 'Custom ref',
      enterCustomRef: 'Enter tag name or commit hash',
      customRefPlaceholder: 'e.g., v1.0.0 or abc123...',
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
      failedToLoadDiff: 'Failed to load comparison',
      failedToLoadDiffSubtitle:
        'Unable to compare the selected refs. Please check that both refs exist and try again.',
      defaultStrategy: 'Default',
      destWinsStrategy: 'Destination wins',
      sourceWinsStrategy: 'Source wins',
      mergeExplanation:
        'In case of a merge conflict, this option will force the merge process to automatically favour changes from the base ("Destination wins") or from the comparison ("Source wins"). In case no selection is made, the merge process will fail in case of a conflict.',
      schemaChanges: 'Schema Changes',
      breakingChanges: 'Breaking Changes',
      nonBreakingChanges: 'Non-Breaking Changes',
      file: 'file',
      files: 'files',
    },

    objects: {
      object: 'Object',
      objects: 'Objects',
      noObjects: 'No objects found',
      noObjectsMessage:
        'Start by uploading files or create a workflow to populate this repository.',
      uploadObject: 'Upload object',
      uploadFiles: {
        title: 'Upload Files',
        dropZone: 'Drop files here or click to select',
        browseFiles: 'Browse Files',
        addMore: 'Add More Files',
        uploadingTo: 'Uploading to:',
        startUpload: 'Upload {count} Files',
        done: 'Done',
        conflict: {
          title: 'File Already Exists',
          message: '"{filename}" already exists at this location.',
          replace: 'Replace',
          skip: 'Skip',
          replaceAll: 'Replace All',
          skipAll: 'Skip All',
        },
        status: {
          pending: 'Pending',
          checking: 'Checking...',
          uploading: 'Uploading...',
          completed: 'Uploaded',
          failed: 'Failed',
          skipped: 'Skipped',
          conflict: 'Conflict',
        },
        summary: {
          uploaded: '{count} uploaded',
          skipped: '{count} skipped',
          failed: '{count} failed',
        },
      },
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
      validate: 'Validate',
      validateObject: 'Validate Object',
      validateObjectDescription: 'Validate this object against a schema',
      validationMode: 'Validation Mode',
      validationModeStrict: 'Strict (fail on any error)',
      validationModePermissive: 'Permissive (log errors but continue)',
      validationSchemaJson: 'Validation Schema (JSON)',
      validationPassed: 'Validation Passed',
      validationFailed: 'Validation Failed',
      validationLogs: 'Validation Logs',
      validationSuccessMessage: 'Object validation passed',
      validationFailedMessage: 'Object validation failed',
      validationErrorMessage: 'Failed to validate object',
      invalidJsonSchema: 'Invalid JSON schema or validation error',
      vectors: 'Vectors',
      vectorize: 'Vectorize',
      vectorizeSuccess: 'Embeddings created successfully',
      vectorizeError: 'Failed to create embeddings',
      vectorizeSourcePaths: 'Source Files',
      vectorizeSourcePathsDescription: 'Paths to the files to vectorize',
      vectorizeSourcePathPlaceholder: 'e.g., data/documents/doc.txt',
      vectorizeAddSourcePath: 'Add Source Path',
      vectorizeOutputPath: 'Output Path',
      vectorizeOutputPathDescription:
        'Path where the embedding file will be saved (must end with .parquet)',
      vectorizeOutputPathPlaceholder: 'e.g., embeddings/documents.parquet',
      embeddingFile: 'Embedding File',
      embeddingsModel: 'Model',
      embeddingsDimensions: 'Dimensions',
      embeddingsChunkSize: 'Chunk Size',
      embeddingsOverlap: 'Overlap',
      embeddingsChunkCount: 'Chunks',
      embeddingsSourceFiles: 'Source Files',
      embeddingsTopK: 'Results',
      searchVectors: 'Search Vectors',
      searchVectorsPlaceholder: 'Enter your search query...',
      searchVectorsError: 'Failed to search embeddings',
      searchResults: 'Search Results',
      noSearchResults: 'No results found',
      embeddingsScore: 'Score',
      embeddingsContent: 'Content',
      embeddingsSourceFile: 'Source',
      embeddingsChunk: 'Chunk',
      embeddingsPriority: 'Priority',
      embeddingsPriorityDescription:
        'Higher priority embeddings are favored in RAG retrieval (0.0-1.0)',
      embeddingsConfigLoaded: 'Using existing file configuration',
      embeddingsConfigLoadedDescription:
        'Configuration was loaded from the existing embedding file to ensure compatibility.',
      embeddingsMetadata: 'Metadata',
      embeddingsMetadataKey: 'Key',
      embeddingsMetadataValue: 'Value',
      embeddingsMetadataAddField: 'Add Field',
      embeddingsMetadataRemoveField: 'Remove',
      embeddingsMetadataImportJson: 'Import JSON',
      embeddingsMetadataExportJson: 'Export JSON',
      embeddingsContentHash: 'Content Hash',
      embeddingsUpsert: 'Upsert Embeddings',
      embeddingsUpsertInserted: 'Inserted',
      embeddingsUpsertSkipped: 'Skipped (already exists)',
      embeddingsUpsertUpdated: 'Updated',
      embeddingsWizardTitle: 'Create Embeddings',
      embeddingsWizardSelectSource: 'Select Source',
      embeddingsWizardConfigureChunking: 'Configure Chunking',
      embeddingsWizardAddMetadata: 'Add Metadata',
      embeddingsWizardGenerate: 'Generate Embeddings',
      embeddingsWizardPreviewChunks: 'Preview Chunks',
      embeddingsWizardGenerating: 'Generating embeddings...',
      embeddingsEditTitle: 'Edit Embedding',
      embeddingsEditDescription:
        'Update the metadata and priority for this embedding chunk',
      embeddingsEditSave: 'Save Changes',
      embeddingsEditSaving: 'Saving...',
      pointer: 'Pointer',
      pointsTo: 'Points to',
      createPointer: 'Create Pointer',
      createPointerDescription:
        'Create a pointer to reference an object from another repository',
      targetBranchRef: 'Target Branch/Ref',
      targetObject: 'Target Object',
      pointerName: 'Pointer Name',
      pointerWillBeSavedAs: 'Will be saved as',
      pleaseSelectTargetRepository: 'Please select a target repository',
      pleaseSelectTargetObject: 'Please select a target object',
      pleaseEnterPointerName: 'Please enter a name for the pointer',
      pleaseEnterTargetRef: 'Please enter a target ref',
      couldNotCreatePointer: 'Could not create pointer',
      selectRepository: 'Select a repository',
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
    testConnection: 'Test Connection',

    settings: {
      saveChanges: 'Save changes',
      deletionNote:
        'Deleting this connection will remove all data associated with it. This action is irreversible.',
      delete: 'Delete connection',
    },

    create: {
      selectConnector: 'Select a connector',
      establishConnection: 'Establish connection',
      configureSettings: 'Configure settings',
      configureConnection: 'Configure connection',
      createNewConnection: 'Create new connection',
      confirmConnectorSelection: 'Confirm connector selection and continue',
      selectedConnector: 'Selected connector',
      connectionName: 'Connection name',
      connectionNamePlaceholder: 'eg. My Google Analytics connection',
      connectionDescription: 'Connection description',
      connectionDescriptionPlaceholder:
        'Enter a description for the connection, so you can remember what it is used for',
      addCustomConnector: 'Add custom connector',
      continueAndTest: 'Continue & test connection',
      createConnection: 'Create connection',
      goBack: 'Go back',
      success: 'Connection successful',
      failed: 'Connection failed',
      configuration_valid: 'Connection configuration valid',
      configuration_invalid: 'Connection configuration invalid',
      contactSupport: 'Contact support',
    },

    config: {
      details: 'Connection Details',
      settings: 'Connection Settings',
      cannotCopySecret: 'Cannot copy secret value',
      editConfiguration: 'Edit configuration',
      editConfigurationAction: 'Edit configuration',
      editDescription:
        'Update connection credentials and settings, then validate before saving.',
      updateConfiguration: 'Update configuration',
      updateFailed: 'Failed to update connection. Please review the errors.',
    },

    schemaValidation: {
      title: 'Schema Validation',
      viewTab: 'View Schema',
      validateTab: 'Validate',
      mode: 'Mode',
      validateMode: 'Validate Data',
      diffMode: 'Compare Schemas',
      operationMethod: 'Operation Method',
      uploadFile: 'Upload JSON File',
      selectFile: 'Select a file...',
      validateButton: 'Validate',
      compareButton: 'Compare',
      validationPassed: 'Validation Passed',
      validationFailed: 'Validation Failed',
      errors: 'error(s)',
      errorsTitle: 'Errors',
      warningsTitle: 'Warnings',
      schemasCompatible: 'Schemas Compatible',
      schemasIncompatible: 'Breaking Changes Detected',
      breakingChanges: 'Breaking Changes',
      nonBreakingChanges: 'Non-Breaking Changes',
    },
  },

  // === SUBSCRIPTIONS ===
  subscriptions: {
    title: 'Subscriptions',
    autoConfigureNotice:
      'This connection supports automatic change detection. When you create a subscription, the connector will automatically listen for changes in the external system and notify Irmin. No additional configuration is required.',
    manualWebhookNotice:
      'The webhook URL and token below are for advanced use cases only, such as custom integrations or debugging. For most use cases, the connector handles notifications automatically.',
    create: 'Create Subscription',
    createTitle: 'Create Subscription',
    createDescription:
      'Subscribe to data changes in this connection. You will receive webhook notifications when data changes.',
    editTitle: 'Edit Subscription',
    editDescription: 'Update subscription settings and filter configuration.',
    activeHelp:
      'When disabled, webhooks using this subscription will be rejected.',
    noSubscriptions: 'No subscriptions yet',
    status: 'Status',
    active: 'Active',
    inactive: 'Inactive',
    eventTypes: 'Event Types',
    selectEventTypes: 'Select event types',
    allEvents: 'All events',
    filterPaths: 'Filter Paths',
    filterPathsPlaceholder: 'leads, contacts, orders',
    filterPathsHelp:
      'Comma-separated list of paths to filter events (leave empty for all)',
    allPaths: 'All paths',
    namePlaceholder: 'e.g., CRM Lead Changes',
    descriptionPlaceholder: 'e.g., Subscribe to lead changes in the CRM',
    webhookCredentials: 'Webhook Credentials',
    webhookCredentialsDescription:
      'Save these credentials securely. The token will not be shown again.',
    webhookUrl: 'Webhook URL',
    webhookToken: 'Webhook Token',
    tokenWarning:
      'This token will only be shown once. Save it securely before closing this dialog.',
    copyWebhookUrl: 'Copy webhook URL',
    regenerateToken: 'Regenerate token',
  },

  connectors: {
    connector: 'Connector',
    version: 'Version',
    author: 'Author',
    authorEmail: 'Author email',
    categories: 'Categories',
    capabilities: 'Capabilities',
    capabilitiesDescription: {
      pull: 'Can import data from external source',
      push: 'Can export data to external source',
      apply_patch: 'Can receive and apply patch operations',
      patch_event: 'Can emit patch events when data changes',
    },
    locales: 'Locales',
  },

  // === WORKFLOWS ===
  workflow: {
    workflows: 'Workflows',
    scheduledWorkflows: 'Scheduled workflows',
    allWorkflowRuns: 'All workflow runs',
    recentRuns: 'Recent runs',
    importWorkflows: 'Import workflows',
    actionWorkflows: 'Action workflows',
    exportWorkflows: 'Export workflows',
    pipelineWorkflows: 'Pipeline workflows',
    actions: 'Actions',
    imports: 'Imports',
    exports: 'Exports',
    pipelines: 'Pipelines',
    triggerRun: 'Trigger workflow run',
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
    scriptInputData: 'Input data',
    selectRepository: 'Select repository',
    selectConnection: 'Select connection',
    executableType: 'Executable type',

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
    syncMode: 'Sync Mode',
    syncModeAuto: 'Auto',
    syncModeFull: 'Full',
    syncModePatch: 'Patch',
    syncModeDescription:
      'Auto: Full sync on schedule, patch on events. Full: Always full sync. Patch: Only patch-based sync (requires event trigger).',
    syncModeImportExplanation:
      'Sync mode controls how data is imported. In "Auto" mode, scheduled imports perform a full data sync, while connection event triggers apply only the changed data (patches). Use "Patch" mode when your connection emits change events and you only want incremental updates.',
    syncModeExportExplanation:
      'Sync mode controls how data is exported. In "Auto" mode, scheduled exports push all data, while repository event triggers send only the changed data (patches). Use "Patch" mode for incremental exports when the destination connection supports applying patches.',
    triggeredBy: 'Triggered by',
    duration: 'Duration',
    addPath: 'Add Path',
    removePath: 'Remove path',

    tabs: {
      data: 'Data',
      schedule: 'Schedule',
    },

    settings: {
      saveChanges: 'Save changes',
      deletionNote:
        'Deleting this workflow will remove all data associated with it. This action is irreversible.',
      delete: 'Delete workflow',
      resumeWorkflow: 'Resume',
      pauseWorkflow: 'Pause',
    },

    create: {
      createNewWorkflow: 'Create new workflow',
      createNewActionWorkflow: 'Create new action workflow',
      createNewImportWorkflow: 'Create new import workflow',
      createNewExportWorkflow: 'Create new export workflow',
      createNewPipelineWorkflow: 'Create new pipeline workflow',
      selectWorkflowType: 'Select workflow type',
      configureFieldMappings: 'Field mappings',
      configureImport: 'Configure import',
      configureAction: 'Configure action',
      configureExport: 'Configure export',
      configurePipeline: 'Configure pipeline',
      configureWorkflow: 'Configure workflow',
      confirmAndCreate: 'Confirm and create',
      confirmAndContinue: 'Confirm and continue',
      goBack: 'Go back',
      typeDescription: {
        import:
          'Import workflows facilitate the ingestion of data from external sources into Irmin repositories.',
        export:
          'Export workflows enable the transfer of data from Irmin repositories to external systems or destinations.',
        action:
          'Action workflows execute custom code, accepting input data and returning output data.',
        pipeline:
          'Pipeline workflows move data through a series of stages, passing results from one stage to the next.',
      },
      validation: {
        workflowableConfigurationMissing:
          'Workflowable configuration is missing',
        pleaseSelectConnection: 'Please select a connection',
        pleaseSelectDestinationRepository:
          'Please select a destination repository',
        pleaseSpecifyDestinationBranch: 'Please specify a destination branch',
        pleaseSpecifyDestinationPathInRepository:
          'Please specify a destination path in repository',
        pleaseAddAtLeastOneSourcePathFromConnection:
          'Please add at least one source path from connection',
        pleaseSelectSourceRepository: 'Please select a source repository',
        pleaseSpecifySourceBranch: 'Please specify a source branch',
        pleaseSpecifyDestinationPathInConnection:
          'Please specify a destination path in connection',
        pleaseAddAtLeastOneSourcePathFromRepository:
          'Please add at least one source path from repository',
        pleaseSelectExecutableScript: 'Please select an executable script',
        pleaseSelectExecutableQuery: 'Please select an executable query',
      },
    },

    pipeline: {
      pipeline: 'Pipeline',
      addStage: 'Add stage',
      descriptionPlaceholder: 'Describe what this pipeline stage does',
      foldAll: 'Fold All',
      unfoldAll: 'Unfold All',
      write: 'Write',
      writeDescription: 'Use results from previous stages',
      read: 'Read',
      readDescription: 'Pass results to next stages',
      firstStageCannotWrite: 'first stage cannot consume previous results',
      lastStageCannotRead:
        'last stage has no subsequent stages to pass results to',
      executableScript: 'Executable script',
      executableQuery: 'Executable query',
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
      repositoryAction: 'Repository Action',
      triggerWorkflow: 'Trigger Workflow',
      validation: 'Validation',
      validationMode: 'Validation Mode',
      validationModeSingle: 'Single File (alphabetically first)',
      validationModeAll: 'All Files',
      failOnError: 'Fail on validation error',
      validationTargetName: 'Target file name (optional)',
      validationTargetNamePlaceholder: 'e.g., customers.json',
      validationSchema: 'Validation Schema',
      transform: 'Transform',
      transformOperation: 'Transform Operation',
      transformFieldRename: 'Rename Fields',
      transformFieldRemove: 'Remove Fields',
      transformFileRename: 'Rename File',
      transformFileRemove: 'Remove File',
      transformFormatConvert: 'Convert Format',
      transformMode: 'Transform Mode',
      transformModeSingle: 'Single File',
      transformModeAll: 'All Files',
      transformTargetName: 'Target file name',
      transformTargetNamePlaceholder: 'e.g., customers.csv',
      transformFieldRenames: 'Field Renames',
      transformOldFieldName: 'Original name',
      transformNewFieldName: 'New name',
      addFieldRename: 'Add field rename',
      transformFieldsToRemove: 'Fields to remove',
      transformFieldsToRemovePlaceholder: 'field1, field2, field3',
      transformFieldsToRemoveHint:
        'Comma-separated list of field names to remove',
      transformOutputName: 'Output file name',
      transformOutputNamePlaceholder: 'e.g., output.csv',
      transformOutputFormat: 'Output format',
      embeddings: 'Embeddings',
      embeddingsOperation: 'Operation',
      embeddingsVectorize: 'Vectorize',
      embeddingsSearch: 'Search',
      embeddingsRepository: 'Repository',
      embeddingsRepositoryPlaceholder: 'Select a repository',
      embeddingsBranch: 'Branch',
      embeddingsModel: 'Model',
      embeddingsDimensions: 'Dimensions',
      embeddingsChunkSize: 'Chunk Size',
      embeddingsOverlap: 'Overlap',
      embeddingsOutputPath: 'Output Path',
      embeddingsOutputPathPlaceholder: 'e.g., embeddings/documents.parquet',
      embeddingsPath: 'Embedding File Path',
      embeddingsPathPlaceholder: 'e.g., embeddings/documents.parquet',
      embeddingsQuery: 'Search Query',
      embeddingsQueryPlaceholder: 'Enter your search query...',
      embeddingsTopK: 'Number of Results',
      embeddingsPriority: 'Priority',
      embeddingsPriorityDescription:
        'Higher priority embeddings are favored in RAG retrieval (0.0-1.0)',
      actionType: 'Action Type',
      commit: 'Commit',
      merge: 'Merge',
      revert: 'Revert',
      delete: 'Delete',
      targetBranch: 'Target Branch',
      mergeStrategy: 'Merge Strategy',
      mergeStrategyDefault: 'Default',
      mergeStrategyOurs: 'Ours',
      mergeStrategyTheirs: 'Theirs',
      mergeStrategyRecursive: 'Recursive',
      squashCommits: 'Squash Commits',
      squashCommitsDescription: 'Combine all commits into one',
      allowEmptyCommits: 'Allow Empty Commits',
      allowEmptyCommitsDescription: 'Permit merge without changes',
      commitMessage: 'Commit Message',
      commitMessagePlaceholder: 'Automated commit from workflow',
      revertPath: 'Revert Path',
      deletePath: 'Delete Path',
      stageTypeDescription: {
        action:
          'Action stages execute custom scripts to process data, accepting input from previous stages and producing output for subsequent stages.',
        connection:
          'Connection stages interact with external data sources, reading from or writing to connections like databases, APIs, or file systems.',
        repository:
          'Repository stages read from or write to Irmin repositories, enabling data versioning and storage within the pipeline workflow.',
        validation:
          'Validation stages validate data from previous stages against a user-defined schema, ensuring data quality before proceeding.',
        transform:
          'Transform stages modify data by renaming fields, removing fields, renaming files, or converting between formats (CSV, JSON, Parquet).',
        embeddings:
          'Embeddings stages create vector representations of documents for semantic search, or search existing embeddings using natural language queries.',
        patch:
          'Patch stages apply incremental changes from incoming events to repositories or connections, enabling real-time data synchronization.',
      },
      patch: 'Patch',
      patchDirection: 'Patch direction',
      patchToRepository: 'To repository',
      patchToConnection: 'To connection',
      patchSourceFile: 'Source file',
      patchSourceFileHelp:
        'File containing the patch data (default: trigger_event.json from connection event)',
      patchTargetPath: 'Target path',
      patchStageExplanation:
        'The Patch stage applies incremental changes (JSON patches) from a source file to either a repository or a connection. Use "To repository" to apply incoming patches (e.g., from connection events) to your data. Use "To connection" to push patches (e.g., from repository changes) to an external system.',
    },

    schedule: {
      workflowSchedule: 'Workflow schedule',
      trigger: 'Trigger',
      timeTrigger: 'Time based trigger',
      repositoryEventTrigger: 'Repository event trigger',
      workflowRunEventTrigger: 'Workflow run event trigger',
      connectionEventTrigger: 'Connection event trigger',
      selectConnection: 'Select connection',
      connectionEventType: 'Event type',
      anyEvent: 'Any event',
      connectionPaths: 'Filter paths',
      connectionPathsPlaceholder: 'leads, contacts, orders',
      connectionPathsHelp:
        'Comma-separated list of paths to filter events (leave empty for all)',
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

      // Trigger details
      manualTrigger: 'Manual Trigger',
      scheduledTrigger: 'Scheduled Trigger',
      unknownTrigger: 'Unknown Trigger',
      noTriggerInformation: 'No Trigger Information',
      rawTriggerData: 'Raw Trigger Data',
      sourceWorkflow: 'Source Workflow',

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
  scripts: {
    script: 'Script',
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
    browseRepositories: 'Browse repositories',
    browseRepositoriesDescription:
      'Browse repositories to find the one you want to write your script in',
    scriptExecutionStarted: 'Script execution started',
    scriptNeedsToBeSaved:
      'Script needs to be saved before running. Save the script and run it again.',
    selectScript: 'Select a script',
    searchScripts: 'Search scripts...',
    createScript: 'Create Script',
    updateScript: 'Update Script',
    owner: 'Owner',
    scriptManagement: 'Script Management',
    scriptName: 'Script name',
    scriptDescription: 'Script description',
    scriptNotFound: 'Script not found. Resetting to blank editor.',
    scriptDeleted: 'Script was deleted. Resetting to blank editor.',
    unsavedChangesDiscard:
      'You have unsaved changes. Do you want to discard them?',
    failedToCreateScript: 'Failed to create script',
    failedToUpdateScript: 'Failed to update script',
    saving: 'Saving...',
    reset: 'Reset',
  },

  query: {
    query: 'Query',
    queries: 'Queries',
    queryExecutionStarted: 'Query execution started',
    results: 'Results',
    errors: 'Errors',
    queryResults: 'Query results',
    createQuery: 'Create query',
    saveQuery: 'Save Query',
    run: 'Run',
    rowsReturnedIn: 'rows returned in',
    exportTable: 'export table (.csv)',
    search: 'Search in results',
    newQuery: 'New query',
    selectedQuery: 'Selected query',
    editor: 'SQL Editor',
    queryNotFound: 'Query not found',
    queryDeleted: 'Query was deleted',
    searchQueries: 'Search queries...',
    failedToCreateQuery: 'Failed to create query',
    failedToUpdateQuery: 'Failed to update query',
  },

  queryHelper: {
    title: 'SQL Syntax Helper',
    poweredBy: 'Powered by DuckDB',
    duckDbDescription:
      'Irmin uses DuckDB, a high-performance analytical database. All standard SQL syntax and DuckDB-specific functions are supported.',
    duckDbDocs: 'DuckDB SQL Documentation',
    context: 'Query Context',
    recommended: 'Recommended',
    placeholderSyntax: 'Placeholder Syntax',
    placeholderDescription:
      'Irmin uses a special placeholder syntax to reference data across workspaces, repositories, and versions. This is the recommended syntax for most use cases.',
    placeholderSyntaxNote:
      'Ref (branch/commit) is optional. Workspace is optional if running in the same workspace.',
    alternativeS3Syntax: 'Alternative: Native DuckDB S3 Syntax',
    alternativeS3Description:
      'For advanced use cases, you can also use native DuckDB functions with direct S3 paths.',
    s3FormatNote: 'S3 format: s3://workspace-repository/branch/path',
    alternativeS3Example: 'Native DuckDB S3 Syntax (Alternative)',
    alternativeS3ExampleExplanation:
      'Use native DuckDB functions with S3 paths for advanced use cases. Both syntaxes enforce the same permissions.',
    examples: 'Query Examples',
    basicQueries: 'Basic Queries',
    advancedAnalytics: 'Advanced Analytics',
    jsonOperations: 'JSON Operations',
    crossRepoAndBranch: 'Cross-Repository & Branch',
    queryDocumentationTab: 'SQL Syntax',
    generateSql: 'Generate SQL',
    copySelector: 'Copy selector',
    availableColumns: 'Available Columns',
    basicSelect: 'Basic Select',
    filterAndSort: 'Filter & Sort',
    aggregations: 'Aggregations',
    windowFunctions: 'Window Functions',
    nestedJson: 'Nested JSON (UNNEST)',
    jsonExtract: 'Extract JSON Fields',
    crossBranchQuery: 'Cross-Branch Query',
    timeSeries: 'Time Series Analysis',
    writeOperations: 'Write Operations',
    exportResults: 'Export Query Results',
    tempViewWithQuery: 'Temporary View + Query',
    joinExport: 'Export JOIN Results',
    aggregationExport: 'Export Aggregations',
    multiStepTransform: 'Multi-Step Transformation',
    queryInputsOutputs: 'Query Inputs & Outputs',
    workflowInputs: 'Workflow Input Files',
    inputFileProcessing: 'Process Input Files',
    multipleInputJoin: 'Join Multiple Inputs',
    queryOutputFormat: 'Query Output Format',
    explanations: {
      basicSelect: 'Retrieve the first 10 rows from the object.',
      filterAndSort: 'Filter rows by id and sort by creation date.',
      aggregations: 'Group data by category and calculate statistics.',
      windowFunctions:
        'Calculate rank and previous values using window functions.',
      nestedJson: 'Expand the "data" array into rows to query its fields.',
      jsonExtract: 'Extract specific fields from a JSON string column.',
      crossBranchQuery: 'Combine results from main and dev branches.',
      timeSeries: 'Aggregate data by hour to analyze trends.',
      exportResults:
        'Use COPY TO to export query results to LakeFS. Requires write permissions on the target repository and branch.',
      tempViewWithQuery:
        'Create temporary views for complex queries, then query them. Multiple statements separated by semicolons.',
      joinExport:
        'Export results from JOIN queries combining multiple data sources. Useful for creating enriched datasets.',
      aggregationExport:
        'Export aggregated analytics (GROUP BY, COUNT, AVG, SUM) directly to files. Perfect for reports and dashboards.',
      multiStepTransform:
        'Use multiple temporary tables to build complex data transformations step-by-step, then export final results.',
      workflowInputs:
        'In workflows, input files are automatically loaded as virtual tables. Table names are derived from file paths (e.g., /data/customers.csv → data_customers_csv).',
      inputFileProcessing:
        'Filter and transform data from workflow input files. Input files are loaded as virtual tables based on their path.',
      multipleInputJoin:
        'Join multiple input files loaded as virtual tables. Perfect for combining data from different sources in workflows.',
      queryOutputFormat:
        'Query results are automatically converted to CSV format (query_results.csv). The output can be saved to repositories or passed to subsequent pipeline stages.',
    },
    sqlGeneration: {
      placeholder: 'Describe what you want to query...',
      send: 'Send',
      generatedSql: 'Generated SQL',
      copySql: 'Copy SQL',
      response: 'Response',
      clearChat: 'Clear',
      loading: 'Generating SQL...',
      error: 'Failed to generate SQL',
      noMessages: 'Start a conversation to generate SQL queries',
    },
  },

  fileNavigator: {
    open: 'Open',
    root: 'Root',
    rootDirectory: 'Root directory',
    deleteConfirmation: 'Are you sure you want to delete',

    errors: {
      invalidPath: 'Invalid path',
    },
  },

  // === WIZARDS ===
  wizard: {
    // Wizard Selector
    dataImport: 'Configure data import',
    dataImportDescription:
      'Import data from external sources into your repositories',
    dataExport: 'Configure data export',
    dataExportDescription:
      'Export data from repositories to external destinations',
    repositoryDescription: 'Create a new repository to store data',
    connectionDescription: 'Connect to external data sources',
    workflowDescription: 'Create automated data workflows',

    // Data Import Wizard Steps
    connectDataSource: 'Connect',
    setupRepository: 'Store',
    configure: 'Configure',
    reviewAndCreate: 'Review & create',
    setupDataImportWizard: 'Setup data import wizard',
    setupDataExportWizard: 'Setup data export wizard',

    // Data Export Wizard Steps
    selectDestination: 'Destination',
    selectRepository: 'Repository',
    selectExportDestination: 'Select Export Destination',
    selectExportDestinationDescription:
      'Choose where you want to export your data to',
    selectSourceRepository: 'Select Source Repository',
    selectSourceRepositoryDescription:
      'Choose the repository you want to export data from',
    configureExportSettings: 'Configure Export Settings',
    configureExportSettingsDescription:
      'Configure how data will be exported from your repository to the destination',
    reviewAndCreateExportWorkflow: 'Review & Create Export Workflow',
    reviewAndCreateExportWorkflowDescription:
      'Review your configuration and create the export workflow',

    // Connect Data Source Step
    connectToDataSource: 'Connect to Your Data Source',
    connectToDataSourceDescription:
      'Choose how you want to connect to your data source. You can use an existing connection or create a new one.',
    useExistingConnection: 'Use Existing Connection',
    createNewConnection: 'Create New Connection',
    selectFromExistingConnections: 'Select from your existing connections',
    setupNewConnectionToDataSource:
      'Set up a new connection to your data source',
    selectConnection: 'Select Connection',
    searchConnections: 'Search connections...',
    pleaseSelectConnection: 'Please select a connection',
    noConnectionsFound: 'No connections found matching your search.',
    noConnectionsAvailable: 'No connections available.',
    noDescription: 'No description',
    goToSupportPage: 'Go to support page',

    // Setup Repository Step
    setupRepositoryDescription:
      'Choose where to store your imported data. You can use an existing repository or create a new one.',
    selectFromExistingRepositories: 'Select from your existing repositories',
    searchRepositories: 'Search repositories...',
    defaultBranch: 'Default branch:',
    pleaseSelectRepository: 'Please select a repository',
    createNewRepositoryDescription: 'Create a new repository for your data',
    noRepositoriesFound: 'No repositories found matching your search.',
    noRepositoriesAvailable: 'No repositories available.',

    // Configure Import Step
    pleaseSpecifyImportPath: 'Please specify at least one import path',
    failedToConfigureImport: 'Failed to configure import settings',

    // Review and Create Step
    reviewYourSetup: 'Review Your Setup',
    reviewConfigurationDescription:
      'Review your configuration before creating the import workflow.',
    importPaths: 'Import paths:',
    connector: 'Connector:',
    destination: 'Destination:',
    branch: 'Branch:',
    settingUpDataImport: 'Setting up your data import...',
    creatingConnection: 'Creating connection',
    creatingRepository: 'Creating repository',
    creatingImportWorkflow: 'Creating import workflow',
    dataImportSetupCompleted: 'Data import setup completed successfully!',
    failedToCompleteSetup: 'Failed to complete setup. Please try again.',

    // Common wizard strings
    configureImportDescription:
      'Configure how data will be imported from your connection to the repository.',
    workflowInformation: 'Workflow Information',
    repositorySettings: 'Repository Settings',
    repositoryBranch: 'Repository Branch',
    fieldMappingsDescription:
      'Field mappings allow you to transform data during import. This feature will be available in the next step.',
    useExistingRepository: 'Use Existing Repository',

    // Export-specific strings
    exportFromRepositoryPaths: 'Export From Repository Paths',
    exportToConnectionPath: 'Export To Connection Path',
    exportPath: 'Export Path',
    exportPaths: 'Export Paths',
    exportDestination: 'Export Destination',
    sourceRepository: 'Source Repository',
    workflowDetails: 'Workflow Details',
    workflowName: 'Workflow Name',
    creatingExportWorkflow: 'Creating Export Workflow',
    creatingWorkflow: 'Creating Workflow',
    createExportWorkflow: 'Create Export Workflow',
    exportWorkflowCreatedSuccessfully: 'Export workflow created successfully!',

    // Additional missing translations
    pleaseEnterWorkflowName: 'Please enter a workflow name',
    pleaseEnterWorkflowDescription: 'Please enter a workflow description',
    pleaseSelectRepositoryBranch: 'Please select a repository branch',
    pleaseSelectRepositoryPaths: 'Please select repository paths',
    pleaseSelectConnectionPath: 'Please select a connection path',
    workflowNamePlaceholder: 'Enter workflow name',
    workflowDescriptionPlaceholder: 'Enter workflow description',
    workflowDocumentationPlaceholder: 'Enter workflow documentation',
    repositoryBranchPlaceholder: 'Enter repository branch',
    workflowDocumentation: 'Workflow Documentation',
    connection: 'Connection',
    repository: 'Repository',
    documentation: 'Documentation',
  },

  // === ASSISTANT ===
  assistant: {
    // Assistant Section
    title: 'Assistant',
    conversations: 'Conversations',
    noConversationSelectedDescription:
      'Select an existing conversation from the sidebar or create a new one to start chatting with the AI assistant.',
    noMessagesInTheConversation: 'No messages in the conversation',
    noMessagesInTheConversationDescription:
      'This conversation has no messages. Start by sending a message to the assistant.',
    assistantInterfaceError: 'Assistant Interface Error',
    failedToLoadAssistantInterface: 'Failed to load assistant interface',
    openInFullPage: 'Open in full page',
    contextAwareBanner:
      "I'm context-aware! I can see the page you are on, your open files, and selected objects.",

    // Conversations List
    newConversation: 'New Conversation',
    noConversations: 'No conversations yet',
    searchConversations: 'Search conversations...',
    noSearchResults: 'No conversations found',

    // Conversation Details
    created: 'Created',
    lastUpdated: 'Last updated',
    totalMessages: 'Total Messages',
    estimatedTokens: 'Estimated Tokens',
    deleteConversation: 'Delete Conversation',

    // Assistant Chat
    askMeAnything:
      'Ask me anything - coding, business, writing, or general questions...',

    // Chat Suggestions
    querySyntaxExamples: 'Show me query syntax examples',
    whatIsIrmin: 'What is Irmin?',
    whatRepositoriesDoIHave: 'What repositories do I have?',
    whatConnectionsAndWorkflowsDoIHave:
      'What connections and workflows do I have?',

    // Message Actions
    copyMessage: 'Copy message',
    messageCopied: 'Message copied to clipboard',
    copyFailed: 'Failed to copy message',

    // Tool and Reasoning Elements
    toolCalls: 'Tool Calls',
    thinkingSteps: 'Thinking Steps',
    iteration: 'Iteration',
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
    inviteUser: 'Invite a User',
    changeProfilePicture: 'Change profile picture',
    firstName: 'First name',
    lastName: 'Last name',
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
    createAPIToken: 'Create API token',
    validFor: 'Valid for (in seconds)',
    expiresAt: 'Expires at',
    expiresOn: 'Expires on',
    revokeToken: 'Revoke token',
    yourAPIToken: 'Your API Token',
    storeTokenDescription:
      'This token will only be shown once. Please copy it and store it securely.',
    tokenRevealed: 'Token Revealed',
    revealToken: 'Reveal token',
    copied: 'Copied!',
    copyToken: 'Copy token',
    explainer:
      'API tokens allow you to call the Irmin API or use Irmin MCP under your name with your permissions.',
    learnMoreApiDocs: 'Learn more in the API documentation',
    valueMustBePositive: 'Value must be positive',
    valueMustBeValidNumber: 'Value must be a valid number',
    valueTooLarge: 'Value is too large and would cause overflow',
    durations: {
      oneHour: '1 hour',
      sixHours: '6 hours',
      oneDay: '1 day',
      sevenDays: '7 days',
      thirtyDays: '30 days',
      ninetyDays: '90 days',
      custom: 'Custom (seconds)',
    },
  },

  policy: {
    title: 'Access Policies',
    description: 'Manage access policies and permissions',
    addPolicy: 'Add Policy',
    createPolicy: 'Create New Policy',
    editPolicy: 'Edit Policy',
    deletePolicyDescription:
      'Are you sure you want to delete this policy? This action cannot be undone.',
    effect: 'Effect',
    action: 'Action',
    resource: 'Resource',
    principal: 'Principal',
    resourceId: 'Resource ID (Optional)',
    error: 'Error loading policies',
    noPolicies: 'No policies found',
    creating: 'Creating...',
    effectAllow: 'Allow',
    effectDeny: 'Deny',
    actionRead: 'Read',
    principalWorkspaceUser: 'User',
    principalRole: 'Role',
    principalEveryone: 'Everyone',

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
    waitingForLogs: 'Waiting for logs...',
    waitingForResults: 'Waiting for results...',
  },

  // === DOCUMENTATION ===
  documentation: {
    documentation: 'Documentation',
    workspaceDocumentation: 'Workspace documentation',
    downloadPdf: 'Download PDF',
    startTypingDocumentation:
      'Start typing your documentation and notes here...',
    schema: 'Schema',
    workspace: 'Workspace',
    createdBy: 'Created by',
    searchPlaceholder: 'Search documentation...',
    summaryTitle: 'Workspace summary',
    summaryDescription:
      'Snapshot of repositories, connections, and workflows in this workspace.',
    workspaceIdentifier: 'Workspace identifier',
    repositorySectionDescription:
      'Ownership details, tags, and repository documentation.',
    repositorySearchEmptyTitle: 'No repositories match your search',
    repositorySearchEmptyDescription:
      'Adjust your search term to see repository documentation.',
    clearSearch: 'Clear search',
    visibilityLabel: 'Visibility',
    visibilityPrivate: 'Private',
    notesHeading: 'Notes',
    connectionSectionDescription:
      'Connection ownership, connector types, tags, and documentation.',
    connectionSearchEmptyTitle: 'No connections match your search',
    connectionSearchEmptyDescription:
      'Adjust your search term to see connection documentation.',
    workflowSectionDescription:
      'Workflow ownership, status, tags, and related resources.',
    workflowSearchEmptyTitle: 'No workflows match your search',
    workflowSearchEmptyDescription:
      'Adjust your search term to see workflow documentation.',
    scriptSectionDescription:
      'Executable scripts for data processing and automation.',
    scriptSearchEmptyTitle: 'No scripts match your search',
    scriptSearchEmptyDescription:
      'Adjust your search term to see script documentation.',
    querySectionDescription:
      'Saved SQL queries for data analysis and reporting.',
    querySearchEmptyTitle: 'No queries match your search',
    querySearchEmptyDescription:
      'Adjust your search term to see query documentation.',
    scheduleLabel: 'Schedule',
    workspaceEmptyTitle: 'Workspace is empty',
    workspaceEmptyDescription:
      'Start by creating your first repository, connection, or workflow to generate documentation.',
    goToWorkspace: 'Go to workspace',
    schemaTitle: 'Workspace schema',
    schemaIntro:
      'Visual overview of how connections, workflows, and repositories relate to each other.',
    schemaSearchPlaceholder: 'Search workflows or components...',
    dataFlowsTitle: 'Data flows',
    workflowRelationshipsEmptyDescription:
      'Adjust your search term to see workflow relationships.',
    componentDirectoryTitle: 'Component directory',
    directoryRepositoriesEmpty: 'No repositories defined.',
    directoryConnectionsEmpty: 'No connections defined.',
    referencedBy: 'Referenced by',
    unknownConnector: 'Unknown connector',
  },

  // === LIST COMPONENTS ===
  list: {
    status: 'Status',
    runs: 'Runs',
    viewAll: 'View all',
    lastUpdated: 'Last updated',
    createdAt: 'Created at',
    immutable: 'Immutable',
    searchPlaceholder: 'Type to search...',
    noItemsFound: 'No items found',
    noItems: 'No items found',

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
      workflowRunsForWorkflow: {
        title: 'This workflow has not yet been run',
        description:
          'Start by triggering a workflow run or wait until it is triggered by the schedule.',
      },
      allWorkflowRuns: {
        title: 'No workflow runs yet',
        description:
          'Workflow runs will appear here once workflows are executed. Trigger a workflow run or wait for scheduled workflows to run.',
      },
      connections: {
        title: 'No connections yet',
        description:
          'Connections allow you to import from and export to external data sources. Create your first connection to get started.',
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
      scripts: {
        title: 'No scripts yet',
        description: 'Create your first script to get started',
      },
      aiApplications: {
        title: 'No AI applications yet',
        description:
          'AI Applications let you expose your data to AI-powered tools and assistants. Create your first AI application to get started.',
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
    noFieldsToMap:
      'Field mappings are not available because one or both sides do not have predefined fields. Fields will be created automatically during the workflow execution.',
  },

  dataSizeWarning: {
    // Titles
    tableTooLarge: 'Table Too Large',
    jsonTooLarge: 'JSON Too Large',
    fileTooLarge: 'File Too Large',
    largeTableWarning: 'Large Table Warning',
    largeJsonWarning: 'Large JSON Warning',
    largeFileWarning: 'Large File Warning',

    // Messages - Errors
    tableTooLargeMessage:
      'This table is too large to render safely in your browser. Please download it as CSV instead.',
    jsonTooLargeMessage:
      'This JSON object is too large to render safely in your browser. Please download it instead.',
    fileTooLargeMessage:
      'This file is too large to display in your browser. Please download it instead.',

    // Messages - Warnings
    largeTableMessage:
      'This table is large and may cause performance issues. You can download it or try to render it anyway.',
    largeJsonMessage:
      'This JSON object is large and may cause performance issues. You can download it or try to render it anyway.',
    largeFileMessage: 'This file is large and may take time to load.',

    // Actions
    renderAnyway: 'Render Anyway',
    downloadCsv: 'Download CSV',

    // Additional info
    sizeLabel: 'Size:',
    performanceWarning:
      'Rendering large data may cause your browser to slow down or become unresponsive.',
  },

  // === SCHEMA BUILDER ===
  schemaBuilder: {
    builder: 'Schema Builder',
    rawJson: 'Raw JSON',
    invalidJson: 'Invalid JSON',
    type: 'Type',
    name: 'Name',
    path: 'Path',
    contentType: 'Content Type',
    size: 'Size',
    metadata: 'Metadata',
    restrictions: 'Restrictions',
    properties: 'Properties',
    addProperty: 'Add Property',
    constraints: 'Constraints',
    required: 'Required',
    format: 'Format',
    enum: 'Enum Values',
    enumPlaceholder: 'Enter values separated by commas',
    pattern: 'Pattern (Regex)',
    minLength: 'Min Length',
    maxLength: 'Max Length',
    minimum: 'Minimum',
    maximum: 'Maximum',
    minItems: 'Min Items',
    maxItems: 'Max Items',
    default: 'Default Value',
    items: 'Array Items',
    noStructured: 'No Structured Children',
    noBinary: 'No Binary Children',
    noGroups: 'No Group Children',
    onlyStructured: 'Only Structured Children',
    onlyBinary: 'Only Binary Children',
    onlyGroups: 'Only Group Children',
    allowedContentTypes: 'Allowed Content Types',
    restrictedContentTypes: 'Restricted Content Types',
    maxSize: 'Max Size (bytes)',
    minSize: 'Min Size (bytes)',
    maxCount: 'Max Count',
    minCount: 'Min Count',
    namePattern: 'Name Pattern (Regex)',
    types: {
      string: 'String',
      number: 'Number',
      integer: 'Integer',
      boolean: 'Boolean',
      object: 'Object',
      array: 'Array',
      null: 'Null',
    },
    formats: {
      email: 'Email',
      uri: 'URI',
      date: 'Date',
      'date-time': 'Date Time',
      time: 'Time',
      uuid: 'UUID',
      hostname: 'Hostname',
      ipv4: 'IPv4',
      ipv6: 'IPv6',
    },
    errors: {
      invalidRegex: 'Invalid regular expression',
      nameRequired: 'Property name is required',
    },
  },
};

export default en;
