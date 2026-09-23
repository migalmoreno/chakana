FROM node:24-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
RUN npm ci --workspace @chakana/web --include-workspace-root

COPY apps/web apps/web
COPY packages/shared packages/shared
RUN npm run build --workspace @chakana/web

FROM nginx:alpine AS runtime

COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html

EXPOSE 80
