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

ENV CHAKANA_API_URL=http://host.docker.internal:8080
COPY apps/web/nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /app/apps/web/dist /usr/share/nginx/html

EXPOSE 80
