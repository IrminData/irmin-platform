package client_test

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
	"time"

	"irmin-connectors/connectors/common"
	"irmin-connectors/connectors/stripe/client"
)

// newTestClient constructs a Client pointed at the given httptest
// server. Exists so every test case reads the same setup line.
func newTestClient(t *testing.T, srv *httptest.Server) *client.Client {
	t.Helper()
	return client.NewClient("rk_test_fake", "2026-03-25.dahlia", client.WithBaseURL(srv.URL))
}

func TestClient_Headers(t *testing.T) {
	var gotAuth, gotVersion, gotIdempotency string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotAuth = r.Header.Get("Authorization")
		gotVersion = r.Header.Get("Stripe-Version")
		gotIdempotency = r.Header.Get("Idempotency-Key")
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"id":"cus_ok"}`))
	}))
	defer srv.Close()

	c := newTestClient(t, srv)
	_, err := c.Create(
		context.Background(),
		"/v1/customers",
		"customers/new-alice.json", /* scope */
		url.Values{"email": []string{"alice@example.com"}},
	)
	if err != nil {
		t.Fatalf("Create: %v", err)
	}

	if gotAuth != "Bearer rk_test_fake" {
		t.Errorf("Authorization header = %q, want Bearer rk_test_fake", gotAuth)
	}
	if gotVersion != "2026-03-25.dahlia" {
		t.Errorf("Stripe-Version header = %q", gotVersion)
	}
	if gotIdempotency == "" {
		t.Errorf("Idempotency-Key header missing on Create")
	}
	const sha256HexLen = 64
	if len(gotIdempotency) != sha256HexLen {
		t.Errorf("Idempotency-Key should be sha256 hex (64 chars), got %d", len(gotIdempotency))
	}
}

func TestClient_GETDoesNotStampIdempotency(t *testing.T) {
	var gotIdempotency string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotIdempotency = r.Header.Get("Idempotency-Key")
		_, _ = w.Write([]byte(`{"data":[],"has_more":false}`))
	}))
	defer srv.Close()

	c := newTestClient(t, srv)
	if _, err := c.List(context.Background(), "/v1/customers", "", nil); err != nil {
		t.Fatalf("List: %v", err)
	}
	if gotIdempotency != "" {
		t.Errorf("List set Idempotency-Key=%q, expected empty", gotIdempotency)
	}
}

func TestClient_IdempotencyIsDeterministic(t *testing.T) {
	// Two creates with the same form + scope + apiVersion should produce
	// the same key — the retry-dedup guarantee workflows rely on.
	var keys []string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		keys = append(keys, r.Header.Get("Idempotency-Key"))
		_, _ = w.Write([]byte(`{"id":"cus_ok"}`))
	}))
	defer srv.Close()

	c := newTestClient(t, srv)
	form := url.Values{"email": []string{"alice@example.com"}}
	for range 2 {
		_, err := c.Create(context.Background(), "/v1/customers", "customers/new-alice.json", form)
		if err != nil {
			t.Fatalf("Create: %v", err)
		}
	}
	if keys[0] != keys[1] {
		t.Errorf("keys should match for identical inputs, got %q vs %q", keys[0], keys[1])
	}
}

func TestClient_IdempotencyDiffersByScope(t *testing.T) {
	// Two creates with identical form content but different scopes
	// (e.g., customers/new-alice.json and customers/new-bob.json) must
	// produce distinct keys so Stripe doesn't dedupe the second create.
	var keys []string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		keys = append(keys, r.Header.Get("Idempotency-Key"))
		_, _ = w.Write([]byte(`{"id":"cus_ok"}`))
	}))
	defer srv.Close()

	c := newTestClient(t, srv)
	form := url.Values{"email": []string{"same@example.com"}}
	for _, scope := range []string{"customers/new-alice.json", "customers/new-bob.json"} {
		if _, err := c.Create(context.Background(), "/v1/customers", scope, form); err != nil {
			t.Fatalf("Create %s: %v", scope, err)
		}
	}
	if keys[0] == keys[1] {
		t.Fatalf("distinct scopes must produce distinct keys, both = %q", keys[0])
	}
}

func TestClient_IdempotencyDiffersByAPIVersion(t *testing.T) {
	// Bumping the pinned Stripe-Version must invalidate cached responses
	// on Stripe's side — mix apiVersion into the key so two clients on
	// different versions with identical form + scope produce different keys.
	var key1, key2 string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if key1 == "" {
			key1 = r.Header.Get("Idempotency-Key")
		} else {
			key2 = r.Header.Get("Idempotency-Key")
		}
		_, _ = w.Write([]byte(`{"id":"cus_ok"}`))
	}))
	defer srv.Close()

	form := url.Values{"email": []string{"alice@example.com"}}
	c1 := client.NewClient("rk_test", "2026-03-25.dahlia", client.WithBaseURL(srv.URL))
	c2 := client.NewClient("rk_test", "2025-01-27.acacia", client.WithBaseURL(srv.URL))
	if _, err := c1.Create(context.Background(), "/v1/customers", "s", form); err != nil {
		t.Fatal(err)
	}
	if _, err := c2.Create(context.Background(), "/v1/customers", "s", form); err != nil {
		t.Fatal(err)
	}
	if key1 == key2 {
		t.Fatalf("apiVersion bump must change the idempotency key, both = %q", key1)
	}
}

func TestClient_EmptyFormRejected(t *testing.T) {
	// Sending an empty form to /v1/customers would create a ghost
	// customer with zero fields. The client must reject before the
	// request leaves the process.
	srv := httptest.NewServer(http.HandlerFunc(func(_ http.ResponseWriter, _ *http.Request) {
		t.Fatalf("empty-form Create should not reach the server")
	}))
	defer srv.Close()

	c := newTestClient(t, srv)
	_, err := c.Create(context.Background(), "/v1/customers", "x", url.Values{})
	if !errors.Is(err, client.ErrEmptyForm) {
		t.Fatalf("want ErrEmptyForm, got %v", err)
	}
	_, err = c.Update(context.Background(), "/v1/customers", "cus_abc", "x", url.Values{})
	if !errors.Is(err, client.ErrEmptyForm) {
		t.Fatalf("Update: want ErrEmptyForm, got %v", err)
	}
}

func TestClient_Pagination(t *testing.T) {
	// Serve two pages then terminate.
	handler := http.NewServeMux()
	var seenStartingAfter []string
	handler.HandleFunc("/v1/charges", func(w http.ResponseWriter, r *http.Request) {
		seenStartingAfter = append(seenStartingAfter, r.URL.Query().Get("starting_after"))
		switch r.URL.Query().Get("starting_after") {
		case "":
			_, _ = w.Write([]byte(`{"data":[{"id":"ch_1"},{"id":"ch_2"}],"has_more":true}`))
		case "ch_2":
			_, _ = w.Write([]byte(`{"data":[{"id":"ch_3"}],"has_more":false}`))
		default:
			t.Fatalf("unexpected starting_after: %q", r.URL.Query().Get("starting_after"))
		}
	})
	srv := httptest.NewServer(handler)
	defer srv.Close()

	c := newTestClient(t, srv)
	all, err := c.ListAll(context.Background(), "/v1/charges", nil)
	if err != nil {
		t.Fatalf("ListAll: %v", err)
	}
	const wantRecordCount = 3
	if len(all) != wantRecordCount {
		t.Errorf("got %d records, want %d", len(all), wantRecordCount)
	}
	if seenStartingAfter[0] != "" || seenStartingAfter[1] != "ch_2" {
		t.Errorf("pagination cursor wrong: %v", seenStartingAfter)
	}
}

func TestClient_ErrorEnvelope(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusUnauthorized)
		_, _ = fmt.Fprint(w,
			`{"error":{"type":"invalid_request_error","code":"invalid_api_key","message":"No API key provided."}}`,
		)
	}))
	defer srv.Close()

	c := newTestClient(t, srv)
	form := url.Values{"email": []string{"x@y.com"}}
	_, err := c.Create(context.Background(), "/v1/customers", "s", form)
	var se *client.APIError
	if !errors.As(err, &se) {
		t.Fatalf("expected *client.APIError, got %T: %v", err, err)
	}
	if se.Code != "invalid_api_key" {
		t.Errorf("code = %q, want invalid_api_key", se.Code)
	}
	if !client.IsAuthError(err) {
		t.Errorf("IsAuthError should match 401")
	}
}

func TestClient_FormEncodedBody(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body, _ := io.ReadAll(r.Body)
		got := r.Header.Get("Content-Type")
		if !strings.HasPrefix(got, "application/x-www-form-urlencoded") {
			t.Errorf("Content-Type = %q", got)
		}
		values, err := url.ParseQuery(string(body))
		if err != nil {
			t.Fatalf("body parse: %v", err)
		}
		if values.Get("email") != "alice@example.com" {
			t.Errorf("email = %q", values.Get("email"))
		}
		if values.Get("metadata[plan]") != "pro" {
			t.Errorf("metadata[plan] = %q (want pro)", values.Get("metadata[plan]"))
		}
		_, _ = w.Write([]byte(`{"id":"cus_ok"}`))
	}))
	defer srv.Close()

	form, err := client.JSONToForm([]byte(`{
		"email": "alice@example.com",
		"metadata": {"plan": "pro"}
	}`))
	if err != nil {
		t.Fatalf("JSONToForm: %v", err)
	}
	c := newTestClient(t, srv)
	if _, err = c.Create(context.Background(), "/v1/customers", "s", form); err != nil {
		t.Fatalf("Create: %v", err)
	}
}

func TestJSONToForm_NestedShapes(t *testing.T) {
	cases := []struct {
		name string
		in   string
		want map[string]string // first value per key
	}{
		{
			name: "flat",
			in:   `{"email":"a@b.com","name":"Alice"}`,
			want: map[string]string{"email": "a@b.com", "name": "Alice"},
		},
		{
			name: "nested object",
			in:   `{"metadata":{"plan":"pro","region":"eu"}}`,
			want: map[string]string{"metadata[plan]": "pro", "metadata[region]": "eu"},
		},
		{
			name: "array of objects",
			in:   `{"items":[{"price":"price_A"},{"price":"price_B"}]}`,
			want: map[string]string{
				"items[0][price]": "price_A",
				"items[1][price]": "price_B",
			},
		},
		{
			name: "integer preservation",
			in:   `{"amount":1999}`,
			want: map[string]string{"amount": "1999"},
		},
		{
			name: "boolean",
			in:   `{"livemode":false}`,
			want: map[string]string{"livemode": "false"},
		},
		{
			name: "null is skipped",
			in:   `{"email":"a@b.com","middle_name":null}`,
			want: map[string]string{"email": "a@b.com"},
		},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got, err := client.JSONToForm([]byte(tc.in))
			if err != nil {
				t.Fatalf("err: %v", err)
			}
			for k, v := range tc.want {
				if got.Get(k) != v {
					t.Errorf("key %q = %q, want %q", k, got.Get(k), v)
				}
			}
			// Null-skip case: make sure the skipped key isn't present.
			if tc.name == "null is skipped" {
				if _, present := got["middle_name"]; present {
					t.Errorf("expected middle_name to be absent, got %v", got["middle_name"])
				}
			}
		})
	}
}

func TestParsePath(t *testing.T) {
	cases := []struct {
		name    string
		path    string
		want    client.ParsedPath
		wantErr bool
	}{
		{
			name: "existing id",
			path: "customers/cus_abc.json",
			want: client.ParsedPath{ID: "cus_abc"},
		},
		{
			name: "new prefixed",
			path: "customers/new-alice.json",
			want: client.ParsedPath{IsNew: true},
		},
		{
			name: "new bare",
			path: "invoices/new.json",
			want: client.ParsedPath{IsNew: true},
		},
		{
			name: "leading slash is fine",
			path: "/products/prod_xyz.json",
			want: client.ParsedPath{ID: "prod_xyz"},
		},
		{name: "no extension", path: "customers/cus_abc", wantErr: true},
		{name: "unknown resource", path: "widgets/w_1.json", wantErr: true},
		{name: "empty", path: "", wantErr: true},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got, err := client.ParsePath(tc.path)
			if tc.wantErr {
				if err == nil {
					t.Fatalf("expected error, got %+v", got)
				}
				return
			}
			if err != nil {
				t.Fatalf("ParsePath: %v", err)
			}
			if got.ID != tc.want.ID {
				t.Errorf("ID = %q, want %q", got.ID, tc.want.ID)
			}
			if got.IsNew != tc.want.IsNew {
				t.Errorf("IsNew = %v, want %v", got.IsNew, tc.want.IsNew)
			}
		})
	}
}

func TestJSONToForm_RejectsEmpty(t *testing.T) {
	// Empty input, `null`, `{}`, and "every field is null" all resolve
	// to zero form entries — sending them would create a ghost Stripe
	// resource. JSONToForm returns ErrEmptyJSONInput rather than silently
	// producing an empty url.Values.
	cases := map[string][]byte{
		"nil input":        nil,
		"empty byte slice": {},
		"top-level null":   []byte(`null`),
		"empty object":     []byte(`{}`),
		"all-null fields":  []byte(`{"a":null,"b":null}`),
	}
	for name, in := range cases {
		t.Run(name, func(t *testing.T) {
			_, err := client.JSONToForm(in)
			if !errors.Is(err, client.ErrEmptyJSONInput) {
				t.Fatalf("want ErrEmptyJSONInput, got %v", err)
			}
		})
	}
}

func TestJSONToForm_Malformed(t *testing.T) {
	_, err := client.JSONToForm([]byte(`{not json`))
	if err == nil {
		t.Fatalf("expected error for malformed JSON")
	}
}

func TestJSONToForm_PrimitiveArray(t *testing.T) {
	got, err := client.JSONToForm([]byte(`{"scopes":["read","write"]}`))
	if err != nil {
		t.Fatalf("err: %v", err)
	}
	// The flatten impl uses indexed keys (scopes[0], scopes[1]) — pin this
	// behavior so a future refactor to empty-bracket convention is a
	// deliberate choice with a test update rather than a silent change.
	if got.Get("scopes[0]") != "read" || got.Get("scopes[1]") != "write" {
		t.Errorf("indexed encoding expected, got %v", got)
	}
}

func TestClient_ListAllSurfacesMalformedRecord(t *testing.T) {
	// Pagination safeguard: if Stripe ever returns HasMore=true with a
	// record that lacks an `id` field, ListAll now surfaces the error
	// rather than silently terminating as a "complete" pull. An earlier
	// revision swallowed the ID decode failure and reported truncated
	// results as successful — an incident that would be invisible to
	// the operator.
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_, _ = w.Write([]byte(`{"data":[{"no_id":true}],"has_more":true}`))
	}))
	defer srv.Close()

	c := newTestClient(t, srv)
	_, err := c.ListAll(context.Background(), "/v1/charges", nil)
	if err == nil {
		t.Fatalf("expected error when HasMore=true but record has no id")
	}
	if !strings.Contains(err.Error(), "cannot continue pagination") {
		t.Errorf("error should mention pagination: %v", err)
	}
}

func TestClient_ListBoundedCap(t *testing.T) {
	// Three pages of 2 records each, HasMore flip on the last. Cap at 3
	// records should stop mid-page-2 and return truncated=true.
	var pagesServed int
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		pagesServed++
		cursor := r.URL.Query().Get("starting_after")
		switch cursor {
		case "":
			_, _ = w.Write([]byte(`{"data":[{"id":"a"},{"id":"b"}],"has_more":true}`))
		case "b":
			_, _ = w.Write([]byte(`{"data":[{"id":"c"},{"id":"d"}],"has_more":true}`))
		case "d":
			_, _ = w.Write([]byte(`{"data":[{"id":"e"},{"id":"f"}],"has_more":false}`))
		default:
			t.Fatalf("unexpected cursor %q", cursor)
		}
	}))
	defer srv.Close()

	c := newTestClient(t, srv)
	got, truncated, err := c.ListBounded(context.Background(), "/v1/x", nil, 3)
	if err != nil {
		t.Fatalf("ListBounded: %v", err)
	}
	if len(got) != 3 {
		t.Errorf("expected cap of 3, got %d", len(got))
	}
	if !truncated {
		t.Errorf("expected truncated=true")
	}
	if pagesServed > 2 {
		t.Errorf("expected cap to stop paging after page 2, served %d pages", pagesServed)
	}
}

// TestClient_ProgressHandler_EmitsPerPageAndRateLimit pins the
// observability events that make a slow Stripe pull diagnosable.
// Without these, a 10-minute pull shows as silence between
// operation/init and operation/pull's final response — operators
// can't tell if the connector is making progress, rate-limited, or
// hung. The Field Incident that forced this fix ran for 10 minutes
// producing zero log rows between start and timeout.
func TestClient_ProgressHandler_EmitsPerPageAndRateLimit(t *testing.T) {
	// Three successful pages plus a 429 before the first page,
	// exercising both event kinds in one loop.
	var serverCalls int
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		serverCalls++
		// First call: 429 with a tiny retry-after so the test is fast.
		if serverCalls == 1 {
			w.Header().Set("Retry-After", "0")
			w.WriteHeader(http.StatusTooManyRequests)
			_, _ = fmt.Fprint(w,
				`{"error":{"type":"rate_limit_error","retry_after_ms":1}}`,
			)
			return
		}
		cursor := r.URL.Query().Get("starting_after")
		switch cursor {
		case "":
			_, _ = w.Write([]byte(`{"data":[{"id":"a"},{"id":"b"}],"has_more":true}`))
		case "b":
			_, _ = w.Write([]byte(`{"data":[{"id":"c"}],"has_more":false}`))
		default:
			t.Fatalf("unexpected cursor %q", cursor)
		}
	}))
	defer srv.Close()

	var pageEvents, rateLimitEvents []common.ProgressEvent
	handler := func(ev common.ProgressEvent) {
		switch ev.Kind {
		case common.ProgressKindPage:
			pageEvents = append(pageEvents, ev)
		case common.ProgressKindRateLimit:
			rateLimitEvents = append(rateLimitEvents, ev)
		}
	}

	c := client.NewClient(
		"rk_test_fake", "2026-03-25.dahlia",
		client.WithBaseURL(srv.URL),
		client.WithProgressHandler(handler),
	)

	records, _, err := c.ListBounded(context.Background(), "/v1/customers", nil, 0)
	if err != nil {
		t.Fatalf("ListBounded: %v", err)
	}
	if len(records) != 3 {
		t.Errorf("got %d records, want 3", len(records))
	}

	// Rate-limit event: exactly one (the 429 on call #1).
	if len(rateLimitEvents) != 1 {
		t.Errorf("rate-limit events = %d, want 1", len(rateLimitEvents))
	} else if ev := rateLimitEvents[0]; ev.ResourcePath != "/v1/customers" || ev.Attempt != 1 {
		t.Errorf("rate-limit event shape = %+v, want path=/v1/customers attempt=1", ev)
	}

	// Page events: one per page (2 pages).
	if len(pageEvents) != 2 {
		t.Errorf("page events = %d, want 2", len(pageEvents))
	}
	// First page has no cursor and RecordsSoFar=2; second has cursor="b"
	// and RecordsSoFar=3.
	if len(pageEvents) >= 1 {
		ev := pageEvents[0]
		if ev.Page != 1 || ev.Cursor != "" || ev.RecordsSoFar != 2 {
			t.Errorf("page 1 event = %+v, want {Page:1 Cursor:\"\" RecordsSoFar:2}", ev)
		}
	}
	if len(pageEvents) >= 2 {
		ev := pageEvents[1]
		if ev.Page != 2 || ev.Cursor != "b" || ev.RecordsSoFar != 3 {
			t.Errorf("page 2 event = %+v, want {Page:2 Cursor:\"b\" RecordsSoFar:3}", ev)
		}
	}
}

// TestClient_NoProgressHandler_Succeeds verifies the nil-handler
// fast-path — most tests don't install a handler and pagination must
// still work.
func TestClient_NoProgressHandler_Succeeds(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_, _ = w.Write([]byte(`{"data":[{"id":"a"}],"has_more":false}`))
	}))
	defer srv.Close()

	c := client.NewClient("rk_test_fake", "2026-03-25.dahlia", client.WithBaseURL(srv.URL))
	records, _, err := c.ListBounded(context.Background(), "/v1/x", nil, 0)
	if err != nil {
		t.Fatalf("ListBounded: %v", err)
	}
	if len(records) != 1 {
		t.Errorf("got %d records, want 1", len(records))
	}
}

func TestClient_ListBoundedUnbounded(t *testing.T) {
	// maxRecords <= 0 behaves exactly like ListAll.
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Query().Get("starting_after") == "" {
			_, _ = w.Write([]byte(`{"data":[{"id":"a"}],"has_more":false}`))
			return
		}
		t.Fatalf("unexpected follow-up request")
	}))
	defer srv.Close()

	c := newTestClient(t, srv)
	got, truncated, err := c.ListBounded(context.Background(), "/v1/x", nil, 0)
	if err != nil {
		t.Fatalf("err: %v", err)
	}
	if len(got) != 1 {
		t.Errorf("got %d, want 1", len(got))
	}
	if truncated {
		t.Errorf("unbounded pull should never report truncation")
	}
}

func TestClient_RateLimitRetry(t *testing.T) {
	// First two calls return 429; third succeeds. Verifies the retry
	// loop re-issues the request and eventually returns the success body.
	//
	// The 429 body uses Stripe's real nesting
	// (`error.retry_after_ms`), which pins the retryAfterDelay
	// unmarshal path. An earlier revision read the field at the top
	// level and silently fell through to exponential backoff on real
	// Stripe 429s.
	var attempts int
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		attempts++
		if attempts < 3 {
			w.WriteHeader(http.StatusTooManyRequests)
			_, _ = fmt.Fprint(w,
				`{"error":{"type":"rate_limit_error","message":"Too many requests.","retry_after_ms":10}}`,
			)
			return
		}
		// Confirm the retried request still carries the original body.
		// Form bodies are URL-encoded, so "@" arrives as "%40".
		body, _ := io.ReadAll(r.Body)
		values, _ := url.ParseQuery(string(body))
		if values.Get("email") != "alice@example.com" {
			t.Errorf("retry lost the body: email=%q in %q", values.Get("email"), string(body))
		}
		_, _ = w.Write([]byte(`{"id":"cus_ok"}`))
	}))
	defer srv.Close()

	c := newTestClient(t, srv)
	form := url.Values{"email": []string{"alice@example.com"}}
	resp, err := c.Create(context.Background(), "/v1/customers", "customers/new-alice.json", form)
	if err != nil {
		t.Fatalf("Create after 429 retries: %v", err)
	}
	if !strings.Contains(string(resp), "cus_ok") {
		t.Errorf("unexpected response: %s", string(resp))
	}
	if attempts != 3 {
		t.Errorf("expected 3 attempts (2 x 429 + 1 success), got %d", attempts)
	}
}

func TestClient_RateLimitExhausted(t *testing.T) {
	// Every attempt returns 429 — verify the client eventually gives up
	// and surfaces a 429 APIError rather than hanging. Uses Stripe's
	// real error.retry_after_ms nesting so the test pins the same
	// unmarshal path production hits.
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusTooManyRequests)
		_, _ = fmt.Fprint(w,
			`{"error":{"type":"rate_limit_error","message":"still throttled","retry_after_ms":1}}`,
		)
	}))
	defer srv.Close()

	c := newTestClient(t, srv)
	form := url.Values{"email": []string{"x@y.com"}}
	_, err := c.Create(context.Background(), "/v1/customers", "s", form)
	var se *client.APIError
	if !errors.As(err, &se) {
		t.Fatalf("expected *client.APIError, got %T: %v", err, err)
	}
	if se.HTTPStatus != http.StatusTooManyRequests {
		t.Errorf("status = %d, want 429", se.HTTPStatus)
	}
}

func TestClient_Is403AuthError(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusForbidden)
		_, _ = fmt.Fprint(w,
			`{"error":{"type":"invalid_request_error","code":"permission_denied","message":"key lacks write scope"}}`,
		)
	}))
	defer srv.Close()

	c := newTestClient(t, srv)
	form := url.Values{"email": []string{"x@y.com"}}
	_, err := c.Create(context.Background(), "/v1/customers", "s", form)
	if !client.IsAuthError(err) {
		t.Errorf("IsAuthError should match 403 (permission denied)")
	}
}

func TestClient_Ping(t *testing.T) {
	// /v1/balance is accessible with every Stripe key — even narrowly-
	// scoped restricted keys that only have write on a single resource.
	// Previously the connector pinged /v1/charges, which wrongly failed
	// ConfigValidate for write-only keys.
	var gotPath string
	var gotAuth string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotPath = r.URL.Path
		gotAuth = r.Header.Get("Authorization")
		_, _ = w.Write([]byte(`{"available":[]}`))
	}))
	defer srv.Close()

	c := newTestClient(t, srv)
	if err := c.Ping(context.Background()); err != nil {
		t.Fatalf("Ping: %v", err)
	}
	if gotPath != "/v1/balance" {
		t.Errorf("ping routed to %q (want /v1/balance)", gotPath)
	}
	if gotAuth == "" {
		t.Errorf("ping did not stamp Authorization header")
	}
}

func TestClient_ListBoundedHandlesHugeCap(t *testing.T) {
	// A user-supplied cap of, say, 1 billion must not trigger a
	// giant pre-allocation. If preallocHint isn't clamped, this test
	// would either OOM the test process or take minutes to allocate
	// the backing array.
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_, _ = w.Write([]byte(`{"data":[{"id":"a"}],"has_more":false}`))
	}))
	defer srv.Close()

	c := newTestClient(t, srv)
	const hugeCap = 1_000_000_000
	got, truncated, err := c.ListBounded(context.Background(), "/v1/x", nil, hugeCap)
	if err != nil {
		t.Fatalf("ListBounded(hugeCap): %v", err)
	}
	if len(got) != 1 || truncated {
		t.Errorf("got len=%d truncated=%v, want len=1 truncated=false", len(got), truncated)
	}
}

func TestClient_RetryAfterHeaderHonored(t *testing.T) {
	// Stripe sets Retry-After on real-world 429s; the retry loop must
	// honor it rather than falling through to exponential backoff.
	var attempts int
	var firstRetryAfter time.Time
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		attempts++
		if attempts == 1 {
			w.Header().Set("Retry-After", "1") // seconds — minimal to keep the test quick
			w.WriteHeader(http.StatusTooManyRequests)
			_, _ = fmt.Fprint(w, `{"error":{"type":"rate_limit_error","message":"throttled"}}`)
			firstRetryAfter = time.Now()
			return
		}
		_, _ = w.Write([]byte(`{"id":"cus_ok"}`))
	}))
	defer srv.Close()

	c := newTestClient(t, srv)
	form := url.Values{"email": []string{"x@y.com"}}
	start := time.Now()
	if _, err := c.Create(context.Background(), "/v1/customers", "s", form); err != nil {
		t.Fatalf("Create: %v", err)
	}
	elapsed := time.Since(start)
	if attempts != 2 {
		t.Errorf("want 2 attempts, got %d", attempts)
	}
	// Must have waited at least ~1s between attempts. Allow 100ms slack
	// for scheduler jitter.
	if elapsed < 900*time.Millisecond {
		t.Errorf("expected ≥1s backoff from Retry-After, elapsed %v", elapsed)
	}
	_ = firstRetryAfter
}

func TestClient_IdempotencyWhitespaceInsensitive(t *testing.T) {
	// The Idempotency-Key is derived from the FORM body (url-encoded,
	// key-sorted) — not the raw JSON file. So a CRLF/LF change or a
	// JSON key reorder in the source file produces the same key.
	// This is the fix for the prior "duplicate customer on git
	// line-ending conversion" bug.
	var keys []string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		keys = append(keys, r.Header.Get("Idempotency-Key"))
		_, _ = w.Write([]byte(`{"id":"cus_ok"}`))
	}))
	defer srv.Close()

	c := newTestClient(t, srv)
	// Two JSON files that hash differently but produce identical
	// form bodies via JSONToForm's sorted-key flatten.
	formA, err := client.JSONToForm([]byte("{\"name\":\"A\",\"email\":\"x@y.com\"}"))
	if err != nil {
		t.Fatal(err)
	}
	formB, err := client.JSONToForm([]byte("{\"email\":\"x@y.com\",\"name\":\"A\"}\r\n"))
	if err != nil {
		t.Fatal(err)
	}

	if _, err = c.Create(context.Background(), "/v1/customers", "s", formA); err != nil {
		t.Fatal(err)
	}
	if _, err = c.Create(context.Background(), "/v1/customers", "s", formB); err != nil {
		t.Fatal(err)
	}
	if keys[0] != keys[1] {
		t.Fatalf("whitespace / key-reorder should not change the idempotency key: %q vs %q",
			keys[0], keys[1])
	}
}

func TestClient_ResponseBodySizeCapped(t *testing.T) {
	// Huge response bodies must not OOM the connector. The LimitReader
	// caps to ~50 MB; larger returns an error rather than succeeding
	// with truncated data.
	huge := make([]byte, 51*1024*1024) // 51 MB — just over the cap
	for i := range huge {
		huge[i] = 'x'
	}
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_, _ = w.Write(huge)
	}))
	defer srv.Close()

	c := newTestClient(t, srv)
	_, err := c.GetByID(context.Background(), "/v1/customers", "cus_abc")
	if err == nil {
		t.Fatalf("expected size-cap error on 51 MB response")
	}
	if !strings.Contains(err.Error(), "exceeds") {
		t.Errorf("error should mention size cap: %v", err)
	}
}

func TestClient_GetByID(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/v1/customers/cus_abc" {
			t.Errorf("unexpected path: %s", r.URL.Path)
		}
		_, _ = w.Write([]byte(`{"id":"cus_abc","email":"alice@example.com"}`))
	}))
	defer srv.Close()

	c := newTestClient(t, srv)
	body, err := c.GetByID(context.Background(), "/v1/customers", "cus_abc")
	if err != nil {
		t.Fatalf("GetByID: %v", err)
	}
	var peek struct {
		ID    string `json:"id"`
		Email string `json:"email"`
	}
	if jsonErr := json.Unmarshal(body, &peek); jsonErr != nil {
		t.Fatalf("unmarshal: %v", jsonErr)
	}
	if peek.ID != "cus_abc" || peek.Email != "alice@example.com" {
		t.Errorf("got %+v", peek)
	}
}
