# Build Stage
FROM node:18-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Build-time variables
ARG VITE_LAMBDA_URL
ARG VITE_BACKEND_URL
ENV VITE_LAMBDA_URL=$VITE_LAMBDA_URL
ENV VITE_BACKEND_URL=$VITE_BACKEND_URL

RUN npm run build

# Serve Stage — unprivileged Nginx (runs as UID 101, listens on 8080)
FROM nginxinc/nginx-unprivileged:alpine

COPY --from=build --chown=nginx:nginx /app/dist /usr/share/nginx/html
COPY --chown=nginx:nginx nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080

USER 101

CMD ["nginx", "-g", "daemon off;"]
