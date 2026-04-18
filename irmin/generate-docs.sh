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

# Handbook is hand-written long-form docs in handbook/*.md. They get
# rendered into the HTML output alongside the go-doc package pages so
# readers have a single starting point for both "how does it work" and
# "what does package X export". The top-level handbook/README.md is the
# on-GitHub index for the folder; we skip it during rendering so it
# doesn't duplicate the generated index page.
HANDBOOK_DIR="${HANDBOOK_DIR:-handbook}"
HANDBOOK_OUT_DIR="${HTML_DIR}/handbook"

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

echo "Rendering handbook from ${HANDBOOK_DIR}/ into ${HANDBOOK_OUT_DIR}/ ..."
# Handbook pages are Markdown files that turn into interactive HTML via a
# CDN-loaded Marked renderer. Keeping the markdown embedded as a
# <script type="text/markdown"> block preserves source fidelity
# (readers can View Source → copy the raw Markdown) while the browser
# renders a nicely-styled page. No build-time Go/Node tool needed.
HANDBOOK_ENTRIES=()
if [[ -d "${HANDBOOK_DIR}" ]]; then
  mkdir -p "${HANDBOOK_OUT_DIR}"
  # Process every .md in handbook/ except the top-level README, which
  # is the on-GitHub folder index and gets superseded by this script's
  # generated index page.
  while IFS= read -r md; do
    [[ -z "${md}" ]] && continue
    case "$(basename "${md}")" in
      README.md|readme.md) continue ;;
    esac
    base="$(basename "${md}" .md)"
    out="${HANDBOOK_OUT_DIR}/${base}.html"
    # Prefer the first `# heading` from the markdown (author-controlled
    # casing like "OAuth Connectors" is better than a sed-mangled
    # "Oauth Connectors"). Fall back to a slug-derived title otherwise.
    title="$(grep -m1 '^# ' "${md}" | sed 's/^# //' || true)"
    if [[ -z "${title}" ]]; then
      title="$(echo "${base}" | tr '-' ' ' | awk '{for(i=1;i<=NF;i++) $i=toupper(substr($i,1,1)) substr($i,2)}1')"
    fi
    echo " - ${md} -> ${out}"
    {
      echo "<!doctype html>"
      echo "<html lang=\"en\"><head>"
      echo "<meta charset=\"utf-8\"/>"
      echo "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"/>"
      echo "<title>${title} · ${MOD_PATH:-irmin}</title>"
      echo "<style>"
      echo "  body{font:15px/1.6 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;"
      echo "       max-width:820px;margin:2rem auto;padding:0 1rem;color:#1f2937}"
      echo "  h1,h2,h3{margin-top:2em}"
      echo "  pre{background:#f3f4f6;padding:1rem;border-radius:6px;overflow-x:auto}"
      echo "  code{background:#f3f4f6;padding:2px 4px;border-radius:3px}"
      echo "  pre code{background:transparent;padding:0}"
      echo "  a{color:#0369a1}"
      echo "  table{border-collapse:collapse;margin:1em 0}"
      echo "  th,td{border:1px solid #e5e7eb;padding:6px 10px;text-align:left}"
      echo "  th{background:#f3f4f6}"
      echo "  nav{font-size:13px;color:#6b7280;margin-bottom:2rem}"
      echo "  nav a{color:#6b7280;text-decoration:underline}"
      echo "</style>"
      echo "</head><body>"
      echo "<nav><a href=\"../index.html\">← Documentation index</a></nav>"
      # Embed raw markdown so it's visible via View Source and rendered
      # client-side by marked. Escaping </script> keeps browsers from
      # breaking out of the script block.
      echo "<script id=\"source\" type=\"text/markdown\">"
      sed 's#</[sS][cC][rR][iI][pP][tT]>#<\\/script>#g' "${md}"
      echo ""
      echo "</script>"
      echo "<div id=\"content\"></div>"
      echo "<script src=\"https://cdn.jsdelivr.net/npm/marked@15/marked.min.js\"></script>"
      echo "<script>"
      echo "  var src = document.getElementById('source').textContent;"
      echo "  document.getElementById('content').innerHTML = marked.parse(src);"
      echo "  // Rewrite relative .md links so they resolve against the"
      echo "  // rendered HTML siblings instead of 404ing."
      echo "  document.querySelectorAll('#content a[href\$=\".md\"], #content a[href*=\".md#\"]').forEach(function(a){"
      echo "    a.href = a.getAttribute('href').replace(/\\.md(#.*)?\$/, '.html\$1');"
      echo "  });"
      echo "</script>"
      echo "</body></html>"
    } > "${out}"
    HANDBOOK_ENTRIES+=("${base}|${out}|${title}")
  done < <(ls "${HANDBOOK_DIR}"/*.md 2>/dev/null | sort)
fi

echo "Writing index: ${INDEX_FILE}"
{
  echo "<!doctype html>"
  echo "<meta charset=\"utf-8\"/>"
  title="${MOD_PATH:-Go} documentation"
  echo "<title>${title}</title>"
  echo "<style>"
  echo "  body{font:15px/1.6 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;"
  echo "       max-width:820px;margin:2rem auto;padding:0 1rem;color:#1f2937}"
  echo "  h1,h2{margin-top:1.5em}"
  echo "  ul{padding-left:1.2em}"
  echo "  li{margin:4px 0}"
  echo "  a{color:#0369a1}"
  echo "</style>"
  echo "<h1>${title}</h1>"
  echo "<p>Generated on $(date -u '+%Y-%m-%d %H:%M UTC')</p>"
  if [[ "${#HANDBOOK_ENTRIES[@]}" -gt 0 ]]; then
    echo "<h2>Handbook</h2>"
    echo "<p>Hand-written explainers and how-tos — read these first.</p>"
    echo "<ul>"
    for entry in "${HANDBOOK_ENTRIES[@]}"; do
      # entry format: base|file|title (see handbook render loop above)
      IFS='|' read -r _ file label <<<"${entry}"
      rel="handbook/$(basename "${file}")"
      echo "<li><a href=\"${rel}\">${label}</a></li>"
    done
    echo "</ul>"
  fi
  echo "<h2>Go Packages</h2>"
  echo "<p>Auto-generated API reference for every non-test package in this module.</p>"
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
echo "Handbook:   ${HANDBOOK_OUT_DIR}/"
echo "Markdown:   ${MD_FILE}"
echo "Swagger docs: ${SWAGGER_DIR}/swagger.json, ${SWAGGER_DIR}/swagger.yaml, ${SWAGGER_DIR}/docs.go"