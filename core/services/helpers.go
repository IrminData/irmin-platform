package services

// applyOptionalField sets dst to *src when src is a non-nil, non-empty pointer.
// Use for required fields that must not be blanked (e.g. Name).
func applyOptionalField(dst *string, src *string) {
	if src != nil && len(*src) > 0 {
		*dst = *src
	}
}

// applyNullableField sets dst to *src when src is non-nil, allowing empty values.
// Use for optional fields that CAN be cleared (e.g. Description, Documentation).
func applyNullableField(dst *string, src *string) {
	if src != nil {
		*dst = *src
	}
}
