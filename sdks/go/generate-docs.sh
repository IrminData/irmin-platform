#!/usr/bin/env bash
set -euo pipefail

# Generate Go docs:
# - HTML per package (go doc) under docs/html with an index.html
# - Combined Markdown reference (gomarkdoc) at docs/docs.md

DOCS_DIR="${DOCS_DIR:-docs}"
HTML_DIR="${DOCS_DIR}/html"
MD_FILE="${DOCS_DIR}/docs.md"
INDEX_FILE="${HTML_DIR}/index.html"

# Resolve module path for nicer titles (optional)
MOD_PATH="$(go list -m -f '{{.Path}}' 2>/dev/null || echo "")"

need_tool() {
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
      *)
        echo "Unknown tool $1" >&2
        exit 1
        ;;
    esac
  fi
}

need_tool gomarkdoc

# Get the full path to gomarkdoc
GOBIN=$(go env GOBIN)
if [[ -z "$GOBIN" ]]; then
  GOPATH=$(go env GOPATH)
  GOBIN="$GOPATH/bin"
fi

GOMARKDOC_CMD="$GOBIN/gomarkdoc"

# Gather packages without process substitution
PKGS=()
if [[ -n "${PACKAGES:-}" ]]; then
  # Split PACKAGES by newlines
  while IFS= read -r line; do
    [[ -n "$line" ]] && PKGS+=("$line")
  done <<<"$PACKAGES"
else
  # Use a temporary file to avoid process substitution issues
  TEMP_FILE=$(mktemp)
  go list ./... > "$TEMP_FILE"
  while IFS= read -r line; do
    [[ -n "$line" ]] && PKGS+=("$line")
  done < "$TEMP_FILE"
  rm -f "$TEMP_FILE"
fi

if [[ "${#PKGS[@]}" -eq 0 ]]; then
  echo "No packages found."
  exit 0
fi

# Clean up old docs and recreate directories
echo "Cleaning up old docs..."
rm -rf "${DOCS_DIR}"
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
  echo "<p>Generated from source; do not edit directly.</p>"
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
"$GOMARKDOC_CMD" \
  --repository.url "https://github.com/IrminData/irmin-platform" \
  --repository.default-branch main \
  --repository.path /sdks/go \
  ${GOMARKDOC_FLAGS:-} ./... > "${MD_FILE}"

echo "Done."
echo "HTML index: ${INDEX_FILE}"
echo "Markdown: ${MD_FILE}"
