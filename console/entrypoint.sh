#!/bin/sh
set -e

echo "Starting environment variable replacement..."

# Replace env variable placeholders with real values.
#
# The Dockerfile sets each NEXT_PUBLIC_* to a unique token of the shape
# `__RAILWAY_ENV_<NAME>_ENV__` (see Dockerfile for the rationale). Next.js
# inlines those tokens into the built JS at build time. At startup we
# replace them with the real values injected by Railway as runtime env.
#
# The token shape guarantees it can't be a JS identifier, so sed only
# touches intended placeholder strings — not object keys, local var
# names, or anything else that happens to share a name with an env var.
#
# Iterate only well-formed KEY=VALUE lines where KEY is a valid shell
# identifier beginning with NEXT_PUBLIC_. Unanchored matching would pick
# up lines from multi-line values like RAILWAY_GIT_COMMIT_MESSAGE that
# happen to contain "NEXT_PUBLIC_" substrings, then parse those bullets
# as fake env vars and `sed`-overwrite the real placeholder with garbage
# — exactly the failure that bricked the `development` deploy once.
env | grep -E '^NEXT_PUBLIC_[A-Z0-9_]+=' | while read -r line ; do
  # Split on the FIRST `=` with parameter expansion rather than
  # `IFS='=' read -r key value`: BusyBox ash (node:24-alpine) strips a single
  # trailing `=` from the last field per POSIX field-delimiter semantics,
  # which would corrupt base64-padded values like `foo=` or some Clerk keys.
  key="${line%%=*}"
  value="${line#*=}"
  placeholder="__RAILWAY_ENV_${key}_ENV__"

  echo "Replacing $key with actual value..."

  # Escape regex metacharacters in the value for sed. `|` is the replacement
  # delimiter below so it must be escaped; `&` is sed's replacement-side
  # "insert matched text" metacharacter. `/` is intentionally NOT in this
  # class even though it appears in URL values: the outer sed here uses `/`
  # as its own delimiter, and BusyBox sed (node:24-alpine) doesn't track
  # bracket expressions when scanning for the delimiter — including `/`
  # inside `[...]` would abort with an unterminated-bracket error.
  escaped_value=$(printf '%s' "$value" | sed 's/[[\.*^$()+?{|&]/\\&/g')

  # Replace in all relevant files in .next directory.
  find .next/ -type f \( -name "*.js" -o -name "*.html" -o -name "*.json" \) \
    -exec sed -i "s|$placeholder|$escaped_value|g" {} \;
done

echo "Environment variable replacement completed."

# Execute the container's main process (CMD in Dockerfile)
exec "$@"