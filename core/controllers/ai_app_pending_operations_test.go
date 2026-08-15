package controllers

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"irmin-api/db"

	"github.com/gofiber/fiber/v3"
)

func TestAIApplicationCredentialCannotApproveOrRejectPendingOperation(t *testing.T) {
	t.Parallel()
	api := &APIControllers{}
	app := fiber.New()
	app.Use(func(c fiber.Ctx) error {
		c.Locals("ai_application", &db.AIApplication{})
		return c.Next()
	})
	app.Post("/approve", api.AIAppAPIApprovePendingOperation)
	app.Post("/reject", api.AIAppAPIRejectPendingOperation)

	for _, path := range []string{"/approve", "/reject"} {
		request := httptest.NewRequest(http.MethodPost, path, nil)
		response, err := app.Test(request)
		if err != nil {
			t.Fatal(err)
		}
		if response.StatusCode != http.StatusForbidden {
			t.Fatalf("%s status = %d, want %d", path, response.StatusCode, http.StatusForbidden)
		}
	}
}
