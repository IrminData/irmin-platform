# Bucket Storage

S3-compatible cloud storage client for managing object storage operations. Provides abstraction layer for cloud storage interactions with support for AWS S3 and compatible services.

## Purpose

Handles cloud storage operations for:

- **Object Management**: Upload, download, and delete objects
- **Bucket Operations**: Create, configure, and manage storage buckets
- **Path Management**: Directory-style path operations in object storage
- **Lifecycle Management**: Automated cleanup and storage optimization
- **Storage Cleanup**: Repository deletion and data cleanup operations

## Key Features

- **S3 Compatibility**: Works with AWS S3 and S3-compatible services
- **Bulk Operations**: Efficient handling of multiple objects
- **Path-Based Operations**: Directory-style operations over object storage
- **Error Handling**: Robust error handling for network and storage issues
- **Configuration**: Flexible configuration for different cloud providers

## Use Cases

- **Repository Storage**: Backend storage for LakeFS repositories
- **Editor Storage**: File storage for the code editor and workspace scripts
- **Data Cleanup**: Remove storage when repositories are deleted
- **Backup Operations**: Data backup and archival processes
- **Storage Management**: Monitor and manage storage usage

## Integration

Used by the **Data Engine** for:

- Repository storage namespace management
- Storage cleanup during repository deletion
- Backend storage operations for LakeFS integration

Used by **Controllers** for:

- Editor file operations (create, read, update, delete)
- Code editor workspace management and script storage

## Configuration

Supports standard S3 configuration including:

- AWS credentials and region settings
- Custom S3-compatible endpoint configuration
- Bucket naming and path conventions
- Storage class and lifecycle policies
