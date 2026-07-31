package connectorsclient

// NewOperationJobForTest constructs an OperationJob handle bound to
// the given Client with an explicit jobID and operationToken.
//
// Exported for the package's external _test.go files only — it lives
// in export_test.go so it's not compiled into the production package
// build. Production code obtains an OperationJob by calling
// Client.StartOperation{Pull,Push,Patch} which mint the handle from
// the server's 202 response.
func NewOperationJobForTest(c *Client, jobID, operationToken string) *OperationJob {
	return &OperationJob{
		JobID:          jobID,
		operationToken: operationToken,
		client:         c,
	}
}
