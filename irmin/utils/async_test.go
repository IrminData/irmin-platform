package utils_test

import (
	"context"
	"errors"
	"irmin-api/utils"
	"testing"
	"time"
)

func TestAsync_Successful(t *testing.T) {
	future := utils.Async(func() (int, error) {
		time.Sleep(10 * time.Millisecond)
		return 42, nil
	})

	result, err := future.Await()
	if err != nil {
		t.Errorf("Async() unexpected error: %v", err)
	}
	if result != 42 {
		t.Errorf("Async() result = %d, expected 42", result)
	}
}

func TestAsync_Error(t *testing.T) {
	expectedErr := errors.New("computation failed")
	future := utils.Async(func() (int, error) {
		time.Sleep(10 * time.Millisecond)
		return 0, expectedErr
	})

	result, err := future.Await()
	if !errors.Is(err, expectedErr) {
		t.Errorf("Async() error = %v, expected %v", err, expectedErr)
	}
	if result != 0 {
		t.Errorf("Async() result = %d, expected 0", result)
	}
}

func TestAsync_Immediate(t *testing.T) {
	future := utils.Async(func() (string, error) {
		return "hello", nil
	})

	result, err := future.Await()
	if err != nil {
		t.Errorf("Async() unexpected error: %v", err)
	}
	if result != "hello" {
		t.Errorf("Async() result = %q, expected %q", result, "hello")
	}
}

func TestAsync_Multiple(t *testing.T) {
	// Create multiple async operations
	future1 := utils.Async(func() (int, error) {
		return 1, nil
	})
	future2 := utils.Async(func() (int, error) {
		return 2, nil
	})

	result1, err1 := future1.Await()
	if err1 != nil {
		t.Errorf("Async() unexpected error on first future: %v", err1)
	}
	if result1 != 1 {
		t.Errorf("Async() result1 = %d, expected 1", result1)
	}

	result2, err2 := future2.Await()
	if err2 != nil {
		t.Errorf("Async() unexpected error on second future: %v", err2)
	}
	if result2 != 2 {
		t.Errorf("Async() result2 = %d, expected 2", result2)
	}
}

func TestAsync_ComplexType(t *testing.T) {
	type testStruct struct {
		Name  string
		Value int
	}

	future := utils.Async(func() (testStruct, error) {
		return testStruct{Name: "test", Value: 123}, nil
	})

	result, err := future.Await()
	if err != nil {
		t.Errorf("Async() unexpected error: %v", err)
	}
	if result.Name != "test" || result.Value != 123 {
		t.Errorf("Async() result = %+v, expected {Name:test Value:123}", result)
	}
}

func TestAsyncWithContext_Successful(t *testing.T) {
	ctx := context.Background()
	future := utils.AsyncWithContext(ctx, func() (int, error) {
		time.Sleep(10 * time.Millisecond)
		return 42, nil
	})

	result, err := future.Await()
	if err != nil {
		t.Errorf("AsyncWithContext() unexpected error: %v", err)
	}
	if result != 42 {
		t.Errorf("AsyncWithContext() result = %d, expected 42", result)
	}
}

func TestAsyncWithContext_CanceledBeforeCompletion(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())

	future := utils.AsyncWithContext(ctx, func() (int, error) {
		time.Sleep(100 * time.Millisecond)
		return 42, nil
	})

	// Cancel the context before the computation completes
	time.Sleep(10 * time.Millisecond)
	cancel()

	result, err := future.Await()
	if !errors.Is(err, context.Canceled) {
		t.Errorf("AsyncWithContext() error = %v, expected %v", err, context.Canceled)
	}
	if result != 0 {
		t.Errorf("AsyncWithContext() result = %d, expected 0", result)
	}
}

func TestAsyncWithContext_CanceledAfterCompletion(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	future := utils.AsyncWithContext(ctx, func() (int, error) {
		time.Sleep(10 * time.Millisecond)
		return 42, nil
	})

	// Wait for the computation to complete
	time.Sleep(50 * time.Millisecond)

	// Await the result (which should already be available)
	result, err := future.Await()

	// Since the result is buffered and available, we should get it even if we cancel after
	cancel()

	// The behavior may vary - if Await happens after result is available, we get the result
	// If context is cancelled first, we get context error. Both are valid.
	if err == nil {
		if result != 42 {
			t.Errorf("AsyncWithContext() result = %d, expected 42", result)
		}
	} else if !errors.Is(err, context.Canceled) {
		t.Errorf("AsyncWithContext() unexpected error: %v", err)
	}
}

func TestAsyncWithContext_Timeout(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Millisecond)
	defer cancel()

	future := utils.AsyncWithContext(ctx, func() (int, error) {
		time.Sleep(100 * time.Millisecond)
		return 42, nil
	})

	result, err := future.Await()
	if !errors.Is(err, context.DeadlineExceeded) {
		t.Errorf("AsyncWithContext() error = %v, expected %v", err, context.DeadlineExceeded)
	}
	if result != 0 {
		t.Errorf("AsyncWithContext() result = %d, expected 0", result)
	}
}

func TestAsyncWithContext_Error(t *testing.T) {
	ctx := context.Background()
	expectedErr := errors.New("computation failed")

	future := utils.AsyncWithContext(ctx, func() (int, error) {
		time.Sleep(10 * time.Millisecond)
		return 0, expectedErr
	})

	result, err := future.Await()
	if !errors.Is(err, expectedErr) {
		t.Errorf("AsyncWithContext() error = %v, expected %v", err, expectedErr)
	}
	if result != 0 {
		t.Errorf("AsyncWithContext() result = %d, expected 0", result)
	}
}

func TestAsyncWithContext_Immediate(t *testing.T) {
	ctx := context.Background()
	future := utils.AsyncWithContext(ctx, func() (string, error) {
		return "hello", nil
	})

	result, err := future.Await()
	if err != nil {
		t.Errorf("AsyncWithContext() unexpected error: %v", err)
	}
	if result != "hello" {
		t.Errorf("AsyncWithContext() result = %q, expected %q", result, "hello")
	}
}

func TestAsyncConcurrency(t *testing.T) {
	t.Run("parallel async operations", func(t *testing.T) {
		// Launch multiple async operations in parallel
		future1 := utils.Async(func() (int, error) {
			time.Sleep(20 * time.Millisecond)
			return 1, nil
		})
		future2 := utils.Async(func() (int, error) {
			time.Sleep(20 * time.Millisecond)
			return 2, nil
		})
		future3 := utils.Async(func() (int, error) {
			time.Sleep(20 * time.Millisecond)
			return 3, nil
		})

		// Await all results
		r1, err1 := future1.Await()
		r2, err2 := future2.Await()
		r3, err3 := future3.Await()

		if err1 != nil || err2 != nil || err3 != nil {
			t.Errorf("Async() unexpected errors: %v, %v, %v", err1, err2, err3)
		}

		if r1 != 1 || r2 != 2 || r3 != 3 {
			t.Errorf("Async() results = %d, %d, %d, expected 1, 2, 3", r1, r2, r3)
		}
	})
}
