.PHONY: validate test-go test-core lint-go validate-ai validate-console

PNPM := corepack pnpm
GOLANGCI_LINT := go run github.com/golangci/golangci-lint/v2/cmd/golangci-lint@v2.6.1

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
