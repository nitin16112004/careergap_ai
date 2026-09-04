#!/bin/sh
set -eu

BASE_URL="${1:-${PRODUCTION_BASE_URL:-}}"
MAX_ATTEMPTS="${HEALTHCHECK_ATTEMPTS:-18}"
SLEEP_SECONDS="${HEALTHCHECK_INTERVAL_SECONDS:-5}"

if [ -z "$BASE_URL" ]; then
  echo "Usage: $0 https://app.example.com" >&2
  exit 1
fi

case "$BASE_URL" in
  https://*) ;;
  *) echo "Production health verification requires an https:// base URL" >&2; exit 1 ;;
esac

BASE_URL="${BASE_URL%/}"

check_endpoint() {
  path="$1"
  label="$2"
  attempt=1

  while [ "$attempt" -le "$MAX_ATTEMPTS" ]; do
    if curl --fail --silent --show-error --max-time 10 "$BASE_URL$path" >/dev/null; then
      echo "PASS: $label ($path)"
      return 0
    fi

    if [ "$attempt" -lt "$MAX_ATTEMPTS" ]; then
      echo "WAIT: $label not ready yet (attempt $attempt/$MAX_ATTEMPTS)"
      sleep "$SLEEP_SECONDS"
    fi
    attempt=$((attempt + 1))
  done

  echo "FAIL: $label did not become healthy: $BASE_URL$path" >&2
  return 1
}

check_endpoint "/health" "edge"
check_endpoint "/api/health/live" "backend liveness"
check_endpoint "/api/health/db" "Supabase database"
check_endpoint "/api/health/redis" "Redis"
check_endpoint "/api/health/ai-service" "AI service"
check_endpoint "/api/health/ready" "aggregate readiness"

echo "Production health verification passed for $BASE_URL"
