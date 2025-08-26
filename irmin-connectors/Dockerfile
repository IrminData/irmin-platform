# Stage 1: Build
# Use a Debian Bookworm-based Go image to pin glibc version and avoid runtime mismatches
FROM golang:1.25-bookworm AS builder

# Install C/C++ build tools needed for CGO
RUN apt-get update && apt-get install -y build-essential && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Leverage layer caching for dependencies
COPY go.mod go.sum ./
RUN go mod download

# Copy the rest of the source code
COPY . .

# Build the Go binary with CGO enabled.
# The -ldflags strips debug info, making the binary smaller.
RUN CGO_ENABLED=1 go build -ldflags="-w -s" -o /app/main .

# Stage 2: Runtime
# Use Debian Bookworm (same glibc family as builder) to ensure compatibility
FROM debian:bookworm-slim

# Create a non-root user and group for the application for security
RUN addgroup --system app && adduser --system --ingroup app app

# Install only the necessary packages:
# - ca-certificates: For making secure HTTPS/TLS connections.
# Then, clean up the apt cache to keep the image small.
RUN apt-get update && \
    apt-get install -y --no-install-recommends ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Prepare a writable home directory for the non-root user to avoid tools defaulting to /nonexistent
RUN mkdir -p /home/app && chown -R app:app /home/app
ENV HOME=/home/app \
    XDG_CACHE_HOME=/home/app/.cache \
    GOPATH=/home/app/go \
    GOMODCACHE=/home/app/go/pkg/mod

WORKDIR /app

# Copy the compiled binary from the build stage
COPY --from=builder /app/main .

# Copy the public directory for static file serving
COPY --from=builder /app/public ./public

# Switch to the non-root user
USER app

# Expose port 8080 for networking
EXPOSE 8080

# Set the default command to run your application
CMD ["./main"]