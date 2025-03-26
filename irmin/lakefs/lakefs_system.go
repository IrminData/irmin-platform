package lakefs

import "net/http"

// VersionConfig represents the version of the LakeFS server
type VersionConfig struct {
	Version            string `json:"version"`
	LatestVersion      string `json:"latest_version"`
	UpgradeRecommended bool   `json:"upgrade_recommended"`
	UpgradeURL         string `json:"upgrade_url"`
}

// StorageConfig represents the storage configuration of the LakeFS server
type StorageConfig struct {
	BlockstoreType           string            `json:"blockstore_type"`
	BlockstoreNamespace      string            `json:"blockstore_namespace"`
	BlockstoreNamespaceRegex string            `json:"blockstore_namespace_ValidityRegex"`
	DefaultNamespacePrefix   string            `json:"default_namespace_prefix"`
	PreSignSupport           bool              `json:"pre_sign_support"`
	PreSignSupportUI         bool              `json:"pre_sign_support_ui"`
	ImportSupport            bool              `json:"import_support"`
	ImportValidityRegex      string            `json:"import_validity_regex"`
	PreSignMultipartUpload   bool              `json:"pre_sign_multipart_upload"`
	BlockstoreID             string            `json:"blockstore_id"`
	BlockstoreDescription    string            `json:"blockstore_description"`
	BlockstoreExtras         map[string]string `json:"blockstore_extras"` // Additional blockstore-specific configuration
}

// Config represents the full configuration of the LakeFS server
type Config struct {
	VersionConfig     VersionConfig   `json:"version_config"`
	StorageConfig     StorageConfig   `json:"storage_config"`
	StorageConfigList []StorageConfig `json:"storage_config_list"`
}

// Healthcheck performs a healthcheck on the LakeFS server to make sure that the API server is up and running
func (c *Client) Healthcheck() error {
	return c.doRequest("GET", "/healthcheck", nil, []int{http.StatusNoContent, http.StatusOK}, nil)
}

// GetConfig retrieves the configuration of the connected LakeFS server
func (c *Client) GetConfig() (*Config, error) {
	var config Config
	if err := c.doRequest("GET", "/config", nil, []int{http.StatusOK}, &config); err != nil {
		return nil, err
	}
	return &config, nil
}
