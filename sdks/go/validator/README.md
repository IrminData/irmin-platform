# Validation

The validator package wraps `go-playground/validator` with the rules used by
Irmin models and API requests.

Client-side validation, which does not require an SQID manager:

```go
package main

import (
	"fmt"

	"github.com/IrminData/irmin-platform/sdks/go/models"
	irminvalidator "github.com/IrminData/irmin-platform/sdks/go/validator"
)

func main() {
	validator := irminvalidator.NewClientValidator()
	result := validator.ValidateEnhanced(models.User{Email: "invalid"})
	if result.HasErrors() {
		fmt.Println(result.GetFieldErrors())
	}
}
```

Server-side consumers that validate SQIDs can provide a manager:

```go
manager := irminsqids.NewSQIDManager(alphabet)
validator := irminvalidator.NewValidator(manager)
```

`Validate` and `ValidateVar` return ordinary errors. Their enhanced variants
return `ValidationResultError`, which exposes a user message, field errors, and
the original validation error.

The package includes Irmin-specific rules for tokens, slugs, SQIDs, schedules,
SQL, documentation, URLs, image URLs, and phone numbers. Validation is an input
quality boundary; it does not replace authorization, parameterized SQL, output
encoding, or server-side policy enforcement.
