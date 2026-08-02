package googledrivecontrollers

import (
	"strconv"
	"strings"

	"irmin-connectors/connectors/common"
	googledriveconfig "irmin-connectors/connectors/googledrive/config"

	"github.com/gofiber/fiber/v3"
)

// maxFileSizeCapMB is the upper bound on the per-file size setting. The
// pull worker buffers every blob in memory before zipping to disk, and
// folder walks combine multiple blobs via totalBudgetMultiplier, so a
// loose ceiling lets a misconfigured connection OOM the worker. 500 MB
// is comfortably larger than any typical user document while keeping
// the worst-case total walk budget bounded.
const maxFileSizeCapMB = 500

// ConfigValidate godoc
// @Summary Validate Google Drive connector configuration
// @Description Validates the provided configuration fields for the Google Drive connector.
// @Tags googledrive
// @Security SystemTokenAuth
// @Accept json
// @Accept multipart/form-data
// @Produce json
// @Success 200 {object} map[string]any "Validation result"
// @Failure 400 {object} fiber.Map "Bad request"
// @Failure 401 {object} fiber.Map "Unauthorized"
// @Failure 500 {object} fiber.Map "Internal server error"
// @Router /googledrive/configuration/validate [post]
func (cs *Controllers) ConfigValidate(c fiber.Ctx) error {
	return cs.HandleConfigValidation(c, cs)
}

// GetRequiredFormFields implements common.ConfigValidationProvider.
// Google Drive is OAuth-backed and every setting is optional.
func (cs *Controllers) GetRequiredFormFields() ([]string, []string) {
	return googledriveconfig.GetRequiredDetailsFields(), googledriveconfig.GetOptionalFields()
}

// ValidateFields implements common.ConfigValidationProvider. Each setting
// is optional; we only flag invalid non-empty values so empty defaults
// fall through to runtime fallbacks.
func (cs *Controllers) ValidateFields(_ fiber.Ctx, _, settings map[string]any) []string {
	var errs []string
	errs = appendIfErr(errs, validateMaxRecords(settings))
	errs = appendIfErr(errs, validateMaxFileSizeMB(settings))
	errs = appendIfErr(errs, validateGoogleNativeExport(settings))
	errs = appendIfErr(errs, validateRecursive(settings))
	errs = append(errs, validateMimeTypeFilter(settings)...)
	return errs
}

// appendIfErr appends s to errs only when s is non-empty. Small helper to
// keep ValidateFields' cognitive complexity low.
func appendIfErr(errs []string, s string) []string {
	if s == "" {
		return errs
	}
	return append(errs, s)
}

func validateMaxRecords(settings map[string]any) string {
	s, ok := stringSetting(settings, "max_records_per_resource")
	if !ok {
		return ""
	}
	if common.ParsePositiveInt(s) <= 0 {
		return "max_records_per_resource must be a positive integer"
	}
	return ""
}

func validateMaxFileSizeMB(settings map[string]any) string {
	s, ok := stringSetting(settings, "max_file_size_mb")
	if !ok {
		return ""
	}
	n := common.ParsePositiveInt(s)
	if n <= 0 {
		return "max_file_size_mb must be a positive integer"
	}
	if n > maxFileSizeCapMB {
		return "max_file_size_mb must be " + strconv.Itoa(maxFileSizeCapMB) + " or less"
	}
	return ""
}

func validateGoogleNativeExport(settings map[string]any) string {
	s, ok := stringSetting(settings, "google_native_export")
	if !ok {
		return ""
	}
	switch s {
	case googleNativeExportSkip, googleNativeExportPDF, googleNativeExportOffice:
		return ""
	default:
		return "google_native_export must be one of: " +
			googleNativeExportSkip + ", " + googleNativeExportPDF + ", " + googleNativeExportOffice
	}
}

func validateRecursive(settings map[string]any) string {
	s, ok := stringSetting(settings, "recursive")
	if !ok {
		return ""
	}
	switch s {
	case "true", "false", "on", "off", "1", "0":
		return ""
	default:
		return "recursive must be true or false"
	}
}

// validateMimeTypeFilter walks comma-separated entries and flags any
// that don't look like a MIME type (i.e. don't contain '/').
func validateMimeTypeFilter(settings map[string]any) []string {
	s, ok := stringSetting(settings, "mime_type_filter")
	if !ok {
		return nil
	}
	var errs []string
	for raw := range strings.SplitSeq(s, ",") {
		entry := strings.TrimSpace(raw)
		if entry == "" {
			continue
		}
		if !strings.Contains(entry, "/") {
			errs = append(errs, "mime_type_filter entry "+strconv.Quote(entry)+" is not a valid MIME type")
		}
	}
	return errs
}

// stringSetting returns the trimmed string value of settings[key] and a
// flag indicating "present and non-empty after trim". Settings stored as
// non-string types are treated as absent — validation focuses on the
// form-submission path where values arrive as strings.
func stringSetting(settings map[string]any, key string) (string, bool) {
	raw, present := settings[key]
	if !present {
		return "", false
	}
	s, isStr := raw.(string)
	if !isStr {
		return "", false
	}
	s = strings.TrimSpace(s)
	if s == "" {
		return "", false
	}
	return s, true
}

// TestConnection implements common.ConfigValidationProvider. We
// cannot probe Google Drive here because no bearer token is available
// (the OAuth flow lives on Core, not on connectors), so we report
// success unconditionally.
func (cs *Controllers) TestConnection(
	_ fiber.Ctx, _, _ map[string]any,
) (bool, bool, bool, []string) {
	return true, true, true, nil
}
