.PHONY: validate test-go test-core lint-go validate-ai validate-console

# Node 25+ no longer bundles Corepack. Use the packageManager-pinned pnpm on PATH.
PNPM := pnpm
# golangci-lint v2.15.0's go.mod requests Go 1.26. Pin go1.27.3 so `go run` does
# not download go1.26.10 and typecheck the Go 1.27 standard library with it.
GOLANGCI_LINT := GOTOOLCHAIN=go1.27.3 go run github.com/golangci/golangci-lint/v2/cmd/golangci-lint@v2.15.0

validate: test-go lint-go validate-ai validate-console

test-go:
	go test -timeout 2m ./connectors/... ./sdks/go/...

test-core:
	cd core && go test -timeout 2m ./...

lint-go:
	cd core && $(GOLANGCI_LINT) run
	cd connectors && $(GOLANGCI_LINT) run
	cd sdks/go && $(GOLANGCI_LINT) run

validate-ai:
	cd ai && $(PNPM) typecheck
	cd ai && $(PNPM) exec prettier --check "src/**/*.ts"
	cd ai && $(PNPM) lint
	cd ai && $(PNPM) knip

validate-console:
	cd console && $(PNPM) typecheck
	cd console && $(PNPM) format
	cd console && $(PNPM) lint
	cd console && $(PNPM) test:dict
	cd console && $(PNPM) knip
