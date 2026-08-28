FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci && npm cache clean --force

FROM node:24-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ARG NEXT_PUBLIC_API_URL=http://localhost:8080
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_GOOGLE_CLIENT_ID=""
ENV NEXT_PUBLIC_GOOGLE_CLIENT_ID=$NEXT_PUBLIC_GOOGLE_CLIENT_ID
ARG NEXT_PUBLIC_VAPID_PUBLIC_KEY=""
ENV NEXT_PUBLIC_VAPID_PUBLIC_KEY=$NEXT_PUBLIC_VAPID_PUBLIC_KEY
# Baked into the bundle: canonical origin used for metadataBase, og:url,
# canonical links, robots.txt and sitemap.xml. Must match the public domain.
ARG NEXT_PUBLIC_SITE_URL=https://games.jangkauin.site
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
# npm resolves sharp's optional deps for both libc flavours, so the standalone
# output ships a glibc libvips (~16MB) that can never load on this musl runtime.
# Drop it here rather than in the runner: deleting in a later layer leaves the
# bytes in the earlier one and the image does not actually get smaller.
RUN npm run build \
    && { [ ! -d .next/standalone/node_modules/@img ] || find .next/standalone/node_modules/@img -maxdepth 1 -name '*linux*' ! -name '*musl*' -exec rm -rf {} + ; }

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
