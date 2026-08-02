.PHONY: validate test-go test-core lint-go validate-ai validate-console

validate: test-go lint-go validate-ai validate-console

test-go:
	go test -timeout 2m ./connectors/... ./sdks/go/...

test-core:
	cd core && go test -timeout 2m ./...

lint-go:
	cd core && golangci-lint run
	cd connectors && golangci-lint run
	cd sdks/go && golangci-lint run

validate-ai:
	cd ai && pnpm typecheck
	cd ai && pnpm exec prettier --check "src/**/*.ts"
	cd ai && pnpm lint
	cd ai && pnpm knip

validate-console:
	cd console && pnpm typecheck
	cd console && pnpm format
	cd console && pnpm lint
	cd console && pnpm test:dict
	cd console && pnpm knip
