package tests_test

import (
	"irmin-api/routes"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v3"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestHealthCheck(t *testing.T) {
	app := fiber.New()
	routes.RegisterAPIRoutes(app)

	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	resp, err := app.Test(req)

	require.NoError(t, err)
	assert.Equal(t, 200, resp.StatusCode)
}
