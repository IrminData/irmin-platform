package mcp

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"irmin-api/db"
	"irmin-api/services"
	"irmin-api/toolregistry"

	"github.com/gofiber/fiber/v3"
	adaptor "github.com/gofiber/fiber/v3/middleware/adaptor"
)

const pendingOperationPathParts = 2

func registerPendingOperationRoutes(
	app *fiber.App,
	apiServices *services.APIServices,
	registry *toolregistry.Registry,
	cfg *authConfig,
) {
	path := apiServices.Env.MCPHTTPPath + "/pending-operations/:id/:action"
	handler := wrapWithHTTPAuth(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		handlePendingOperation(w, r, apiServices, registry)
	}), cfg)
	app.Post(path, adaptor.HTTPHandler(handler))
}

func handlePendingOperation(
	w http.ResponseWriter,
	r *http.Request,
	apiServices *services.APIServices,
	registry *toolregistry.Registry,
) {
	user, ok := userFromContext(r.Context())
	if !ok || user == nil {
		writePendingOperationError(w, http.StatusUnauthorized, "authenticated user required")
		return
	}
	tokenType, ok := tokenTypeFromContext(r.Context())
	if !ok || tokenType != services.TokenTypeClerk {
		writePendingOperationError(w, http.StatusForbidden, "interactive user session required")
		return
	}
	parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	if len(parts) < pendingOperationPathParts {
		writePendingOperationError(w, http.StatusBadRequest, "invalid pending operation path")
		return
	}
	idText, action := parts[len(parts)-2], parts[len(parts)-1]
	id, err := apiServices.SQIDManager.Decode("mcp_pending_operations", idText)
	if err != nil {
		writePendingOperationError(w, http.StatusBadRequest, "invalid pending operation ID")
		return
	}
	operation, err := apiServices.DB.GetMCPPendingOperation(uint(id))
	if err != nil {
		writePendingOperationError(w, http.StatusNotFound, "pending operation not found")
		return
	}
	if _, err = apiServices.DB.GetWorkspaceUser(operation.WorkspaceID, user.ID); err != nil {
		writePendingOperationError(w, http.StatusForbidden, "workspace membership required")
		return
	}
	if bound := r.Header.Get("X-Irmin-Workspace"); bound == "" || bound != operation.Workspace.Slug {
		writePendingOperationError(w, http.StatusForbidden, "workspace binding mismatch")
		return
	}

	switch action {
	case "reject":
		updated, updateErr := apiServices.DB.TransitionMCPPendingOperation(
			uint(id), db.PendingOperationStatusPending, db.PendingOperationStatusRejected, user.ID,
		)
		if updateErr != nil {
			writePendingOperationError(w, http.StatusInternalServerError, "failed to reject operation")
			return
		}
		if !updated {
			writePendingOperationError(w, http.StatusConflict, "operation already processed")
			return
		}
		writePendingOperationJSON(w, http.StatusOK, map[string]any{"id": idText, "status": "rejected"})
	case "approve":
		approvePendingOperation(w, r, apiServices, registry, operation, user.ID, idText)
	default:
		writePendingOperationError(w, http.StatusBadRequest, "action must be approve or reject")
	}
}

func approvePendingOperation(
	w http.ResponseWriter,
	r *http.Request,
	apiServices *services.APIServices,
	registry *toolregistry.Registry,
	operation *db.MCPPendingOperation,
	reviewerID uint,
	idText string,
) {
	claimed, err := apiServices.DB.ClaimMCPPendingOperation(operation.ID, reviewerID)
	if err != nil {
		writePendingOperationError(w, http.StatusInternalServerError, "failed to claim operation")
		return
	}
	if !claimed {
		writePendingOperationError(w, http.StatusConflict, "operation already processed")
		return
	}
	ctx := toolregistry.WithApproval(r.Context())
	result, output, execErr := registry.Execute(
		ctx, operation.ToolName, nil, json.RawMessage(operation.ArgumentsJSON),
	)
	if execErr != nil || (result != nil && result.IsError) {
		message := "tool execution failed"
		if execErr != nil {
			message = execErr.Error()
		}
		_ = apiServices.DB.FinishMCPPendingOperation(
			operation.ID, db.PendingOperationStatusFailed, message,
		)
		writePendingOperationError(w, http.StatusInternalServerError, message)
		return
	}
	if err = apiServices.DB.FinishMCPPendingOperation(
		operation.ID, db.PendingOperationStatusCompleted, "",
	); err != nil {
		writePendingOperationError(w, http.StatusInternalServerError, "tool completed but status persistence failed")
		return
	}
	writePendingOperationJSON(w, http.StatusOK, map[string]any{
		"id": idText, "status": "completed", "result": output.Data,
	})
}

func writePendingOperationError(w http.ResponseWriter, status int, message string) {
	writePendingOperationJSON(w, status, map[string]any{"message": message})
}

func writePendingOperationJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(value); err != nil && !errors.Is(err, http.ErrHandlerTimeout) {
		return
	}
}
