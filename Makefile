.PHONY: validate test-go test-core lint-go validate-ai validate-console

validate: test-go lint-go validate-ai validate-console

test-go:
	go test -timeout 2m ./irmin-connectors/... ./sdks/go/...

test-core:
	cd irmin && go test -timeout 2m ./...

lint-go:
	cd irmin && golangci-lint run
	cd irmin-connectors && golangci-lint run
	cd sdks/go && golangci-lint run

validate-ai:
	cd irmin-ai && pnpm typecheck
	cd irmin-ai && pnpm exec prettier --check "src/**/*.ts"
	cd irmin-ai && pnpm lint
	cd irmin-ai && pnpm knip

validate-console:
	cd irmin-console && pnpm typecheck
	cd irmin-console && pnpm format
	cd irmin-console && pnpm lint
	cd irmin-console && pnpm knip
