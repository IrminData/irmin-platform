# Stage 1: Build a static binary
# Use the Alpine variant of the Go image for a smaller build environment.
FROM golang:1.24-alpine AS builder

# It's good practice to install git, as Go modules may fetch dependencies
# from Git repositories. build-base is for the C compiler if any dependency
# needed it, but we will disable CGO anyway.
RUN apk add --no-cache build-base git

WORKDIR /app

# Copy dependency manifests first.
# This leverages Docker's layer caching to avoid re-downloading dependencies
# on every build unless go.mod or go.sum has changed.
COPY go.mod go.sum ./
RUN go mod download

# Copy the rest of your application's source code.
COPY . .

# Build a fully static, self-contained binary.
# - CGO_ENABLED=0 disables CGO, removing any dependency on system C libraries (like glibc).
# - -ldflags="-w -s" strips debug information, significantly reducing the binary size.
RUN CGO_ENABLED=0 go build -ldflags="-w -s" -o /app/main .


# Stage 2: Create the final, minimal image
# Use Alpine for built-in SSL certificates and debugging capabilities
FROM alpine:latest

# Install CA certificates for HTTPS requests
RUN apk --no-cache add ca-certificates

# Set the working directory.
WORKDIR /app

# Copy only the compiled binary from the builder stage.
COPY --from=builder /app/main .

# Copy the public directory for static file serving
COPY --from=builder /app/public ./public

# Expose the port your application listens on.
EXPOSE 8080

# Set the command to run your application.
CMD ["./main"]