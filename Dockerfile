# ── Stage 1: build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── Stage 2: serve ────────────────────────────────────────────────────────────
FROM nginx:stable-alpine

# Copy the Vite production bundle into nginx's default serve directory
COPY --from=builder /app/dist /usr/share/nginx/html

# Replace the default nginx server block with our SPA + security-headers config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
