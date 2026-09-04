#!/bin/sh
set -eu

ENV_FILE="${1:-.env.production}"
STRICT="${PRODUCTION_ENV_STRICT:-0}"

if [ ! -f "$ENV_FILE" ]; then
  echo "Production environment file not found: $ENV_FILE" >&2
  exit 1
fi

value_of() {
  key="$1"
  awk -F= -v wanted="$key" '
    $0 !~ /^[[:space:]]*#/ && $1 == wanted {
      sub(/^[^=]*=/, "", $0)
      print $0
      exit
    }
  ' "$ENV_FILE"
}

require_value() {
  key="$1"
  value="$(value_of "$key")"
  if [ -z "$value" ]; then
    echo "Missing required production variable: $key" >&2
    exit 1
  fi
}

require_https() {
  key="$1"
  value="$(value_of "$key")"
  case "$value" in
    https://*) ;;
    *) echo "$key must use https:// in production" >&2; exit 1 ;;
  esac
}

for key in \
  REGISTRY IMAGE_NAMESPACE IMAGE_TAG \
  APP_DOMAIN FRONTEND_URL ALLOWED_ORIGINS TLS_CERT_FILE TLS_KEY_FILE \
  SUPABASE_URL SUPABASE_ANON_KEY SUPABASE_SERVICE_ROLE_KEY \
  REDIS_URL \
  EMAIL_PROVIDER EMAIL_PROVIDER_API_KEY EMAIL_FROM \
  LLM_BASE_URL LLM_API_KEY LLM_MODEL \
  EMBEDDING_BASE_URL EMBEDDING_API_KEY EMBEDDING_MODEL \
  BILLING_DEFAULT_PROVIDER
 do
  require_value "$key"
done

require_https FRONTEND_URL
require_https SUPABASE_URL
require_https LLM_BASE_URL
require_https EMBEDDING_BASE_URL

redis_url="$(value_of REDIS_URL)"
case "$redis_url" in
  redis://*|rediss://*) ;;
  *) echo "REDIS_URL must use redis:// or rediss://" >&2; exit 1 ;;
esac

email_provider="$(value_of EMAIL_PROVIDER)"
if [ "$email_provider" != "resend" ]; then
  echo "Production EMAIL_PROVIDER must be resend" >&2
  exit 1
fi

billing_provider="$(value_of BILLING_DEFAULT_PROVIDER)"
case "$billing_provider" in
  razorpay)
    require_value RAZORPAY_KEY_ID
    require_value RAZORPAY_KEY_SECRET
    require_value RAZORPAY_WEBHOOK_SECRET
    ;;
  stripe)
    require_value STRIPE_SECRET_KEY
    require_value STRIPE_WEBHOOK_SECRET
    require_value STRIPE_PRO_MONTHLY_PRICE_ID
    require_value STRIPE_PRO_YEARLY_PRICE_ID
    require_value STRIPE_PREMIUM_MONTHLY_PRICE_ID
    require_value STRIPE_PREMIUM_YEARLY_PRICE_ID
    ;;
  *)
    echo "BILLING_DEFAULT_PROVIDER must be razorpay or stripe" >&2
    exit 1
    ;;
esac

if [ "$STRICT" = "1" ]; then
  for key in \
    IMAGE_TAG APP_DOMAIN FRONTEND_URL ALLOWED_ORIGINS \
    SUPABASE_URL SUPABASE_ANON_KEY SUPABASE_SERVICE_ROLE_KEY REDIS_URL \
    EMAIL_PROVIDER_API_KEY EMAIL_FROM \
    LLM_API_KEY LLM_MODEL EMBEDDING_API_KEY EMBEDDING_MODEL
  do
    value="$(value_of "$key")"
    case "$value" in
      *replace-me*|*example.com*|*project-ref.supabase.co*)
        echo "$key still contains a placeholder value" >&2
        exit 1
        ;;
    esac
  done

  case "$billing_provider" in
    razorpay)
      provider_keys="RAZORPAY_KEY_ID RAZORPAY_KEY_SECRET RAZORPAY_WEBHOOK_SECRET"
      ;;
    stripe)
      provider_keys="STRIPE_SECRET_KEY STRIPE_WEBHOOK_SECRET STRIPE_PRO_MONTHLY_PRICE_ID STRIPE_PRO_YEARLY_PRICE_ID STRIPE_PREMIUM_MONTHLY_PRICE_ID STRIPE_PREMIUM_YEARLY_PRICE_ID"
      ;;
  esac

  for key in $provider_keys; do
    value="$(value_of "$key")"
    case "$value" in
      *replace-me*|"")
        echo "$key is not configured for the selected billing provider" >&2
        exit 1
        ;;
    esac
  done
fi

echo "Production environment contract is structurally valid."
