#!/bin/sh
set -e

echo "Starting environment variable replacement..."

# Replace env variable placeholders with real values
printenv | grep NEXT_PUBLIC_ | while read -r line ; do
  key=$(echo $line | cut -d "=" -f1)
  value=$(echo $line | cut -d "=" -f2-)
  
  echo "Replacing $key with actual value..."
  
  # Escape special characters in the value for sed
  escaped_value=$(echo "$value" | sed 's/[[\.*^$()+?{|]/\\&/g')
  
  # Replace in all relevant files in .next directory
  find .next/ -type f \( -name "*.js" -o -name "*.html" -o -name "*.json" \) -exec sed -i "s|$key|$escaped_value|g" {} \;
done

echo "Environment variable replacement completed."

# Execute the container's main process (CMD in Dockerfile)
exec "$@"