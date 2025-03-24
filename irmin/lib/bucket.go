package lib

import (
	"irmin-api/utils"

	"github.com/gofiber/storage/s3/v2"
)

type BucketClient struct {
	s3.Storage
}

func CreateBucketClient() (*BucketClient, error) {
	// Get the environment variables
	env, err := utils.LoadEnv()
	if err != nil {
		return nil, err
	}

	// Define the S3 bucket client configuration
	config := s3.Config{
		Bucket:   env.S3Bucket,
		Endpoint: env.S3Endpoint,
		Region:   env.S3Region,
		Credentials: s3.Credentials{
			AccessKey:       env.S3AccessKeyID,
			SecretAccessKey: env.S3AccessSecret,
		},
	}

	// Initialize the bucket config
	store := s3.New(config)

	return &BucketClient{
		*store,
	}, nil
}
