FROM node:22-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

ARG PUBLIC_API_URL=/api/v1
ARG PUBLIC_SUPABASE_URL=https://example.supabase.co
ARG PUBLIC_SUPABASE_ANON_VALUE=public-anon-key-placeholder

RUN VITE_API_URL="$PUBLIC_API_URL" \
    VITE_SUPABASE_URL="$PUBLIC_SUPABASE_URL" \
    VITE_SUPABASE_ANON_KEY="$PUBLIC_SUPABASE_ANON_VALUE" \
    npm run build

FROM nginx:1.27-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O - http://127.0.0.1:8080/health >/dev/null 2>&1 || exit 1
