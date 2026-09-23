FROM node:24-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
RUN npm ci --workspace @chakana/api --include-workspace-root

COPY apps/api apps/api
COPY packages/shared packages/shared
RUN npm run build --workspace @chakana/api

FROM node:24-alpine AS runtime
WORKDIR /app

RUN apk add --no-cache wireguard-tools iproute2

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/package.json ./apps/api/package.json

WORKDIR /app/apps/api
ENV NODE_ENV=production
EXPOSE 8080
CMD ["node", "dist/index.js"]
