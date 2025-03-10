package utils

import "context"

// AsyncResult wraps a result of type T with a potential error.
type AsyncResult[T any] struct {
	Result T
	Err    error
}

// FutureResult is an interface for an asynchronous result that returns a value of type T and an error.
type FutureResult[T any] interface {
	// Await waits for the async function to complete and returns its result and error.
	Await() (T, error)
}

// asyncResult is a basic implementation of FutureResult.
type asyncResult[T any] struct {
	await func() (T, error)
}

// Await calls the async function and returns its result.
func (a asyncResult[T]) Await() (T, error) {
	return a.await()
}

// Async runs function f concurrently and returns a FutureResult for its result.
func Async[T any](f func() (T, error)) FutureResult[T] {
	ch := make(chan AsyncResult[T])
	go func() {
		res, err := f()
		ch <- AsyncResult[T]{Result: res, Err: err}
	}()
	return asyncResult[T]{
		await: func() (T, error) {
			r := <-ch
			return r.Result, r.Err
		},
	}
}

// AsyncWithContext runs function f concurrently and returns a FutureResult that supports cancellation.
// If the context is canceled before f completes, Await returns ctx.Err().
func AsyncWithContext[T any](ctx context.Context, f func() (T, error)) FutureResult[T] {
	// Use a buffered channel to avoid blocking if the context is canceled.
	ch := make(chan AsyncResult[T], 1)
	go func() {
		res, err := f()
		select {
		case ch <- AsyncResult[T]{Result: res, Err: err}:
			// Successfully sent the result.
		case <-ctx.Done():
			// Context was cancelled, do not block.
		}
	}()
	return asyncResult[T]{
		await: func() (T, error) {
			select {
			case r := <-ch:
				return r.Result, r.Err
			case <-ctx.Done():
				var zero T
				return zero, ctx.Err()
			}
		},
	}
}
