// Package toolregistry owns the canonical Irmin tool contract.
package toolregistry

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"regexp"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/google/jsonschema-go/jsonschema"
	sdkmcp "github.com/modelcontextprotocol/go-sdk/mcp"
)

const CatalogVersion = 1

const (
	minimumCanonicalNameParts = 2
	executionTimeout          = 5 * time.Minute
	defaultTimeout            = 30 * time.Second
)

type Risk string

const (
	RiskRead        Risk = "read"
	RiskWrite       Risk = "write"
	RiskDestructive Risk = "destructive"
)

type CancellationPolicy struct {
	Cancellable bool  `json:"cancellable"`
	TimeoutMS   int64 `json:"timeout_ms"`
}

type AuditRedaction struct {
	Fields []string `json:"fields"`
}

// AuditRedactionFor returns the catalog-owned redaction policy for a tool.
func AuditRedactionFor(name string) AuditRedaction {
	fields := []string{"api_key", "authorization", "configuration", "content", "password", "secret", "token"}
	if strings.HasPrefix(name, "irmin_custom_") {
		fields = append(fields, "headers")
	}
	return AuditRedaction{Fields: fields}
}

// RedactForAudit recursively replaces descriptor-selected fields before persistence.
func RedactForAudit(input any, policy AuditRedaction) any {
	encoded, err := json.Marshal(input)
	if err != nil {
		return map[string]any{"redacted": true}
	}
	var value any
	if unmarshalErr := json.Unmarshal(encoded, &value); unmarshalErr != nil {
		return map[string]any{"redacted": true}
	}
	redacted := make(map[string]struct{}, len(policy.Fields))
	for _, field := range policy.Fields {
		redacted[strings.ToLower(field)] = struct{}{}
	}
	return redactValue(value, redacted)
}

func redactValue(value any, redacted map[string]struct{}) any {
	switch typed := value.(type) {
	case map[string]any:
		for key, child := range typed {
			if _, ok := redacted[strings.ToLower(key)]; ok {
				typed[key] = "[REDACTED]"
				continue
			}
			typed[key] = redactValue(child, redacted)
		}
	case []any:
		for index, child := range typed {
			typed[index] = redactValue(child, redacted)
		}
	}
	return value
}

// ToolOutput is the stable structured MCP result envelope.
type ToolOutput struct {
	Data any `json:"data"`
}

// OutputFromResult adapts legacy JSON text results into the canonical structured envelope.
func OutputFromResult(result *sdkmcp.CallToolResult) ToolOutput {
	if result == nil || result.IsError || len(result.Content) == 0 {
		return ToolOutput{}
	}
	text, ok := result.Content[0].(*sdkmcp.TextContent)
	if !ok {
		return ToolOutput{}
	}
	var data any
	if err := json.Unmarshal([]byte(text.Text), &data); err != nil {
		return ToolOutput{Data: text.Text}
	}
	return ToolOutput{Data: data}
}

type Handler func(
	context.Context,
	*sdkmcp.CallToolRequest,
	json.RawMessage,
) (*sdkmcp.CallToolResult, ToolOutput, error)

type ApprovalStager func(
	context.Context,
	Descriptor,
	*sdkmcp.CallToolRequest,
	json.RawMessage,
) (*sdkmcp.CallToolResult, ToolOutput, error)

var ErrApprovalRequired = errors.New("destructive tool requires authenticated approval")

type approvalKey struct{}

// WithApproval marks an approval replay after the operation was atomically claimed.
func WithApproval(ctx context.Context) context.Context {
	return context.WithValue(ctx, approvalKey{}, true)
}

type workspaceBindingKey struct{}

// WithWorkspaceBinding binds a user-token MCP session to the selected workspace.
func WithWorkspaceBinding(ctx context.Context, workspaceSlug string) context.Context {
	return context.WithValue(ctx, workspaceBindingKey{}, workspaceSlug)
}

func validateWorkspaceBinding(ctx context.Context, arguments json.RawMessage) error {
	bound, _ := ctx.Value(workspaceBindingKey{}).(string)
	if bound == "" || len(arguments) == 0 {
		return nil
	}
	var input map[string]json.RawMessage
	if err := json.Unmarshal(arguments, &input); err != nil {
		return err
	}
	raw, hasWorkspace := input["workspace_slug"]
	if !hasWorkspace {
		return nil
	}
	var requested string
	if err := json.Unmarshal(raw, &requested); err != nil {
		return errors.New("workspace_slug must be a string")
	}
	if requested != bound {
		return errors.New("tool workspace does not match the authenticated agent workspace")
	}
	return nil
}

type Descriptor struct {
	Name            string             `json:"name"`
	CatalogVersion  int                `json:"catalog_version"`
	Domain          string             `json:"domain"`
	Action          string             `json:"action"`
	Description     string             `json:"description"`
	Summary         string             `json:"summary"`
	ApprovalPreview string             `json:"approval_preview"`
	Risk            Risk               `json:"risk"`
	Capability      string             `json:"capability"`
	InputSchema     any                `json:"input_schema"`
	OutputSchema    any                `json:"output_schema"`
	Cancellation    CancellationPolicy `json:"cancellation"`
	AuditRedaction  AuditRedaction     `json:"audit_redaction"`
	Handler         Handler            `json:"-"`
}

type Registry struct {
	mu          sync.RWMutex
	descriptors map[string]Descriptor
	stager      ApprovalStager
}

func New(stager ...ApprovalStager) *Registry {
	registry := &Registry{descriptors: make(map[string]Descriptor)}
	if len(stager) > 0 {
		registry.stager = stager[0]
	}
	return registry
}

func (r *Registry) Add(descriptor Descriptor) error {
	if err := ValidateDescriptor(descriptor); err != nil {
		return err
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	if existing, ok := r.descriptors[descriptor.Name]; ok && existing.Handler != nil {
		return fmt.Errorf("tool %q already registered", descriptor.Name)
	}
	r.descriptors[descriptor.Name] = descriptor
	return nil
}

func (r *Registry) List() []Descriptor {
	r.mu.RLock()
	defer r.mu.RUnlock()
	result := make([]Descriptor, 0, len(r.descriptors))
	for _, descriptor := range r.descriptors {
		descriptor.Handler = nil
		result = append(result, descriptor)
	}
	sort.Slice(result, func(i, j int) bool { return result[i].Name < result[j].Name })
	return result
}

func (r *Registry) Get(name string) (Descriptor, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	descriptor, ok := r.descriptors[name]
	return descriptor, ok
}

func (r *Registry) Execute(
	ctx context.Context,
	name string,
	request *sdkmcp.CallToolRequest,
	arguments json.RawMessage,
) (*sdkmcp.CallToolResult, ToolOutput, error) {
	descriptor, ok := r.Get(name)
	if !ok || descriptor.Handler == nil {
		return nil, ToolOutput{}, fmt.Errorf("unknown tool %q", name)
	}
	if err := ctx.Err(); err != nil {
		return nil, ToolOutput{}, err
	}
	if err := validateWorkspaceBinding(ctx, arguments); err != nil {
		return nil, ToolOutput{}, err
	}
	if descriptor.Cancellation.TimeoutMS > 0 {
		var cancel context.CancelFunc
		ctx, cancel = context.WithTimeout(ctx, time.Duration(descriptor.Cancellation.TimeoutMS)*time.Millisecond)
		defer cancel()
	}
	approved, _ := ctx.Value(approvalKey{}).(bool)
	if descriptor.Risk == RiskDestructive && !approved {
		if r.stager == nil {
			return nil, ToolOutput{}, ErrApprovalRequired
		}
		return r.stager(ctx, descriptor, request, arguments)
	}
	return descriptor.Handler(ctx, request, arguments)
}

var validName = regexp.MustCompile(`^irmin_[a-z0-9]+(?:_[a-z0-9]+)+$`)
var invalidNamePart = regexp.MustCompile(`[^a-z0-9]+`)

// CanonicalCustomName turns an administrator-defined label into a stable catalog name.
func CanonicalCustomName(label string) string {
	action := strings.Trim(invalidNamePart.ReplaceAllString(strings.ToLower(label), "_"), "_")
	if action == "" {
		action = "tool"
	}
	return "irmin_custom_" + action
}

func ValidateDescriptor(descriptor Descriptor) error {
	if !validName.MatchString(descriptor.Name) {
		return fmt.Errorf("invalid canonical tool name %q", descriptor.Name)
	}
	if descriptor.CatalogVersion != CatalogVersion {
		return errors.New("invalid tool catalog version")
	}
	if descriptor.Domain == "" || descriptor.Action == "" || descriptor.Capability == "" {
		return errors.New("tool domain, action, and capability are required")
	}
	if descriptor.Handler == nil {
		return errors.New("tool handler is required")
	}
	return nil
}

// Describe returns the canonical policy metadata shared by registration, prompts, and audit adapters.
func Describe(name, description string) Descriptor {
	domain, action := splitName(name)
	risk := inferRisk(action)
	if description == "" {
		description = strings.ReplaceAll(strings.TrimPrefix(name, "irmin_"), "_", " ")
	}
	return Descriptor{
		Name:            name,
		CatalogVersion:  CatalogVersion,
		Domain:          domain,
		Action:          action,
		Description:     description,
		Summary:         description,
		ApprovalPreview: fmt.Sprintf("%s %s", action, strings.ReplaceAll(domain, "_", " ")),
		Risk:            risk,
		Capability:      inferCapability(domain, action, risk),
		Cancellation: CancellationPolicy{
			Cancellable: true,
			TimeoutMS:   inferTimeout(action).Milliseconds(),
		},
		AuditRedaction: AuditRedactionFor(name),
	}
}

// Register binds one typed handler to both the MCP SDK and the canonical registry.
func Register[In any](
	registry *Registry,
	server *sdkmcp.Server,
	name string,
	description string,
	handler sdkmcp.ToolHandlerFor[In, ToolOutput],
) {
	inputSchema, err := jsonschema.For[In](nil)
	if err != nil {
		panic(fmt.Sprintf("derive input schema for %s: %v", name, err))
	}
	inputSchema.AdditionalProperties = &jsonschema.Schema{Not: &jsonschema.Schema{}}
	outputSchema, err := jsonschema.For[ToolOutput](nil)
	if err != nil {
		panic(fmt.Sprintf("derive output schema for %s: %v", name, err))
	}
	outputSchema.AdditionalProperties = &jsonschema.Schema{Not: &jsonschema.Schema{}}
	descriptor := Describe(name, description)
	descriptor.InputSchema = inputSchema
	descriptor.OutputSchema = outputSchema
	descriptor.Handler = func(ctx context.Context, request *sdkmcp.CallToolRequest, raw json.RawMessage) (
		*sdkmcp.CallToolResult,
		ToolOutput,
		error,
	) {
		var input In
		if len(raw) > 0 {
			if unmarshalErr := json.Unmarshal(raw, &input); unmarshalErr != nil {
				return nil, ToolOutput{}, fmt.Errorf("decode %s input: %w", name, unmarshalErr)
			}
		}
		return handler(ctx, request, input)
	}
	if addErr := registry.Add(descriptor); addErr != nil {
		panic(addErr)
	}
	sdkmcp.AddTool(server, &sdkmcp.Tool{
		Name:         name,
		Description:  description,
		InputSchema:  inputSchema,
		OutputSchema: outputSchema,
	}, func(ctx context.Context, request *sdkmcp.CallToolRequest, input In) (*sdkmcp.CallToolResult, ToolOutput, error) {
		raw, marshalErr := json.Marshal(input)
		if marshalErr != nil {
			return nil, ToolOutput{}, fmt.Errorf("encode %s input: %w", name, marshalErr)
		}
		return registry.Execute(ctx, name, request, raw)
	})
}

func inferCapability(domain, action string, risk Risk) string {
	root := strings.Split(domain, "_")[0]
	switch {
	case action == "retrieve" || strings.Contains(action, "search"):
		return root + ".retrieve"
	case strings.Contains(action, "execute"):
		return root + ".execute"
	case risk == RiskDestructive:
		return root + ".destructive"
	case risk == RiskWrite:
		return root + ".write"
	default:
		return root + ".read"
	}
}

func splitName(name string) (string, string) {
	trimmed := strings.TrimPrefix(name, "irmin_")
	for _, action := range []string{
		"configuration_fields_get", "duckdb_hyde_search", "hyde_search",
		"configuration_update", "move_or_copy", "configuration_validate",
		"execute_stored", "execute_sql", "upload_url", "content_get", "history_get", "schema_get",
		"changes_get", "changes_revert", "text_save", "batch_get", "info_get", "schedule_update",
	} {
		suffix := "_" + action
		if strings.HasSuffix(trimmed, suffix) {
			return strings.TrimSuffix(trimmed, suffix), action
		}
	}
	parts := strings.Split(trimmed, "_")
	if len(parts) < minimumCanonicalNameParts {
		return "unknown", "unknown"
	}
	return strings.Join(parts[:len(parts)-1], "_"), parts[len(parts)-1]
}

func inferRisk(action string) Risk {
	switch {
	case strings.Contains(action, "cancel"), strings.Contains(action, "delete"),
		strings.Contains(action, "merge"), strings.Contains(action, "move_or_copy"),
		strings.Contains(action, "revert"):
		return RiskDestructive
	case strings.Contains(action, "create"), strings.Contains(action, "execute"),
		strings.Contains(action, "patch"),
		strings.Contains(action, "save"), strings.Contains(action, "update"),
		strings.Contains(action, "upload"), strings.Contains(action, "write"):
		return RiskWrite
	default:
		return RiskRead
	}
}

func inferTimeout(action string) time.Duration {
	if strings.Contains(action, "execute") {
		return executionTimeout
	}
	return defaultTimeout
}
