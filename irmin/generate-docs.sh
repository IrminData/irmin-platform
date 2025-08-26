#!/usr/bin/env bash
set -euo pipefail

# Generate Go docs:
# - HTML per package (go doc) under docs/html with an index.html
# - Combined Markdown reference (gomarkdoc) at docs/docs.md
# - Swagger API documentation (swag) at docs/swagger.json, docs/swagger.yaml, docs/docs.go

# Ensure we're using the correct Go version from the start
export GOROOT=$(go env GOROOT)
export PATH="$(go env GOROOT)/bin:$PATH"

DOCS_DIR="${DOCS_DIR:-docs}"
HTML_DIR="${DOCS_DIR}/html"
MD_FILE="${DOCS_DIR}/docs.md"
INDEX_FILE="${HTML_DIR}/index.html"
SWAGGER_DIR="${DOCS_DIR}"

# Resolve module path for nicer titles (optional)
MOD_PATH="$(go list -m -f '{{.Path}}' 2>/dev/null || echo "")"

need_tool() {
  # Ensure we're using the correct Go version
  export GOROOT=$(go env GOROOT)
  export PATH="$(go env GOROOT)/bin:$PATH"
  
  # Get Go bin directory
  GOBIN=$(go env GOBIN)
  if [[ -z "$GOBIN" ]]; then
    GOPATH=$(go env GOPATH)
    GOBIN="$GOPATH/bin"
  fi
  
  # Add Go bin to PATH if not already there
  if [[ ":$PATH:" != *":$GOBIN:"* ]]; then
    export PATH="$GOBIN:$PATH"
  fi
  
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Installing $1 ..."
    case "$1" in
      gomarkdoc)
        go install github.com/princjef/gomarkdoc/cmd/gomarkdoc@latest
        ;;
      swag)
        go install github.com/swaggo/swag/cmd/swag@latest
        ;;
      *)
        echo "Unknown tool $1" >&2
        exit 1
        ;;
    esac
  fi
}

need_tool gomarkdoc
need_tool swag

# Get the full path to tools
GOBIN=$(go env GOBIN)
if [[ -z "$GOBIN" ]]; then
  GOPATH=$(go env GOPATH)
  GOBIN="$GOPATH/bin"
fi

GOMARKDOC_CMD="$GOBIN/gomarkdoc"
SWAG_CMD="$GOBIN/swag"

# Gather packages without process substitution
PKGS=()
if [[ -n "${PACKAGES:-}" ]]; then
  # Split PACKAGES by newlines
  while IFS= read -r line; do
    [[ -n "$line" ]] && PKGS+=("$line")
  done <<<"$PACKAGES"
else
  # Use a temporary file to avoid process substitution issues
  # Exclude test packages (those ending with _test)
  TEMP_FILE=$(mktemp)
  go list ./... | grep -v '_test$' > "$TEMP_FILE"
  while IFS= read -r line; do
    [[ -n "$line" ]] && PKGS+=("$line")
  done < "$TEMP_FILE"
  rm -f "$TEMP_FILE"
fi

if [[ "${#PKGS[@]}" -eq 0 ]]; then
  echo "No packages found."
  exit 0
fi

mkdir -p "${HTML_DIR}" "${DOCS_DIR}"

safe_name() {
  # Replace / and . with __ for filenames
  echo "$1" | tr '/.' '__'
}

echo "Generating HTML docs (go doc) for ${#PKGS[@]} packages into ${HTML_DIR} ..."
HTML_ENTRIES=()
for pkg in "${PKGS[@]}"; do
  out="${HTML_DIR}/$(safe_name "${pkg}").html"
  echo " - ${pkg} -> $(basename "${out}")"
  
  # Generate HTML from go doc output
  {
    echo "<!doctype html>"
    echo "<html><head><meta charset=\"utf-8\"/><title>${pkg}</title></head><body>"
    echo "<h1>Package ${pkg}</h1>"
    echo "<pre>"
    go doc -all "${pkg}" | sed 's/&/\&amp;/g; s/</\&lt;/g; s/>/\&gt;/g'
    echo "</pre>"
    echo "</body></html>"
  } > "${out}"
  
  HTML_ENTRIES+=("${pkg}|${out}")
done

echo "Writing index: ${INDEX_FILE}"
{
  echo "<!doctype html>"
  echo "<meta charset=\"utf-8\"/>"
  title="${MOD_PATH:-Go} documentation"
  echo "<title>${title}</title>"
  echo "<h1>${title}</h1>"
  echo "<p>Generated on $(date -u '+%Y-%m-%d %H:%M UTC')</p>"
  echo "<ul>"
  for entry in "${HTML_ENTRIES[@]}"; do
    pkg="${entry%%|*}"
    file="${entry##*|}"
    base="$(basename "${file}")"
    echo "<li><a href=\"${base}\">${pkg}</a></li>"
  done
  echo "</ul>"
} > "${INDEX_FILE}"

echo "Generating Markdown reference (gomarkdoc) -> ${MD_FILE}"
"$GOMARKDOC_CMD" ${GOMARKDOC_FLAGS:-} ./... > "${MD_FILE}"

echo "Generating Swagger API documentation (swag) -> ${SWAGGER_DIR}"
# Ensure Go module is in a clean state for swagger generation
go mod tidy
"$SWAG_CMD" init -g main.go --output "${SWAGGER_DIR}" --parseDependency --parseInternal

echo "Done."
echo "HTML index: ${INDEX_FILE}"
echo "Markdown: ${MD_FILE}"
echo "Swagger docs: ${SWAGGER_DIR}/swagger.json, ${SWAGGER_DIR}/swagger.yaml, ${SWAGGER_DIR}/docs.go"