package db_test

import (
	"strings"
	"testing"

	"irmin-api/db"
)

func TestEnsureNotificationTriggerSQLContainsWorkflowRunsScopedDrop(t *testing.T) {
	sql := strings.Join(db.EnsureNotificationTriggerStatementsForTest(), "\n")
	required := []string{
		"DROP TRIGGER IF EXISTS workflow_run_notify ON workflow_runs",
		"CREATE TRIGGER workflow_run_notify",
		"AFTER INSERT OR UPDATE OF status ON workflow_runs",
		"EXECUTE FUNCTION notify_workflow_run_status()",
	}
	for _, needle := range required {
		if !strings.Contains(sql, needle) {
			t.Fatalf("notification trigger SQL missing required statement: %s", needle)
		}
	}
}

func TestEnsureNotificationTriggerSQLDoesNotUseGlobalNameExistenceCheck(t *testing.T) {
	sql := strings.Join(db.EnsureNotificationTriggerStatementsForTest(), "\n")
	disallowed := []string{
		"SELECT EXISTS",
		"WHERE tgname = 'workflow_run_notify'",
	}
	for _, needle := range disallowed {
		if strings.Contains(sql, needle) {
			t.Fatalf("notification trigger SQL should not include: %s", needle)
		}
	}
}
