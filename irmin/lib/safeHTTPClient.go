package lib

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/netip"
	"slices"
	"strings"
	"syscall"
	"time"

	urlpkg "net/url"
)

// HTTP client and download safety limits
const (
	httpClientTimeoutSeconds       = 60
	httpDialTimeoutSeconds         = 5
	httpTLSHandshakeTimeoutSeconds = 5
	httpRespHeaderTimeoutSeconds   = 10
	httpMaxRedirects               = 5
	maxUploadFromURLBytes          = 100 * 1024 * 1024 // 100MB
	httpKeepAliveSeconds           = 30
	httpMaxIdleConns               = 100
	httpIdleConnTimeoutSeconds     = 90
	httpExpectContinueTimeoutSecs  = 1
)

// limitedReadCloser returns an error when more than the allowed number of bytes are read.
type limitedReadCloser struct {
	r         io.ReadCloser
	remaining int64
	totalRead int64
}

func (l *limitedReadCloser) Read(p []byte) (int, error) {
	if l.remaining <= 0 {
		return 0, fmt.Errorf("download size exceeds limit of %d bytes", maxUploadFromURLBytes)
	}
	if int64(len(p)) > l.remaining {
		p = p[:l.remaining]
	}
	n, err := l.r.Read(p)
	l.remaining -= int64(n)
	l.totalRead += int64(n)
	if err == io.EOF && l.remaining < 0 {
		return n, fmt.Errorf("download size exceeds limit of %d bytes", maxUploadFromURLBytes)
	}
	if l.remaining <= 0 && err == nil {
		return n, fmt.Errorf("download size exceeds limit of %d bytes", maxUploadFromURLBytes)
	}
	return n, err
}

func (l *limitedReadCloser) Close() error { return l.r.Close() }

// isIPDisallowed returns true if the IP is private, loopback, link-local, multicast, or unspecified.
func isIPDisallowed(ip net.IP) bool {
	addr, err := netip.ParseAddr(ip.String())
	if err != nil {
		return true
	}
	if addr.IsPrivate() || addr.IsLoopback() || addr.IsLinkLocalUnicast() || addr.IsLinkLocalMulticast() ||
		addr.IsMulticast() ||
		addr.IsUnspecified() {
		return true
	}
	return false
}

// validateFetchURL performs basic SSRF checks on the URL before issuing a request.
func validateFetchURL(ctx context.Context, target *urlpkg.URL) error {
	if target == nil {
		return errors.New("invalid URL")
	}
	scheme := strings.ToLower(target.Scheme)
	if scheme != "http" && scheme != "https" {
		return fmt.Errorf("unsupported URL scheme: %s", target.Scheme)
	}
	host := target.Hostname()
	if host == "" {
		return errors.New("invalid URL: missing hostname")
	}
	// If host is an IP literal, check it directly
	if ip := net.ParseIP(host); ip != nil {
		if isIPDisallowed(ip) {
			return errors.New("disallowed IP address")
		}
		return nil
	}
	// Otherwise resolve and ensure no private/internal addresses
	resolver := &net.Resolver{}
	addrs, err := resolver.LookupIPAddr(ctx, host)
	if err != nil {
		return fmt.Errorf("failed to resolve host: %w", err)
	}
	if slices.ContainsFunc(addrs, func(addr net.IPAddr) bool {
		return isIPDisallowed(addr.IP)
	}) {
		return errors.New("disallowed resolved IP address")
	}
	return nil
}

// NewSafeHTTPClient creates an HTTP client with timeouts, redirect checks, and IP blocking via Dialer.Control.
func NewSafeHTTPClient(ctx context.Context) *http.Client {
	dialer := &net.Dialer{
		Timeout:   time.Duration(httpDialTimeoutSeconds) * time.Second,
		KeepAlive: time.Duration(httpKeepAliveSeconds) * time.Second,
		Control: func(_ string, address string, _ syscall.RawConn) error {
			host, _, err := net.SplitHostPort(address)
			if err != nil {
				return err
			}
			ip := net.ParseIP(host)
			if ip == nil {
				return errors.New("unable to parse dial address")
			}
			if isIPDisallowed(ip) {
				return errors.New("dial to disallowed IP blocked")
			}
			return nil
		},
	}

	transport := &http.Transport{
		Proxy:                 http.ProxyFromEnvironment,
		DialContext:           dialer.DialContext,
		TLSHandshakeTimeout:   time.Duration(httpTLSHandshakeTimeoutSeconds) * time.Second,
		MaxIdleConns:          httpMaxIdleConns,
		IdleConnTimeout:       time.Duration(httpIdleConnTimeoutSeconds) * time.Second,
		ExpectContinueTimeout: time.Duration(httpExpectContinueTimeoutSecs) * time.Second,
		ResponseHeaderTimeout: time.Duration(httpRespHeaderTimeoutSeconds) * time.Second,
	}

	client := &http.Client{Transport: transport}
	client.Timeout = time.Duration(httpClientTimeoutSeconds) * time.Second
	client.CheckRedirect = func(req *http.Request, via []*http.Request) error {
		if len(via) >= httpMaxRedirects {
			return fmt.Errorf("stopped after %d redirects", httpMaxRedirects)
		}
		// Strip Authorization on cross-host redirects
		if len(via) > 0 {
			prev := via[len(via)-1]
			if !strings.EqualFold(prev.URL.Host, req.URL.Host) {
				req.Header.Del("Authorization")
			}
		}
		// Validate the redirect target as well
		if err := validateFetchURL(ctx, req.URL); err != nil {
			return err
		}
		return nil
	}
	return client
}

// DownloadFileFromURL performs a safe HTTP GET with SSRF protections and returns a size-limited body.
// The caller must Close the returned ReadCloser.
func DownloadFileFromURL(ctx context.Context, targetURL string, headers map[string]string) (io.ReadCloser, error) {
	parsedURL, parseErr := urlpkg.Parse(targetURL)
	if parseErr != nil {
		return nil, fmt.Errorf("invalid URL: %w", parseErr)
	}
	if validateErr := validateFetchURL(ctx, parsedURL); validateErr != nil {
		return nil, validateErr
	}

	httpClient := NewSafeHTTPClient(ctx)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, parsedURL.String(), nil)
	if err != nil {
		return nil, err
	}
	for key, value := range headers {
		req.Header.Set(key, value)
	}

	resp, err := httpClient.Do(req)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		_ = resp.Body.Close()
		return nil, fmt.Errorf("download failed with HTTP status %d", resp.StatusCode)
	}

	if resp.ContentLength > 0 && resp.ContentLength > maxUploadFromURLBytes {
		_ = resp.Body.Close()
		return nil, fmt.Errorf("remote file too large: %d bytes (limit %d)", resp.ContentLength, maxUploadFromURLBytes)
	}

	return &limitedReadCloser{r: resp.Body, remaining: maxUploadFromURLBytes}, nil
}
