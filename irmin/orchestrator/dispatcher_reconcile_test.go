package orchestrator_test

import (
	"context"
	"errors"
	"irmin-api/db"
	"irmin-api/orchestrator"
	"testing"

	"github.com/zeebo/assert"
)

func TestProcessPendingWorkflowRunIDs_EmptyInput(t *testing.T) {
	err := orchestrator.ProcessPendingWorkflowRunIDs(
		t.Context(),
		nil,
		func(context.Context, *db.RunStatusNotificationPayload) error {
			return nil
		},
	)
	assert.Equal(t, err, nil)
}

func TestProcessPendingWorkflowRunIDs_ProcessesAllRuns(t *testing.T) {
	var seen []uint
	err := orchestrator.ProcessPendingWorkflowRunIDs(
		t.Context(),
		[]uint{10, 20, 30},
		func(_ context.Context, n *db.RunStatusNotificationPayload) error {
			seen = append(seen, n.ID)
			return nil
		},
	)
	assert.Equal(t, err, nil)
	assert.Equal(t, len(seen), 3)
	assert.Equal(t, seen[0], uint(10))
	assert.Equal(t, seen[1], uint(20))
	assert.Equal(t, seen[2], uint(30))
}

func TestProcessPendingWorkflowRunIDs_JoinsErrors(t *testing.T) {
	firstErr := errors.New("first")
	secondErr := errors.New("second")
	err := orchestrator.ProcessPendingWorkflowRunIDs(
		t.Context(),
		[]uint{1, 2, 3},
		func(_ context.Context, n *db.RunStatusNotificationPayload) error {
			switch n.ID {
			case 1:
				return firstErr
			case 3:
				return secondErr
			default:
				return nil
			}
		},
	)
	assert.NotEqual(t, err, nil)
	assert.Equal(t, errors.Is(err, firstErr), true)
	assert.Equal(t, errors.Is(err, secondErr), true)
}
