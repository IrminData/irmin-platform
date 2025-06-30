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
