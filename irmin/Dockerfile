# Stage 1: Build
# Use the standard Go image with glibc for DuckDB compatibility
FROM golang:1.24 AS builder

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
# Use a standard, minimal base image. Ubuntu is a solid choice.
FROM ubuntu:22.04

# Create a non-root user and group for the application for security
RUN addgroup --system app && adduser --system --ingroup app app

# Install only the necessary packages:
# - docker-cli: The client for controlling the Docker engine.
# - ca-certificates: For making secure HTTPS/TLS connections.
# Then, clean up the apt cache to keep the image small.
RUN apt-get update && \
    apt-get install -y --no-install-recommends docker-cli ca-certificates && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy the compiled binary from the build stage
COPY --from=builder /app/main .

# Switch to the non-root user
USER app

# Expose port 8080 for networking
EXPOSE 8080

# Set the default command to run your application
CMD ["./main"]