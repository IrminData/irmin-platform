# Stage 1: Build Go Application
FROM golang:1.25-bookworm AS builder

RUN apt-get update && apt-get install -y build-essential && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=1 go build -ldflags="-w -s" -o /app/main .

# Stage 2: Runtime
FROM debian:bookworm-slim

# Install runtime dependencies (Python, Node, Go)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3.11 \
    python3-pip \
    nodejs \
    npm \
    wget \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install Go 1.25 manually (Debian only has 1.21)
RUN wget https://go.dev/dl/go1.25.0.linux-amd64.tar.gz && \
    tar -C /usr/local -xzf go1.25.0.linux-amd64.tar.gz && \
    rm go1.25.0.linux-amd64.tar.gz

# Set up environment
ENV PATH="/usr/local/go/bin:${PATH}"
ENV GOPATH="/tmp/go"
ENV GOMODCACHE="/tmp/go/pkg/mod"

WORKDIR /app

# Copy the compiled binary
COPY --from=builder /app/main .

# Expose port
EXPOSE 8080

# Run the application (no entrypoint script needed)
CMD ["./main"]