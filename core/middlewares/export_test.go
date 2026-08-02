package middlewares

// This file exports internal functions for testing purposes.
// These exports are only available during testing (file ends with _test.go).

// VerifyPolarSignature exports verifyPolarSignature for testing.
var VerifyPolarSignature = verifyPolarSignature

// WebhookTimestampTolerance exports webhookTimestampTolerance for testing.
var WebhookTimestampTolerance = webhookTimestampTolerance
