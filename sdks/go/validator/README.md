# Validation Utility

Simple validation utility for Irmin SDK models using [go-playground/validator](https://github.com/go-playground/validator).

## Usage

```go
package main

import (
    "fmt"
    irminsdkvalidator "github.com/IrminData/irmin-sdk-go/validator"
    "github.com/IrminData/irmin-sdk-go/models"
)

func main() {
    // Create validator instance
    validator := irminsdkvalidator.NewValidator()

    // Validate a model
    user := models.User{
        ID:        "user-123",
        FirstName: "John",
        LastName:  "Doe",
        Email:     "john@example.com",
        Roles:     []models.Role{{ID: "role-1", Role: "admin"}},
    }

    if err := validator.Validate(user); err != nil {
        fmt.Printf("Validation failed: %v\n", err)
    }

    // Validate individual fields
    if err := validator.ValidateVar("test@example.com", "email"); err != nil {
        fmt.Printf("Email validation failed: %v\n", err)
    }
}
```

## API

### `NewValidator() *Validator`

Creates a new validator instance.

### `Validate(s any) error`

Validates a struct and returns validation errors from go-playground/validator.

### `ValidateVar(field any, tag string) error`

Validates a single variable against a validation tag.

## Custom Rules

- `startswith=prefix` - Validates that a string starts with the specified prefix

## Example Models

All models in the `models` package include validation tags. Common patterns:

- `validate:"required"` - Field is required
- `validate:"email"` - Valid email format
- `validate:"min=1,max=100"` - String length constraints

Error handling is up to the consuming application.
