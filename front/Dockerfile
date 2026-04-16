FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# ── Build-time configuration ─────────────────────────────────────────────────
# Next.js route + asset prefix (inlined at build; must match Traefik path rules).
ARG NEXT_PUBLIC_BASE_PATH=
ENV NEXT_PUBLIC_BASE_PATH=${NEXT_PUBLIC_BASE_PATH}

# API path override baked into portal.json and inlined into client bundle.
# Defaults to /api (same as defaultPortal.json). Set when the portal API lives
# at a subpath (e.g. /bgp/api) and you want a single source of truth.
ARG PORTAL_API_BASE=
ENV PORTAL_API_BASE=${PORTAL_API_BASE}

# Root taxon for this deployment (NCBI taxid, e.g. 131567 = cellular life).
ARG PORTAL_ROOT_TAXID=
ENV PORTAL_ROOT_TAXID=${PORTAL_ROOT_TAXID}

# CMS feature flag (true|false). Also inlined as NEXT_PUBLIC_CMS so the
# middleware can read it without re-fetching portal.json at runtime.
ARG NEXT_PUBLIC_CMS=
ENV NEXT_PUBLIC_CMS=${NEXT_PUBLIC_CMS}

# GoaT / map feature flags (true|false). Prefer a branding preset
# for richer per-deployment config; these are for quick image variants.
ARG PORTAL_GOAT=
ENV PORTAL_GOAT=${PORTAL_GOAT}
ARG PORTAL_MAP=
ENV PORTAL_MAP=${PORTAL_MAP}

# Country UI flag. Defaults to true (show country filter + species detail country section).
# Set to false at build time to hide all country-related UI for this image.
ARG NEXT_PUBLIC_SHOW_COUNTRIES=true
ENV NEXT_PUBLIC_SHOW_COUNTRIES=${NEXT_PUBLIC_SHOW_COUNTRIES}

# Optional Matomo tracker (inlined into client bundle when set).
ARG NEXT_PUBLIC_MATOMO_URL=
ENV NEXT_PUBLIC_MATOMO_URL=${NEXT_PUBLIC_MATOMO_URL}
ARG NEXT_PUBLIC_MATOMO_SITE_ID=
ENV NEXT_PUBLIC_MATOMO_SITE_ID=${NEXT_PUBLIC_MATOMO_SITE_ID}

# ── Bake portal config + copy branding assets → public/ ─────────────────────
# Requires branding/ directory in the build context if you want custom logos or
# a portal.config.json preset. Falls back to defaultPortal.json if absent.
RUN node scripts/bake-portal.mjs

RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
