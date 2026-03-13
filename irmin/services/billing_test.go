package services_test

import (
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"irmin-api/db"
	"irmin-api/services"
	"irmin-api/utils"

	"github.com/zeebo/assert"
)

// TestMapPolarStatus tests the mapping of Polar status strings to SubscriptionStatus.
func TestMapPolarStatus(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected db.SubscriptionStatus
	}{
		{"active", "active", db.SubscriptionStatusActive},
		{"canceled", "canceled", db.SubscriptionStatusCancelled},
		{"past_due", "past_due", db.SubscriptionStatusPastDue},
		{"trialing", "trialing", db.SubscriptionStatusTrialing},
		{"unknown", "unknown_status", db.SubscriptionStatusNone},
		{"empty", "", db.SubscriptionStatusNone},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			result := services.ExportMapPolarStatus(tc.input)
			assert.Equal(t, tc.expected, result)
		})
	}
}

// TestExtractNestedString tests safely extracting string values from maps.
func TestExtractNestedString(t *testing.T) {
	t.Run("valid key", func(t *testing.T) {
		data := map[string]any{"key": "value"}
		val, ok := services.ExportExtractNestedString(data, "key")
		assert.True(t, ok)
		assert.Equal(t, "value", val)
	})

	t.Run("missing key", func(t *testing.T) {
		data := map[string]any{"key": "value"}
		_, ok := services.ExportExtractNestedString(data, "missing")
		assert.False(t, ok)
	})

	t.Run("non-string value", func(t *testing.T) {
		data := map[string]any{"key": 42}
		_, ok := services.ExportExtractNestedString(data, "key")
		assert.False(t, ok)
	})
}

// TestGetMapKeys tests extracting keys from a map.
func TestGetMapKeys(t *testing.T) {
	t.Run("all keys returned", func(t *testing.T) {
		m := map[string]any{"a": 1, "b": 2, "c": 3}
		keys := services.ExportGetMapKeys(m)
		assert.Equal(t, 3, len(keys))
	})

	t.Run("empty map", func(t *testing.T) {
		m := map[string]any{}
		keys := services.ExportGetMapKeys(m)
		assert.Equal(t, 0, len(keys))
	})
}

// TestNewBillingService_Disabled tests that billing service returns nil when disabled.
func TestNewBillingService_Disabled(t *testing.T) {
	env := &utils.CoreAPIEnv{BillingEnabled: false}
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	s := services.NewBillingService(nil, env, logger)
	assert.Nil(t, s)
}

// TestNewBillingService_Enabled tests that billing service returns a valid instance.
func TestNewBillingService_Enabled(t *testing.T) {
	env := &utils.CoreAPIEnv{BillingEnabled: true}
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	s := services.NewBillingService(nil, env, logger)
	assert.NotNil(t, s)
}

// TestIsEnabled tests the IsEnabled method.
func TestIsEnabled(t *testing.T) {
	t.Run("nil receiver", func(t *testing.T) {
		var s *services.BillingService
		assert.False(t, s.IsEnabled())
	})

	t.Run("enabled instance", func(t *testing.T) {
		env := &utils.CoreAPIEnv{BillingEnabled: true}
		logger := slog.New(slog.NewTextHandler(io.Discard, nil))
		s := services.NewBillingService(nil, env, logger)
		assert.True(t, s.IsEnabled())
	})
}

// TestGetProductID tests retrieving the single product ID.
func TestGetProductID(t *testing.T) {
	env := &utils.CoreAPIEnv{
		BillingEnabled: true,
		PolarProductID: "prod_usage",
	}
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	s := services.NewBillingService(nil, env, logger)

	result := s.GetProductID()
	assert.Equal(t, "prod_usage", result)
}

// TestCreateOrGetCustomer tests the CreateOrGetCustomer method with a mock server.
func TestCreateOrGetCustomer(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "/v1/customers", r.URL.Path)
		assert.Equal(t, "Bearer test-api-key", r.Header.Get("Authorization"))

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]any{
			"id":    "cust_123",
			"email": "test@example.com",
		})
	}))
	defer server.Close()

	env := &utils.CoreAPIEnv{BillingEnabled: true, PolarAPIKey: "test-api-key"}
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	s := services.NewBillingServiceWithBaseURL(nil, env, logger, server.URL)

	customerID, err := s.CreateOrGetCustomer("ws_abc", "test@example.com")
	assert.NoError(t, err)
	assert.Equal(t, "cust_123", customerID)
}

// TestCreateOrGetCustomer_APIError tests error handling for customer creation.
func TestCreateOrGetCustomer_APIError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("internal error"))
	}))
	defer server.Close()

	env := &utils.CoreAPIEnv{BillingEnabled: true, PolarAPIKey: "test-api-key"}
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	s := services.NewBillingServiceWithBaseURL(nil, env, logger, server.URL)

	_, err := s.CreateOrGetCustomer("ws_abc", "test@example.com")
	assert.Error(t, err)
}

// TestCreateCheckoutSession tests checkout session creation with a mock server.
func TestCreateCheckoutSession(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "/v1/checkouts/", r.URL.Path)

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]any{
			"url": "https://checkout.polar.sh/session_123",
		})
	}))
	defer server.Close()

	env := &utils.CoreAPIEnv{BillingEnabled: true, PolarAPIKey: "test-api-key"}
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	s := services.NewBillingServiceWithBaseURL(nil, env, logger, server.URL)

	url, err := s.CreateCheckoutSession("cust_123", "prod_usage", "https://example.com/return")
	assert.NoError(t, err)
	assert.Equal(t, "https://checkout.polar.sh/session_123", url)
}

// TestGetCustomerPortalURL tests portal URL retrieval with a mock server.
func TestGetCustomerPortalURL(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "/v1/customer-sessions/", r.URL.Path)

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]any{
			"customer_portal_url": "https://portal.polar.sh/session_456",
		})
	}))
	defer server.Close()

	env := &utils.CoreAPIEnv{BillingEnabled: true, PolarAPIKey: "test-api-key"}
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	s := services.NewBillingServiceWithBaseURL(nil, env, logger, server.URL)

	url, err := s.GetCustomerPortalURL("cust_123")
	assert.NoError(t, err)
	assert.Equal(t, "https://portal.polar.sh/session_456", url)
}

// TestReportUsageBatch_Empty tests that an empty batch returns nil.
func TestReportUsageBatch_Empty(t *testing.T) {
	env := &utils.CoreAPIEnv{BillingEnabled: true}
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	s := services.NewBillingService(nil, env, logger)

	err := s.ReportUsageBatch(nil)
	assert.NoError(t, err)

	err = s.ReportUsageBatch([]map[string]any{})
	assert.NoError(t, err)
}

// TestReportUsageBatch_Success tests reporting usage events to Polar.
func TestReportUsageBatch_Success(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "/v1/events/ingest", r.URL.Path)
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	env := &utils.CoreAPIEnv{BillingEnabled: true, PolarAPIKey: "test-api-key"}
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	s := services.NewBillingServiceWithBaseURL(nil, env, logger, server.URL)

	events := []map[string]any{
		{"name": "api_requests", "external_customer_id": "cust_123"},
	}
	err := s.ReportUsageBatch(events)
	assert.NoError(t, err)
}

// TestReportUsageBatch_APIError tests error handling for usage reporting.
func TestReportUsageBatch_APIError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("server error"))
	}))
	defer server.Close()

	env := &utils.CoreAPIEnv{BillingEnabled: true, PolarAPIKey: "test-api-key"}
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	s := services.NewBillingServiceWithBaseURL(nil, env, logger, server.URL)

	events := []map[string]any{
		{"name": "api_requests"},
	}
	err := s.ReportUsageBatch(events)
	assert.Error(t, err)
}

// TestHandleWebhookEvent_InvalidPayload tests handling an event with invalid data.
func TestHandleWebhookEvent_InvalidPayload(t *testing.T) {
	env := &utils.CoreAPIEnv{BillingEnabled: true}
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	s := services.NewBillingService(nil, env, logger)

	// subscription.created with missing "data" key
	err := s.HandleWebhookEvent("subscription.created", map[string]any{
		"type": "subscription.created",
	})
	assert.Error(t, err)
}

// TestHandleWebhookEvent_OrderPaid tests that order.paid events are handled without error.
func TestHandleWebhookEvent_OrderPaid(t *testing.T) {
	env := &utils.CoreAPIEnv{BillingEnabled: true}
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	s := services.NewBillingService(nil, env, logger)

	err := s.HandleWebhookEvent("order.paid", map[string]any{
		"type": "order.paid",
		"data": map[string]any{},
	})
	assert.NoError(t, err)
}

// TestHandleWebhookEvent_UnhandledType tests that unknown event types are handled gracefully.
func TestHandleWebhookEvent_UnhandledType(t *testing.T) {
	env := &utils.CoreAPIEnv{BillingEnabled: true}
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	s := services.NewBillingService(nil, env, logger)

	err := s.HandleWebhookEvent("some.unknown.event", map[string]any{})
	assert.NoError(t, err)
}
