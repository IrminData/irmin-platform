package irminModels

type CustomFieldValues map[string]string

type Connection struct {
	ID            string            `json:"id"`
	Name          string            `json:"name"`
	Description   string            `json:"description"`
	Documentation string            `json:"documentation"`
	Details       CustomFieldValues `json:"details"`
	Settings      CustomFieldValues `json:"settings"`
	Owner         User              `json:"owner"`
	Connector     Connector         `json:"connector"`
}
