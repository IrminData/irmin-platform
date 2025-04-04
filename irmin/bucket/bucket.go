package bucket

import (
	"context"
	"fmt"
	"io"
	"irmin-api/utils"
	"os"
	"path/filepath"
	"strings"

	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/aws/aws-sdk-go-v2/service/s3/types"

	fiberS3 "github.com/gofiber/storage/s3/v2"
)

type BucketClient struct {
	fiberS3.Storage
	Bucket   string
	Endpoint string
	Region   string
}

func CreateBucketClient() (*BucketClient, error) {
	// Get the environment variables
	env, err := utils.LoadEnv()
	if err != nil {
		return nil, err
	}

	// Define the S3 bucket client configuration
	config := fiberS3.Config{
		Bucket:   env.S3Bucket,
		Endpoint: env.S3Endpoint,
		Region:   env.S3Region,
		Credentials: fiberS3.Credentials{
			AccessKey:       env.S3AccessKeyID,
			SecretAccessKey: env.S3AccessSecret,
		},
	}

	// Initialize the bucket config
	store := fiberS3.New(config)

	return &BucketClient{
		Storage:  *store,
		Bucket:   env.S3Bucket,
		Endpoint: env.S3Endpoint,
		Region:   env.S3Region,
	}, nil
}

func (bucket *BucketClient) ListObjects(ctx context.Context, keyPrefix string) ([]types.Object, error) {
	objects, err := bucket.Conn().ListObjects(ctx, &s3.ListObjectsInput{
		Bucket: &bucket.Bucket,
		Prefix: &keyPrefix,
	})
	if err != nil {
		return nil, fmt.Errorf("error listing objects: %v", err)
	}

	return objects.Contents, nil
}

func (bucket *BucketClient) WritePath(ctx context.Context, key string, content string) error {
	_, err := bucket.Conn().PutObject(ctx, &s3.PutObjectInput{
		Bucket: &bucket.Bucket,
		Key:    &key,
		Body:   strings.NewReader(content),
	})
	if err != nil {
		return fmt.Errorf("error writing object to bucket: %v", err)
	}

	return nil
}

func (bucket *BucketClient) DeletePath(ctx context.Context, keyPrefix string) error {
	// List all objects under the given prefix
	objects, err := bucket.ListObjects(ctx, keyPrefix)
	if err != nil {
		return fmt.Errorf("error listing objects for deletion: %v", err)
	}

	// Delete each object found under the workspace prefix
	for _, item := range objects {
		_, err := bucket.Conn().DeleteObject(ctx, &s3.DeleteObjectInput{
			Bucket: &bucket.Bucket,
			Key:    item.Key,
		})
		if err != nil {
			return fmt.Errorf("error deleting object %s: %v", *item.Key, err)
		}
	}

	return nil
}

func (bucket *BucketClient) ReadPath(ctx context.Context, key string) (*string, error) {
	// Retrieve the file from S3
	obj, err := bucket.Conn().GetObject(ctx, &s3.GetObjectInput{
		Bucket: &bucket.Bucket,
		Key:    &key,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to get the object from the bucket: %v", err)
	}
	defer obj.Body.Close()

	// Read the object's content
	contentBytes, err := io.ReadAll(obj.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read the object's content: %v", err)
	}

	content := string(contentBytes)
	return &content, nil
}

func (bucket *BucketClient) DuplicatePath(ctx context.Context, sourceKey, destKey string, remove_original bool) error {
	// List objects under the source prefix
	objects, err := bucket.ListObjects(ctx, sourceKey)
	if err != nil {
		return fmt.Errorf("error listing objects for copying: %v", err)
	}

	// For each object, copy to the destination and then delete the original
	for _, item := range objects {
		// Compute the relative path after the source prefix
		relPath := strings.TrimPrefix(*item.Key, sourceKey)
		destKey := destKey + relPath

		// Construct the copy source (bucket/key)
		copySource := bucket.Bucket + "/" + *item.Key
		_, err := bucket.Conn().CopyObject(ctx, &s3.CopyObjectInput{
			Bucket:     &bucket.Bucket,
			CopySource: &copySource,
			Key:        &destKey,
		})
		if err != nil {
			return fmt.Errorf("error copying object %s: %v", *item.Key, err)
		}

		// Delete the original object if requested
		if remove_original {
			_, err = bucket.Conn().DeleteObject(ctx, &s3.DeleteObjectInput{
				Bucket: &bucket.Bucket,
				Key:    item.Key,
			})
			if err != nil {
				return fmt.Errorf("error deleting object %s: %v", *item.Key, err)
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
func (bucket *BucketClient) DownloadFolder(ctx context.Context, folderPrefix, localDir string) error {
	// List all objects under the given folder prefix
	objects, err := bucket.ListObjects(ctx, folderPrefix)
	if err != nil {
		return fmt.Errorf("error listing objects for download: %v", err)
	}

	// Loop through each object and download its content
	for _, object := range objects {
		if object.Key == nil {
			// Skip objects with nil key
			continue
		}

		// Compute the relative path by removing the folder prefix from the object key
		relPath := strings.TrimPrefix(*object.Key, folderPrefix)
		// Construct the local file path
		localPath := filepath.Join(localDir, relPath)

		// Create local directory structure if it does not exist
		dir := filepath.Dir(localPath)

		// Check if the target directory exists but is not a directory
		if stat, err := os.Stat(dir); err == nil && !stat.IsDir() {
			// Remove the file that conflicts with the directory path
			if err := os.Remove(dir); err != nil {
				return fmt.Errorf("error removing conflicting file at %s: %v", dir, err)
			}
		}

		if err := os.MkdirAll(dir, 0755); err != nil {
			return fmt.Errorf("error creating directory %s: %v", dir, err)
		}

		// Retrieve the object from S3
		obj, err := bucket.Conn().GetObject(ctx, &s3.GetObjectInput{
			Bucket: &bucket.Bucket,
			Key:    object.Key,
		})
		if err != nil {
			return fmt.Errorf("failed to get object %s: %v", *object.Key, err)
		}

		// Open the local file for writing
		file, err := os.Create(localPath)
		if err != nil {
			obj.Body.Close() // ensure the S3 object body is closed before returning
			return fmt.Errorf("failed to create local file %s: %v", localPath, err)
		}

		// Copy the object's content to the local file
		_, err = io.Copy(file, obj.Body)
		// Close both file and S3 object body immediately after the copy
		file.Close()
		obj.Body.Close()

		if err != nil {
			return fmt.Errorf("error writing to local file %s: %v", localPath, err)
		}
	}

	return nil
}
