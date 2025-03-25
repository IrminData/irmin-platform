package lib

import (
	"context"
	"fmt"
	"io"
	"irmin-api/utils"
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
