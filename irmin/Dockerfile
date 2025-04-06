# Stage 1: Build
FROM golang:1.24 AS builder
# - Install gcc and build tools for CGO support
RUN apt-get update && apt-get install -y gcc build-essential

# - Set working directory
WORKDIR /app

# - Copy dependency files and download modules
COPY go.mod go.sum ./
# - Download dependencies
RUN go mod download

# - Copy the entire source code into the container
COPY . .

# - Build the Go binary (CGO is enabled by default)
RUN go build -o out

# Stage 2: Runtime
# - Use a newer base image with newer glibc (Ubuntu 22.04 has glibc 2.35)
FROM ubuntu:22.04
# - Update package lists and install Docker CLI (and any other dependencies)
RUN apt-get update && \
    apt-get install -y docker.io ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# - Set the working directory for runtime
WORKDIR /app

# - Copy the compiled binary and required files from the build stage
COPY --from=builder /app/out .
COPY --from=builder /app/go.mod .
COPY --from=builder /app/.env .

# - Expose port 8080
EXPOSE 8080

# - Set the default command to run your application
CMD ["./out"]
