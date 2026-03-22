FROM node:20-alpine AS build

WORKDIR /app

# Install dependencies for workspace
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/widget/package.json packages/widget/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN npm ci

# Copy sources
COPY apps ./apps
COPY packages ./packages

# Build widget artifacts (served by API)
RUN npm -w @vibe/widget run build

# Runtime image
FROM node:20-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/apps ./apps
COPY --from=build /app/packages ./packages

EXPOSE 8787
CMD ["node", "apps/api/src/index.js"]

