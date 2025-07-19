<img src="https://github.com/IrminData/irmin-frontend/blob/development/public/irmin-logo-light.svg" width="200" alt="Irmin Logo">

# Irmin Connectors

A collection of deployable connectors for Irmin that enable universal interaction with external services, data sources, and export targets in a simple, standardized, stateless and safe fashion.

### Available Connectors

- **[PostgreSQL](connectors/postgres/README.md)** - Database connector for PostgreSQL.
- **[MySQL](connectors/mysql/README.md)** - Database connector for MySQL.
- **[SFTP](connectors/sftp/README.md)** - File transfer protocol connector for SFTP.

## What are Irmin Connectors?

Irmin Connectors are a collection of API services that allow the Irmin platform to interact with virtually any external system. Connectors define standardized interfaces that enable seamless data import, export, and synchronization across diverse platforms and services.

### Documentation Quick Links

- **[Concepts and Processes](concepts-and-processes.md)** - Understanding how connectors work
- **[How to Create Connectors](how-to-create-connectors.md)** - Developer guide for building new connectors

## Technology Stack

### Core Technologies

- **Language**: Go (Golang) for performance and concurrent processing
- **Web Framework**: Fiber for high-performance HTTP handling
- **Database**: PostgreSQL for reliable data storage
- **Authentication**: JWT-based token systems
- **Logging**: Structured logging with configurable levels

### Development Tools

- **Hot Reloading**: Air for development efficiency
- **Code Quality**: golangci-lint for comprehensive code analysis
- **Dependency Management**: Go modules for package management
- **Testing**: Built-in Go testing framework with custom extensions

## Getting Started

### Prerequisites

- Go 1.21 or higher
- PostgreSQL database
- Access to Irmin API instance

### Installation and Setup

**Install dependencies**

```bash
go mod download
```

**Update dependencies**

```bash
go mod tidy && go get -u ./...
```

**Environment Configuration**

Create a `.env` file with the following variables:

```bash
PORT=8080
URL=http://localhost:8080

PREFORK_ENABLED=true
HELMET_ENABLED=true
CORS_ENABLED=true
CORS_ORIGINS=https://api.irmin.dev

IRMIN_API_BASE_URL=https://api.irmin.dev
IRMIN_API_TOKEN=your_api_token_here

DATABASE_CONNECTION_STRING=postgres://user:password@localhost:5432/database
```

### Running the Application

**Development (with hot reloading)**

```bash
air
```

**Production build**

```bash
go build -o out
./out
```

**With flags**

```bash
go run main.go -migrate               # Run database migrations on startup
go run main.go -skip-registrations    # Skip connector registrations
go run main.go -migrate -skip-registrations  # Combine both flags
```

### Code Quality

**Run linter**

```bash
golangci-lint run
```

**Run with autofix**

```bash
golangci-lint run --fix
```

## Docker

1. Build the image:

	docker build -t irmin-connectors .

2. Run the container, injecting your local .env file for configuration:

	docker run -p 8080:8080 --env-file .env irmin-connectors
