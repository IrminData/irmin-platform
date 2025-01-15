<img src="https://github.com/IrminData/irmin-frontend/blob/development/public/irmin-logo-light.svg" width="200" alt="Irmin Logo">

# Irmin Connectors

Connectors are a universal way to interact with external services, data sources, and export targets. They are applications that interface with Irmin for data import and export.

#### Run

`go run main.go`

#### Build

`go build`

#### Environment Variables

Create a `.env` file in the root directory of the project and add the following environment variables:

```bash
PORT=8080
URL=http://localhost:8080

IRMIN_API_BASE_URL=https://api.irmin.dev
IRMIN_API_TOKEN=...
```
