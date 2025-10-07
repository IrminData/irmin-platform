package bucket

import (
	"context"
	"fmt"
	"io"
	"irmin-api/db"
	"irmin-api/utils"
	"os"
	"path/filepath"
	"strings"

	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/aws/aws-sdk-go-v2/service/s3/types"

	fiberS3 "github.com/gofiber/storage/s3/v2"
	"gorm.io/gorm"
)

// Client is a client for interacting with S3 for storing and retrieving files.
type Client struct {
	fiberS3.Storage
	Bucket   string
	Endpoint string
	Region   string
	Env      *utils.CoreAPIEnv
	DB       *db.Database
}

// CreateClient creates a new S3 client.
func CreateClient(env *utils.CoreAPIEnv, bucketName string, database *db.Database) (*Client, error) {
	// Define the S3 bucket client configuration
	config := fiberS3.Config{
		Bucket:   bucketName,
		Endpoint: env.S3Endpoint,
		Region:   env.S3Region,
		Credentials: fiberS3.Credentials{
			AccessKey:       env.S3AccessKeyID,
			SecretAccessKey: env.S3AccessSecret,
		},
	}

	// Initialize the bucket config
	store := fiberS3.New(config)

	return &Client{
		Storage:  *store,
		Bucket:   bucketName,
		Endpoint: env.S3Endpoint,
		Region:   env.S3Region,
		Env:      env,
		DB:       database,
	}, nil
}

func (bucket *Client) ListObjects(ctx context.Context, keyPrefix string) ([]types.Object, error) {
	objects, listObjectsErr := bucket.Conn().ListObjectsV2(ctx, &s3.ListObjectsV2Input{
		Bucket: &bucket.Bucket,
		Prefix: &keyPrefix,
	})
	if listObjectsErr != nil {
		return nil, fmt.Errorf("error listing objects: %w", listObjectsErr)
	}

	return objects.Contents, nil
}

func (bucket *Client) WritePath(ctx context.Context, key string, content string, tx ...*gorm.DB) error {
	// If a transaction is provided, acquire advisory lock within that transaction
	if len(tx) > 0 && tx[0] != nil {
		// Create a lock key based on bucket and key to prevent race conditions
		lockKey := fmt.Sprintf("bucket_write:%s:%s", bucket.Bucket, key)

		// Acquire advisory lock to prevent concurrent writes to the same key
		if lockErr := db.LockKeyTx(tx[0], lockKey); lockErr != nil {
			return fmt.Errorf(
				"failed to acquire advisory lock for bucket write to key %s: %w",
				key,
				lockErr,
			)
		}
	}

	// Perform the S3 write operation (no transaction needed for S3)
	_, putObjectErr := bucket.Conn().PutObject(ctx, &s3.PutObjectInput{
		Bucket: &bucket.Bucket,
		Key:    &key,
		Body:   strings.NewReader(content),
	})
	if putObjectErr != nil {
		return fmt.Errorf("error writing object to bucket: %w", putObjectErr)
	}

	return nil
}

func (bucket *Client) DeletePath(ctx context.Context, keyPrefix string, tx ...*gorm.DB) error {
	// If a transaction is provided, acquire advisory lock within that transaction
	if len(tx) > 0 && tx[0] != nil {
		// Create a lock key based on bucket and key prefix to prevent race conditions
		lockKey := fmt.Sprintf("bucket_delete:%s:%s", bucket.Bucket, keyPrefix)

		// Acquire advisory lock to prevent concurrent deletions of the same prefix
		if lockErr := db.LockKeyTx(tx[0], lockKey); lockErr != nil {
			return fmt.Errorf(
				"failed to acquire advisory lock for bucket delete of prefix %s: %w",
				keyPrefix,
				lockErr,
			)
		}
	}

	// Perform the S3 delete operations (no transaction needed for S3)
	// List all objects under the given prefix
	objects, listObjectsErr := bucket.ListObjects(ctx, keyPrefix)
	if listObjectsErr != nil {
		return fmt.Errorf("error listing objects for deletion: %w", listObjectsErr)
	}

	// Delete each object found under the workspace prefix
	for _, item := range objects {
		_, deleteObjectErr := bucket.Conn().DeleteObject(ctx, &s3.DeleteObjectInput{
			Bucket: &bucket.Bucket,
			Key:    item.Key,
		})
		if deleteObjectErr != nil {
			return fmt.Errorf("error deleting object %s: %w", *item.Key, deleteObjectErr)
		}
	}

	return nil
}

func (bucket *Client) ReadPath(ctx context.Context, key string) (*string, error) {
	// Retrieve the file from S3
	obj, getObjectErr := bucket.Conn().GetObject(ctx, &s3.GetObjectInput{
		Bucket: &bucket.Bucket,
		Key:    &key,
	})
	if getObjectErr != nil {
		return nil, fmt.Errorf("failed to get the object from the bucket: %w", getObjectErr)
	}
	defer obj.Body.Close()

	// Read the object's content
	contentBytes, readObjectErr := io.ReadAll(obj.Body)
	if readObjectErr != nil {
		return nil, fmt.Errorf("failed to read the object's content: %w", readObjectErr)
	}

	content := string(contentBytes)
	return &content, nil
}

func (bucket *Client) DuplicatePath(
	ctx context.Context,
	sourceKey, destKey string,
	removeOriginal bool,
	tx ...*gorm.DB,
) error {
	// If a transaction is provided, acquire advisory lock within that transaction
	if len(tx) > 0 && tx[0] != nil {
		// Create a lock key based on bucket and both source and destination keys to prevent race conditions
		lockKey := fmt.Sprintf("bucket_duplicate:%s:%s:%s", bucket.Bucket, sourceKey, destKey)

		// Acquire advisory lock to prevent concurrent duplicate operations involving the same paths
		if lockErr := db.LockKeyTx(tx[0], lockKey); lockErr != nil {
			return fmt.Errorf(
				"failed to acquire advisory lock for bucket duplicate from %s to %s: %w",
				sourceKey,
				destKey,
				lockErr,
			)
		}
	}

	// Perform the S3 duplicate operations (no transaction needed for S3)
	// List objects under the source prefix
	objects, listObjectsErr := bucket.ListObjects(ctx, sourceKey)
	if listObjectsErr != nil {
		return fmt.Errorf("error listing objects for copying: %w", listObjectsErr)
	}

	// For each object, copy to the destination and then delete the original
	for _, item := range objects {
		// Compute the relative path after the source prefix
		relPath := strings.TrimPrefix(*item.Key, sourceKey)
		itemDestKey := destKey + relPath

		// Construct the copy source (bucket/key)
		copySource := bucket.Bucket + "/" + *item.Key
		_, copyObjectErr := bucket.Conn().CopyObject(ctx, &s3.CopyObjectInput{
			Bucket:     &bucket.Bucket,
			CopySource: &copySource,
			Key:        &itemDestKey,
		})
		if copyObjectErr != nil {
			return fmt.Errorf("error copying object %s: %w", *item.Key, copyObjectErr)
		}

		// Delete the original object if requested
		if removeOriginal {
			_, deleteObjectErr := bucket.Conn().DeleteObject(ctx, &s3.DeleteObjectInput{
				Bucket: &bucket.Bucket,
				Key:    item.Key,
			})
			if deleteObjectErr != nil {
				return fmt.Errorf("error deleting object %s: %w", *item.Key, deleteObjectErr)
			}
		}
	}

	return nil
}

// DownloadFolder downloads all objects under the given folder prefix from the S3 bucket
// and saves them to the specified local directory. It creates any necessary local directories.
// - ctx: the context for the request
// - folderPrefix: the prefix for the folder in the bucket
// - localDir: the local directory where files will be saved
// Returns an error if any step fails.
func (bucket *Client) DownloadFolder(ctx context.Context, folderPrefix, localDir string) error {
	// List all objects under the given folder prefix
	objects, listObjectsErr := bucket.ListObjects(ctx, folderPrefix)
	if listObjectsErr != nil {
		return fmt.Errorf("error listing objects for download: %w", listObjectsErr)
	}

	// Loop through each object and download its content
	for _, object := range objects {
		if err := bucket.downloadObject(ctx, &object, folderPrefix, localDir); err != nil {
			return err
		}
	}

	return nil
}

// ensureLocalDir ensures the local directory exists and is a directory.
func ensureLocalDir(dir string) error {
	// If a file exists where a directory should be, remove it
	if stat, statErr := os.Stat(dir); statErr == nil && !stat.IsDir() {
		if removeErr := os.Remove(dir); removeErr != nil {
			return fmt.Errorf("error removing conflicting file at %s: %w", dir, removeErr)
		}
	}

	// Create local directory structure if it does not exist
	if mkdirAllErr := os.MkdirAll(dir, 0750); mkdirAllErr != nil {
		return fmt.Errorf("error creating directory %s: %w", dir, mkdirAllErr)
	}

	return nil
}

// downloadObject downloads a single object from S3 to a local file.
func (bucket *Client) downloadObject(ctx context.Context, object *types.Object, folderPrefix, localDir string) error {
	if object.Key == nil {
		return nil // Skip objects with nil key
	}

	// Compute the relative path by removing the folder prefix from the object key
	relPath := strings.TrimPrefix(*object.Key, folderPrefix)
	// Skip folder placeholder objects or empty relative paths
	if relPath == "" || strings.HasSuffix(*object.Key, "/") {
		return nil
	}

	// Construct the local file path
	localPath := filepath.Join(localDir, relPath)
	// Determine the directory portion of the local path
	dir := filepath.Dir(localPath)

	if err := ensureLocalDir(dir); err != nil {
		return err
	}

	// Retrieve the object from S3
	obj, getObjectErr := bucket.Conn().GetObject(ctx, &s3.GetObjectInput{
		Bucket: &bucket.Bucket,
		Key:    object.Key,
	})
	if getObjectErr != nil {
		return fmt.Errorf("failed to get object %s: %w", *object.Key, getObjectErr)
	}

	// Open the local file for writing
	file, createFileErr := os.Create(localPath)
	if createFileErr != nil {
		if closeErr := obj.Body.Close(); closeErr != nil {
			return fmt.Errorf(
				"failed to close S3 object body after file creation error: %w (original error: %w)",
				closeErr,
				createFileErr,
			)
		}
		return fmt.Errorf("failed to create local file %s: %w", localPath, createFileErr)
	}

	// Copy the object's content to the local file
	_, copyErr := io.Copy(file, obj.Body)

	// Close both file and S3 object body and handle any errors
	if closeErr := file.Close(); closeErr != nil {
		if copyErr != nil {
			return fmt.Errorf("error closing file after copy error: %w (copy error: %w)", closeErr, copyErr)
		}
		return fmt.Errorf("error closing file: %w", closeErr)
	}

	if closeErr := obj.Body.Close(); closeErr != nil {
		if copyErr != nil {
			return fmt.Errorf(
				"error closing S3 object body after copy error: %w (copy error: %w)",
				closeErr,
				copyErr,
			)
		}
		return fmt.Errorf("error closing S3 object body: %w", closeErr)
	}

	if copyErr != nil {
		return fmt.Errorf("error writing to local file %s: %w", localPath, copyErr)
	}

	return nil
}
