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
printenv | grep NEXT_PUBLIC_ | while read -r line ; do
  key=$(echo "$line" | cut -d "=" -f1)
  value=$(echo "$line" | cut -d "=" -f2-)
  placeholder="__RAILWAY_ENV_${key}_ENV__"

  echo "Replacing $key with actual value..."

  # Escape regex metacharacters in the value for sed.
  escaped_value=$(echo "$value" | sed 's/[[\.*^$()+?{|]/\\&/g')

  # Replace in all relevant files in .next directory.
  find .next/ -type f \( -name "*.js" -o -name "*.html" -o -name "*.json" \) \
    -exec sed -i "s|$placeholder|$escaped_value|g" {} \;
done

echo "Environment variable replacement completed."

# Execute the container's main process (CMD in Dockerfile)
exec "$@"