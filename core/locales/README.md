# Localization

Internationalization system providing multi-language support for the Irmin platform. Manages translations, locale-specific formatting, and language detection.

## Purpose

Enables multi-language support through:

- **Translation Management**: Centralized translation key-value storage
- **Language Detection**: Automatic locale detection from HTTP headers
- **Message Formatting**: Localized error messages and user interface text
- **Regional Support**: Locale-specific date, time, and number formatting
- **Dynamic Loading**: Runtime language switching and translation loading

## Key Components

- **`locales.go`**: Core localization manager and translation engine
- **`en.json`**: English language translations (default language)
- **`fi.json`**: Finnish language translations
- **Translation System**: Key-based translation with variable substitution

## Features

- **Multiple Languages**: Support for multiple language translations
- **Fallback System**: Graceful fallback to default language for missing translations
- **Variable Substitution**: Dynamic content insertion in translated strings
- **HTTP Integration**: Automatic language detection from Accept-Language headers
- **JSON-Based**: Simple JSON format for translation files

## Supported Languages

- **English (en)**: Default language with complete translations
- **Finnish (fi)**: Secondary language support
- **Extensible**: Easy addition of new languages through JSON files

## Integration

Used by:

- **Controllers** for localized error messages and responses
- **Formatters** for localized field names and values
- **API Middleware** for request language detection
- **User Interface** for multi-language support

## Translation Keys

Organized translation keys for:

- Error messages and validation feedback
- User interface labels and descriptions
- System notifications and alerts
- API response messages

### Adding Error Message Translations

Error messages from the service layer can be translated by adding keys to the translation files that match the exact error message string:

**Example:**

1. Service returns error: `services.ErrAccessDenied` with message `"access denied"`
2. Add translation key to `en.json` and other language files:
   ```json
   {
     "access denied": "Access denied",
     ...
   }
   ```
3. The `handleServiceError` helper in controllers will automatically use the translation

**For internal errors:**

Services can mark errors as internal-only using `services.NewInternalError()`:
```go
return services.NewInternalError("database connection pool exhausted")
```

These errors will be logged server-side but clients will receive a generic "error_occurred" message for security.

**Translation key format:**

- Keys match the exact error message string from `err.Error()`
- If no translation exists, the raw error message is returned (automatic fallback)
- Add translations incrementally - no code changes needed when adding new keys
