<img src="https://github.com/IrminData/irmin-frontend/blob/development/public/irmin-logo-light.svg" width="200" alt="Irmin Logo">

# Irmin Connectors

A collection of deployable connectors for Irmin that enable universal interaction with external services, data sources, and export targets in a simple, standardized, stateless and safe fashion.

## 📚 Documentation Quick Links

- **[Concepts and Processes](concepts-and-processes.md)** - Understanding how connectors work
- **[How to Create Connectors](how-to-create-connectors.md)** - Developer guide for building new connectors
- **[Planned Connectors](planned-connectors.md)** - Roadmap and upcoming integrations
- **[Future Improvements](future-improvements.md)** - Enhancement plans and architecture evolution

## What is Irmin Connectors?

Irmin Connectors is a repository containing connector implementations that allow the Irmin platform to interact with virtually any external system. Connectors define standardized interfaces that enable seamless data import, export, and synchronization across diverse platforms and services.

For detailed information about how connectors work, the registration process, data transmission, and core concepts, see our [Concepts and Processes](concepts-and-processes.md) documentation.

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

## Available Connectors

### Production Ready
- **PostgreSQL** ✅ - Complete database integration with real-time change detection

Each connector includes its own detailed README with specific implementation details, configuration options, and usage examples. You can find connector-specific documentation in their respective directories under `connectors/`.

### Planned Connectors
See [Planned Connectors](planned-connectors.md) for the complete roadmap including:
- Database connectors (MySQL, MongoDB, etc.)
- Cloud storage (Google Drive, S3, etc.)
- Business applications (Salesforce, HubSpot, etc.)
- API integrations (REST, GraphQL, etc.)

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
go run main.go -skip-registrations  # Skip connector registrations
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

## Documentation

### Architecture and Concepts
- [Concepts and Processes](concepts-and-processes.md) - Core concepts, architecture, and how connectors work

### For Developers
- [How to Create Connectors](how-to-create-connectors.md) - Complete guide for building new connectors
- [PostgreSQL Connector](connectors/postgres/README.md) - Detailed PostgreSQL connector documentation
- [Future Improvements](future-improvements.md) - Planned enhancements and roadmap

### For Users
- [Planned Connectors](planned-connectors.md) - Roadmap of upcoming connectors
- API documentation available at runtime on `/docs` endpoint

## Contributing

We welcome contributions from the community! Whether you want to:

- **Add a New Connector**: Follow our [connector creation guide](how-to-create-connectors.md)
- **Fix Bugs**: Check our issues for bug reports
- **Improve Documentation**: Help make our docs even better
- **Enhance Performance**: Optimize existing connectors
- **Add Features**: Implement new capabilities

### Contribution Process

1. **Fork the Repository**: Create your own fork of the project
2. **Create a Feature Branch**: Work on your changes in a dedicated branch
3. **Follow Standards**: Ensure your code meets our quality standards
4. **Write Tests**: Add appropriate tests for new functionality
5. **Submit a Pull Request**: We'll review and provide feedback

### Development Guidelines

- **Code Quality**: All code must pass linting and formatting checks
- **Testing**: Maintain or improve test coverage
- **Documentation**: Update documentation for any changes
- **Security**: Follow security best practices for credential handling
- **Performance**: Consider performance implications of changes

## Support and Community

### Getting Help

- **Documentation**: Start with our comprehensive docs
- **Issues**: Report bugs or request features via GitHub issues
- **Discussions**: Join community discussions for questions and ideas

### Roadmap and Updates

Stay updated with:
- **Release Notes**: Regular updates on new features and improvements
- **Roadmap**: Check our planned connectors and improvements
- **Community Feedback**: Your input helps shape our development priorities

---

**Ready to connect your data?** Start by exploring our available connectors or dive into creating your own with our comprehensive development guides.
