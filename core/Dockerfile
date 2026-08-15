# Stage 1: Build Go Application
FROM golang:1.26-bookworm AS builder

RUN apt-get update && apt-get install -y build-essential && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=1 go build -ldflags="-w -s" -o /app/main .
RUN CGO_ENABLED=1 go build -ldflags="-w -s" -o /app/install-duckdb-extensions ./cmd/install-duckdb-extensions

# Stage 2: Runtime
FROM debian:bookworm-slim

# Install runtime dependencies (Python, Node, Go) including sudo and bash
RUN apt-get update && apt-get install -y --no-install-recommends \
    sudo \
    bash \
    python3.11 \
    python3-pip \
    nodejs \
    npm \
    wget \
    ca-certificates \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

# Install the same Go patch release used by the workspace.
RUN wget https://go.dev/dl/go1.26.5.linux-amd64.tar.gz && \
    tar -C /usr/local -xzf go1.26.5.linux-amd64.tar.gz && \
    rm go1.26.5.linux-amd64.tar.gz

# Set up environment
ENV PATH="/usr/local/go/bin:${PATH}"
ENV GOPATH="/tmp/go"
ENV GOMODCACHE="/tmp/go/pkg/mod"

# Create dedicated users for privilege separation with shared group
RUN groupadd -r irmingroup && \
    useradd -r -g irmingroup -s /bin/false sandbox && \
    useradd -r -g irmingroup -s /bin/false appuser && \
    mkdir -p /var/lib/irmin-compute-sandbox && \
    chown appuser:irmingroup /var/lib/irmin-compute-sandbox && \
    chmod 770 /var/lib/irmin-compute-sandbox && \
    mkdir -p /home/sandbox && \
    chown sandbox:irmingroup /home/sandbox && \
    chmod 700 /home/sandbox && \
    mkdir -p /home/appuser && \
    chown appuser:irmingroup /home/appuser && \
    chmod 700 /home/appuser

# Configure sudo for appuser -> sandbox execution (restricted to interpreters and shells)
RUN echo "appuser ALL=(sandbox) NOPASSWD: /usr/bin/python3, /usr/local/go/bin/go, /usr/bin/node, /usr/bin/npx, /bin/sh, /bin/bash" > /etc/sudoers.d/sandbox && \
    chmod 440 /etc/sudoers.d/sandbox && \
    visudo -c -f /etc/sudoers.d/sandbox

WORKDIR /app

# Copy the compiled binary with correct ownership
COPY --from=builder --chown=appuser:irmingroup /app/main .
COPY --from=builder --chown=appuser:irmingroup /app/install-duckdb-extensions .

# Lock down app directory and executable
RUN chown -R appuser:irmingroup /app && \
    chmod 700 /app && \
    chmod 700 /app/main

# Switch to appuser for running the main application
ENV HOME=/home/appuser
USER appuser

# DuckDB request handlers only LOAD extensions. Fetch the pinned, ABI-matched
# extension artifacts once while building the image.
RUN ./install-duckdb-extensions && rm ./install-duckdb-extensions

# Expose port
EXPOSE 8080

# Run the application (no entrypoint script needed)
CMD ["./main"]
