package crypto

import (
	"context"
	"encoding/json"
	"fmt"
	"reflect"

	"gorm.io/gorm/schema"
)

// EncryptedJSONSerializerName is the name used when registering the
// serializer with GORM (i.e. the value of the `serializer:` gorm tag).
const EncryptedJSONSerializerName = "encrypted_json"

// jsonNull is the byte slice representation of JSON null, used in place of a
// bare nil Value() return so the serializer never returns (nil, nil).
//
//nolint:gochecknoglobals // package-level constant sentinel, not mutable state
var jsonNull = []byte("null")

// EncryptedJSONSerializer implements gorm.io/gorm/schema.SerializerInterface.
//
// For fields typed as map[string]string it JSON-encodes the map where each
// value has been passed through the keyring. Other shapes fall back to plain
// JSON, so the serializer is safe to attach to structurally different fields
// even though the Connection.Details case is the primary target.
//
// Scan tolerates legacy rows: any string value that does not carry the
// ciphertext prefix is returned as-is. This lets encryption roll out without
// a blocking migration step.
type EncryptedJSONSerializer struct {
	Keyring *Keyring
}

// Register installs the serializer into GORM's global registry under
// EncryptedJSONSerializerName. Call once at startup.
func (s EncryptedJSONSerializer) Register() {
	schema.RegisterSerializer(EncryptedJSONSerializerName, s)
}

// EncryptStringMap returns a new map with every value encrypted via the
// keyring.
//
// Invariant: callers pass plaintext. The Scan path always decrypts before
// returning values to application code, so any value flowing into Value()
// (and therefore into this helper) is plaintext by construction. We do not
// try to detect "already encrypted" inputs here — doing so would silently
// lose data when a legitimate plaintext secret happens to match the on-wire
// prefix.
func (s EncryptedJSONSerializer) EncryptStringMap(m map[string]string) (map[string]string, error) {
	out := make(map[string]string, len(m))
	for k, plain := range m {
		ct, err := s.Keyring.Encrypt(plain)
		if err != nil {
			return nil, fmt.Errorf("encrypted_json: encrypt key %q: %w", k, err)
		}
		out[k] = ct
	}
	return out, nil
}

// DecryptStringMap decrypts every value of m in place. Values without the
// ciphertext prefix pass through unchanged — this is the legacy-row path.
func (s EncryptedJSONSerializer) DecryptStringMap(m map[string]string) error {
	for k, v := range m {
		plain, err := s.Keyring.Decrypt(v)
		if err != nil {
			return fmt.Errorf("encrypted_json: decrypt key %q: %w", k, err)
		}
		m[k] = plain
	}
	return nil
}

// Scan reads a jsonb value from the DB and populates dst, decrypting
// map[string]string values along the way.
func (s EncryptedJSONSerializer) Scan(
	ctx context.Context,
	field *schema.Field,
	dst reflect.Value,
	dbValue any,
) error {
	if dbValue == nil {
		field.ReflectValueOf(ctx, dst).Set(reflect.Zero(field.FieldType))
		return nil
	}
	raw, err := toBytes(dbValue)
	if err != nil {
		return err
	}
	if len(raw) == 0 {
		field.ReflectValueOf(ctx, dst).Set(reflect.Zero(field.FieldType))
		return nil
	}

	target := reflect.New(field.FieldType).Interface()
	if unmarshalErr := json.Unmarshal(raw, target); unmarshalErr != nil {
		return fmt.Errorf("encrypted_json: unmarshal: %w", unmarshalErr)
	}

	targetVal := reflect.ValueOf(target).Elem()
	// JSON null (either SQL NULL or the literal "null" written by Value for
	// a nil map) unmarshals to a nil map. Preserve nil rather than letting
	// asStringMap materialize an empty map, which would break == nil checks
	// and omitempty JSON output in application code.
	if targetVal.Kind() == reflect.Map && targetVal.IsNil() {
		field.ReflectValueOf(ctx, dst).Set(reflect.Zero(field.FieldType))
		return nil
	}
	if stringMap, ok := asStringMap(targetVal); ok {
		if decryptErr := s.DecryptStringMap(stringMap); decryptErr != nil {
			return decryptErr
		}
		targetVal = reflect.ValueOf(stringMap)
	}
	field.ReflectValueOf(ctx, dst).Set(targetVal)
	return nil
}

// Value encrypts map[string]string entries, then JSON-encodes for DB storage.
// A nil input (untyped nil, nil pointer, or typed nil map) is encoded as JSON
// null to match the behavior of GORM's default JSON serializer and avoid
// silently rewriting SQL NULL columns as "{}" during the backfill.
func (s EncryptedJSONSerializer) Value(
	_ context.Context,
	_ *schema.Field,
	_ reflect.Value,
	fieldValue any,
) (any, error) {
	if fieldValue == nil {
		return jsonNull, nil
	}
	v := reflect.ValueOf(fieldValue)
	for v.Kind() == reflect.Pointer {
		if v.IsNil() {
			return jsonNull, nil
		}
		v = v.Elem()
	}
	// A typed nil map[string]string arrives here as a non-nil any wrapping a
	// nil map — the above guards miss it. Treat it as null.
	if v.Kind() == reflect.Map && v.IsNil() {
		return jsonNull, nil
	}
	if stringMap, ok := asStringMap(v); ok {
		encrypted, err := s.EncryptStringMap(stringMap)
		if err != nil {
			return nil, err
		}
		return json.Marshal(encrypted)
	}
	return json.Marshal(fieldValue)
}

// asStringMap extracts the map[string]string view of a reflect.Value when the
// underlying type is assignable to it. Returns ok=false for any other shape.
// Callers are expected to have already rejected nil maps before reaching this
// helper (see Value) — this function returns an empty map for a nil input,
// which is not the same as SQL NULL semantics.
func asStringMap(v reflect.Value) (map[string]string, bool) {
	if v.Kind() != reflect.Map ||
		v.Type().Key().Kind() != reflect.String ||
		v.Type().Elem().Kind() != reflect.String {
		return nil, false
	}
	out := make(map[string]string, v.Len())
	iter := v.MapRange()
	for iter.Next() {
		out[iter.Key().String()] = iter.Value().String()
	}
	return out, true
}

func toBytes(v any) ([]byte, error) {
	switch b := v.(type) {
	case string:
		return []byte(b), nil
	case []byte:
		return b, nil
	default:
		return nil, fmt.Errorf("encrypted_json: unsupported db value type %T", v)
	}
}
