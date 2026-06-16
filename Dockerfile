FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json pnpm-lock.yaml* ./

RUN npm install -g pnpm 2>/dev/null || true && \
    if [ -f pnpm-lock.yaml ]; then pnpm install --frozen-lockfile 2>/dev/null || pnpm install; \
    else npm install; fi

COPY . .

RUN if [ -x "$(command -v pnpm)" ]; then pnpm build; else npm run build; fi

FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
