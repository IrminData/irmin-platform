package connectorsclient_test

import (
	"context"
	"errors"
	"io"
	"net/http"
	"strings"
	"testing"

	"github.com/IrminData/irmin-sdk-go/connectorsclient"
)

type roundTripFunc func(*http.Request) (*http.Response, error)

func (f roundTripFunc) RoundTrip(req *http.Request) (*http.Response, error) {
	return f(req)
}

type failingReadCloser struct {
	data []byte
	err  error
	done bool
}

func (r *failingReadCloser) Read(p []byte) (int, error) {
	if r.done {
		return 0, r.err
	}
	r.done = true
	return copy(p, r.data), r.err
}

func (r *failingReadCloser) Close() error { return nil }

func TestRequestReturnsResponseBodyReadError(t *testing.T) {
	errResponseBodyRead := errors.New("response body read failed")
	c := connectorsclient.NewClient("http://example.test", "tok")
	c.HTTPClient = &http.Client{
		Transport: roundTripFunc(func(req *http.Request) (*http.Response, error) {
			return &http.Response{
				StatusCode: http.StatusOK,
				Status:     "200 OK",
				Header:     make(http.Header),
				Body:       &failingReadCloser{data: []byte("partial"), err: errResponseBodyRead},
				Request:    req,
			}, nil
		}),
	}

	body, err := c.Request(context.Background(), connectorsclient.RequestOptions{
		Method:   http.MethodGet,
		Endpoint: "/partial",
	})

	if err == nil {
		t.Fatalf("Request returned nil error with body %q; want response body read error", body)
	}
	if !errors.Is(err, errResponseBodyRead) {
		t.Fatalf("Request error = %v, want wrapped %v", err, errResponseBodyRead)
	}
	if !strings.Contains(err.Error(), "failed to read response body") {
		t.Fatalf("Request error = %v, want response body read context", err)
	}
	if body != nil {
		t.Fatalf("Request body = %q, want nil on read failure", body)
	}
}

var _ io.ReadCloser = (*failingReadCloser)(nil)
