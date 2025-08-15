# Irmin Core Concepts

### "Everything is a File" Philosophy

Irmin follows the principle that all data should be treated as files:

- **Database Tables** → CSV, Parquet, or other files
- **3rd Party API Responses** → JSON files
- **Documents** → Files in their original format (PDF, Word, etc)
- **Media Content** → Binary files (Images, Videos, etc)

This approach provides consistency regardless of the underlying data source and simplifies data handling across different systems.

This applies when moving data between Irmin and external systems, storing data in Irmin, and other Irmin operations.

## Object Schemas

The MCP doesn't have access to directly query connection data or view full repository objects. Instead schemas, eg. explanations of the data outline are used. 

## Workspaces

Workspaces are collaborative environments for data management. Users with specific permissions can access the data in a workspace, manage repositories, workflows, connections, and more.

Most things in Irmin are scoped to a workspace.

## Connectors and Connections

Connectors are a universal way to interact with external services, data sources, and export targets. They are external applications that interface with Irmin for data movement operations.

Connections are stored configuration definitions, like credentials and settings, for interacting with external systems using Connectors. These connections can then be used in workflows to move data between Irmin and the external system.

## Workflows

Workflows are the backbone of automation within Irmin. They define a series of automated tasks that interact with internal and external data sources, enabling seamless data movement and processing.

Workflow executions are triggered based on the assigned `Schedule`, according to triggers, which can be time or event based. Workflows can be triggered manually by the user as well, by creating a new run. 

Each execution of a workflow is a new `Workflow Run`, and can be viewed in the workflow run history. Each run has a status and logs.

Types:

- Import: Facilitate the ingestion of data from external sources into Irmin repositories.
- Export: Enable the transfer of data from Irmin repositories to external systems or destinations.
- Action: Execute custom scripts or actions on data within Irmin repositories.
- Pipeline: Move data through a series of stages, passing results from one stage to the next.

## Repositories

Repositories are the base of data management on Irmin.

They serve as structured containers for various data object files, within a workspace.

Repositories store the results of workflows or contain manually uploaded data, essentially functioning in a similar way as Git - a version controlled file system.

Irmin implements Git-like versioning for data, enabling:

- **Immutable History**: Every change creates a new version
- **Branch Management**: Work on different data versions simultaneously
- **Merge Operations**: Combine changes from different branches
- **Rollback Capability**: Revert to previous data states

### Branches

Branches are used to manage different versions of the data in a repository.

They are similar to Git branches, and can be used to create a new version of the data in a repository.

### Commits

Commits are used to create a new version of the data in a repository.

They are similar to Git commits, and can be used to create a new version of the data in a repository.

### Tags

Tags are used to create a new version of the data in a repository.

They are similar to Git tags, and can be used to create a new version of the data in a repository.

### Objects

Objects are the data files stored in a repository.

They are similar to Git objects, and can be used to store the data in a repository.

