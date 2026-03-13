package middlewares_test

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"
	"time"

	"irmin-api/db"
	"irmin-api/middlewares"
	"irmin-api/services"
	"irmin-api/utils"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
	"github.com/zeebo/assert"
)

// currentTimestamp returns a current Unix timestamp string for webhook tests.
func currentTimestamp() string {
	return strconv.FormatInt(time.Now().Unix(), 10)
}

// computeWebhookSignature generates a valid Standard Webhooks v1 signature for testing.
func computeWebhookSignature(body []byte, webhookID, timestamp, secret string) string {
	rawSecret := strings.TrimPrefix(secret, "whsec_")
	secretBytes, _ := base64.StdEncoding.DecodeString(rawSecret)

	signedContent := fmt.Sprintf("%s.%s.%s", webhookID, timestamp, string(body))

	mac := hmac.New(sha256.New, secretBytes)
	mac.Write([]byte(signedContent))
	sig := base64.StdEncoding.EncodeToString(mac.Sum(nil))

	return "v1," + sig
}

// --- Signature verification tests ---

// TestVerifyPolarSignature_Valid tests that a valid signature is accepted.
func TestVerifyPolarSignature_Valid(t *testing.T) {
	secret := "whsec_" + base64.StdEncoding.EncodeToString([]byte("test-secret-key-for-hmac"))
	body := []byte(`{"type":"subscription.created"}`)
	webhookID := "msg_123"
	timestamp := "1234567890"

	sig := computeWebhookSignature(body, webhookID, timestamp, secret)

	result := middlewares.VerifyPolarSignature(body, webhookID, timestamp, sig, secret)
	assert.Equal(t, "", result)
}

// TestVerifyPolarSignature_InvalidSignature tests that an invalid signature is rejected.
func TestVerifyPolarSignature_InvalidSignature(t *testing.T) {
	secret := base64.StdEncoding.EncodeToString([]byte("test-secret-key-for-hmac"))
	body := []byte(`{"type":"subscription.created"}`)

	result := middlewares.VerifyPolarSignature(body, "msg_123", "1234567890", "v1,invalidsig", secret)
	assert.NotEqual(t, "", result)
}

// TestVerifyPolarSignature_EmptySecret tests that an empty secret is rejected.
func TestVerifyPolarSignature_EmptySecret(t *testing.T) {
	result := middlewares.VerifyPolarSignature([]byte("body"), "id", "ts", "v1,sig", "")
	assert.NotEqual(t, "", result)
}

// TestVerifyPolarSignature_InvalidBase64Secret tests that an invalid base64 secret is rejected.
func TestVerifyPolarSignature_InvalidBase64Secret(t *testing.T) {
	result := middlewares.VerifyPolarSignature([]byte("body"), "id", "ts", "v1,sig", "not-valid-base64!!")
	assert.NotEqual(t, "", result)
}

// TestVerifyPolarSignature_WithWhsecPrefix tests that whsec_ prefix is stripped correctly.
func TestVerifyPolarSignature_WithWhsecPrefix(t *testing.T) {
	rawSecret := base64.StdEncoding.EncodeToString([]byte("test-secret-key-for-hmac"))
	secret := "whsec_" + rawSecret
	body := []byte(`{"type":"subscription.created"}`)
	webhookID := "msg_123"
	timestamp := "1234567890"

	sig := computeWebhookSignature(body, webhookID, timestamp, secret)

	result := middlewares.VerifyPolarSignature(body, webhookID, timestamp, sig, secret)
	assert.Equal(t, "", result)
}

// TestVerifyPolarSignature_MultipleSignatures tests that multiple signatures are checked.
func TestVerifyPolarSignature_MultipleSignatures(t *testing.T) {
	secret := "whsec_" + base64.StdEncoding.EncodeToString([]byte("test-secret-key-for-hmac"))
	body := []byte(`{"type":"test"}`)
	webhookID := "msg_456"
	timestamp := "9876543210"

	validSig := computeWebhookSignature(body, webhookID, timestamp, secret)
	multiSig := "v1,invalidsig1 " + validSig + " v1,invalidsig2"

	result := middlewares.VerifyPolarSignature(body, webhookID, timestamp, multiSig, secret)
	assert.Equal(t, "", result)
}

// TestVerifyPolarSignature_WrongVersion tests that non-v1 signatures are ignored.
func TestVerifyPolarSignature_WrongVersion(t *testing.T) {
	secret := base64.StdEncoding.EncodeToString([]byte("test-secret-key-for-hmac"))
	body := []byte(`{"type":"test"}`)

	result := middlewares.VerifyPolarSignature(body, "id", "ts", "v2,somesig", secret)
	assert.NotEqual(t, "", result)
}

// TestVerifyPolarSignature_PolarWhsPrefix tests that polar_whs_ prefixed secrets work.
// Polar's SDK uses the raw UTF-8 bytes of the entire secret string as the HMAC key.
func TestVerifyPolarSignature_PolarWhsPrefix(t *testing.T) {
	secret := "polar_whs_BIlyk4qWTsmCraGLpEEkRzCEtsUF9bbCDO3eT3JGJX4"

	body := []byte(`{"type":"subscription.updated","data":{"id":"sub_123"}}`)
	webhookID := "msg_polar_test"
	timestamp := "1710338400"

	// Polar's SDK: Buffer.from(secret, "utf-8").toString("base64") → StandardWebhooks decodes it
	// Net effect: HMAC key = raw UTF-8 bytes of the full secret string
	signedContent := fmt.Sprintf("%s.%s.%s", webhookID, timestamp, string(body))
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(signedContent))
	sig := "v1," + base64.StdEncoding.EncodeToString(mac.Sum(nil))

	result := middlewares.VerifyPolarSignature(body, webhookID, timestamp, sig, secret)
	assert.Equal(t, "", result)
}

// --- Middleware tests ---

// TestBillingEnabledMiddleware_Disabled tests that billing routes return 404 when disabled.
func TestBillingEnabledMiddleware_Disabled(t *testing.T) {
	app := fiber.New()
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))

	api := &middlewares.APIMiddlewares{
		Env:    &utils.CoreAPIEnv{BillingEnabled: false},
		Logger: logger,
		Services: &services.APIServices{
			BillingService: nil,
		},
	}

	app.Get("/test", api.BillingEnabledMiddleware, func(c fiber.Ctx) error {
		return c.SendString("ok")
	})

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	resp, err := app.Test(req)
	assert.NoError(t, err)
	assert.Equal(t, fiber.StatusNotFound, resp.StatusCode)
}

// TestBillingEnabledMiddleware_Enabled tests that billing routes pass through when enabled.
func TestBillingEnabledMiddleware_Enabled(t *testing.T) {
	app := fiber.New()
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))

	api := &middlewares.APIMiddlewares{
		Env:    &utils.CoreAPIEnv{BillingEnabled: true},
		Logger: logger,
		Services: &services.APIServices{
			BillingService: &services.BillingService{},
		},
	}

	app.Get("/test", api.BillingEnabledMiddleware, func(c fiber.Ctx) error {
		return c.SendString("ok")
	})

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	resp, err := app.Test(req)
	assert.NoError(t, err)
	assert.Equal(t, fiber.StatusOK, resp.StatusCode)
}

// TestUsageLimitMiddleware_NoBillingService tests that the middleware passes through when billing is nil.
func TestUsageLimitMiddleware_NoBillingService(t *testing.T) {
	app := fiber.New()
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))

	api := &middlewares.APIMiddlewares{
		Env:      &utils.CoreAPIEnv{},
		Logger:   logger,
		Services: &services.APIServices{BillingService: nil},
	}

	handler := api.UsageLimitMiddleware(db.UsageDimensionAPIRequests)
	app.Get("/test", handler, func(c fiber.Ctx) error {
		return c.SendString("ok")
	})

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	resp, err := app.Test(req)
	assert.NoError(t, err)
	assert.Equal(t, fiber.StatusOK, resp.StatusCode)
}

// TestUsageLimitMiddleware_NoWorkspace tests that middleware passes through when no workspace in context.
func TestUsageLimitMiddleware_NoWorkspace(t *testing.T) {
	app := fiber.New()
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))

	api := &middlewares.APIMiddlewares{
		Env:    &utils.CoreAPIEnv{},
		Logger: logger,
		Services: &services.APIServices{
			BillingService: &services.BillingService{},
		},
	}

	handler := api.UsageLimitMiddleware(db.UsageDimensionAPIRequests)
	app.Get("/test", handler, func(c fiber.Ctx) error {
		return c.SendString("ok")
	})

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	resp, err := app.Test(req)
	assert.NoError(t, err)
	assert.Equal(t, fiber.StatusOK, resp.StatusCode)
}

// TestAPIUsageMiddleware_NilTracker tests that the middleware passes through with nil tracker.
func TestAPIUsageMiddleware_NilTracker(t *testing.T) {
	app := fiber.New()
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))

	api := &middlewares.APIMiddlewares{
		Env:      &utils.CoreAPIEnv{},
		Logger:   logger,
		Services: &services.APIServices{UsageTracker: nil},
	}

	app.Get("/test", api.APIUsageMiddleware, func(c fiber.Ctx) error {
		return c.SendString("ok")
	})

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	resp, err := app.Test(req)
	assert.NoError(t, err)
	assert.Equal(t, fiber.StatusOK, resp.StatusCode)
}

// TestPolarWebhookMiddleware_BillingDisabled tests that webhook returns 404 when billing disabled.
func TestPolarWebhookMiddleware_BillingDisabled(t *testing.T) {
	app := fiber.New()
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))

	api := &middlewares.APIMiddlewares{
		Env:    &utils.CoreAPIEnv{BillingEnabled: false},
		Logger: logger,
		Services: &services.APIServices{
			BillingService: nil,
		},
	}

	app.Post("/webhook", api.PolarWebhookMiddleware, func(c fiber.Ctx) error {
		return c.SendString("ok")
	})

	req := httptest.NewRequest(http.MethodPost, "/webhook", nil)
	resp, err := app.Test(req)
	assert.NoError(t, err)
	assert.Equal(t, fiber.StatusNotFound, resp.StatusCode)
}

// TestPolarWebhookMiddleware_MissingHeaders tests that missing webhook headers return 401.
func TestPolarWebhookMiddleware_MissingHeaders(t *testing.T) {
	app := fiber.New()
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))

	api := &middlewares.APIMiddlewares{
		Env:    &utils.CoreAPIEnv{BillingEnabled: true},
		Logger: logger,
		Services: &services.APIServices{
			BillingService: &services.BillingService{},
		},
	}

	app.Post("/webhook", api.PolarWebhookMiddleware, func(c fiber.Ctx) error {
		return c.SendString("ok")
	})

	req := httptest.NewRequest(http.MethodPost, "/webhook", strings.NewReader("{}"))
	req.Header.Set("Content-Type", "application/json")
	// Missing webhook-id, webhook-timestamp, webhook-signature headers

	resp, err := app.Test(req)
	assert.NoError(t, err)
	assert.Equal(t, fiber.StatusUnauthorized, resp.StatusCode)

	var result irminmodels.IrminAPIResponse
	json.NewDecoder(resp.Body).Decode(&result)
	assert.Equal(t, "Missing webhook signature headers", result.Message)
}

// TestPolarWebhookMiddleware_InvalidSignature tests that an invalid signature returns 401.
func TestPolarWebhookMiddleware_InvalidSignature(t *testing.T) {
	app := fiber.New()
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))

	secret := base64.StdEncoding.EncodeToString([]byte("test-secret"))
	api := &middlewares.APIMiddlewares{
		Env: &utils.CoreAPIEnv{
			BillingEnabled:     true,
			PolarWebhookSecret: secret,
		},
		Logger: logger,
		Services: &services.APIServices{
			BillingService: &services.BillingService{},
		},
	}

	app.Post("/webhook", api.PolarWebhookMiddleware, func(c fiber.Ctx) error {
		return c.SendString("ok")
	})

	body := `{"type":"subscription.created"}`
	ts := currentTimestamp()
	req := httptest.NewRequest(http.MethodPost, "/webhook", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Webhook-Id", "msg_123")
	req.Header.Set("Webhook-Timestamp", ts)
	req.Header.Set("Webhook-Signature", "v1,invalidsignature")

	resp, err := app.Test(req)
	assert.NoError(t, err)
	assert.Equal(t, fiber.StatusUnauthorized, resp.StatusCode)
}

// TestPolarWebhookMiddleware_ExpiredTimestamp tests that old timestamps are rejected.
func TestPolarWebhookMiddleware_ExpiredTimestamp(t *testing.T) {
	app := fiber.New()
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))

	secret := "whsec_" + base64.StdEncoding.EncodeToString([]byte("test-secret"))
	api := &middlewares.APIMiddlewares{
		Env: &utils.CoreAPIEnv{
			BillingEnabled:     true,
			PolarWebhookSecret: secret,
		},
		Logger: logger,
		Services: &services.APIServices{
			BillingService: &services.BillingService{},
		},
	}

	app.Post("/webhook", api.PolarWebhookMiddleware, func(c fiber.Ctx) error {
		return c.SendString("ok")
	})

	body := []byte(`{"type":"subscription.created"}`)
	oldTimestamp := strconv.FormatInt(time.Now().Add(-10*time.Minute).Unix(), 10)
	sig := computeWebhookSignature(body, "msg_old", oldTimestamp, secret)

	req := httptest.NewRequest(http.MethodPost, "/webhook", strings.NewReader(string(body)))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Webhook-Id", "msg_old")
	req.Header.Set("Webhook-Timestamp", oldTimestamp)
	req.Header.Set("Webhook-Signature", sig)

	resp, err := app.Test(req)
	assert.NoError(t, err)
	assert.Equal(t, fiber.StatusUnauthorized, resp.StatusCode)

	var result irminmodels.IrminAPIResponse
	json.NewDecoder(resp.Body).Decode(&result)
	assert.Equal(t, "Webhook timestamp out of range", result.Message)
}
