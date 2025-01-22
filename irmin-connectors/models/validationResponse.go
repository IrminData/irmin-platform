package connectorModels

type ValidationResponse struct {
	Ok                      bool     `json:"ok"`
	CanConnect              bool     `json:"can_connect"`
	ConnectionDetailsValid  bool     `json:"connection_details_valid"`
	ConnectionSettingsValid bool     `json:"connection_settings_valid"`
	Errors                  []string `json:"errors"`
}
