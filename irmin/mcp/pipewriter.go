package mcp

import (
	"bufio"
	"fmt"
	"io"
	"net"
	"net/http"
)

// pipeResponseWriter minimally implements http.ResponseWriter, http.Flusher, http.Hijacker
// over a net.Pipe. It serialises status+headers, then streams the body.
type pipeResponseWriter struct {
	header  http.Header
	status  int
	bw      *bufio.Writer
	br      *bufio.Reader
	netConn net.Conn
	flushed bool
}

func newPipeResponseWriter(conn net.Conn) *pipeResponseWriter {
	return &pipeResponseWriter{
		header:  make(http.Header),
		status:  http.StatusOK,
		bw:      bufio.NewWriter(conn),
		br:      bufio.NewReader(conn),
		netConn: conn,
		flushed: false,
	}
}

func (w *pipeResponseWriter) Header() http.Header  { return w.header }
func (w *pipeResponseWriter) WriteHeader(code int) { w.status = code }
func (w *pipeResponseWriter) Flush()               { _ = w.flushHeaders(); _ = w.bw.Flush() }
func (w *pipeResponseWriter) Hijack() (net.Conn, *bufio.ReadWriter, error) {
	return w.netConn, bufio.NewReadWriter(w.br, w.bw), nil
}

func (w *pipeResponseWriter) Write(b []byte) (int, error) {
	if err := w.flushHeaders(); err != nil {
		return 0, err
	}
	n, err := w.bw.Write(b)
	_ = w.bw.Flush()
	return n, err
}

func (w *pipeResponseWriter) flushHeaders() error {
	if w.flushed {
		return nil
	}
	if _, err := fmt.Fprintf(w.bw, "HTTP/1.1 %d %s\r\n", w.status, http.StatusText(w.status)); err != nil {
		return err
	}
	for k, vals := range w.header {
		for _, v := range vals {
			if _, err := fmt.Fprintf(w.bw, "%s: %s\r\n", k, v); err != nil {
				return err
			}
		}
	}
	if _, err := io.WriteString(w.bw, "\r\n"); err != nil {
		return err
	}
	w.flushed = true
	return nil
}
