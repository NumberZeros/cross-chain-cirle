# syntax=docker/dockerfile:1.7

FROM node:20-alpine AS build
WORKDIR /repo

RUN corepack enable

# Workspace root
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# App manifest
COPY apps/cross-chain-fe/package.json apps/cross-chain-fe/package.json

RUN pnpm install --frozen-lockfile

COPY apps/cross-chain-fe apps/cross-chain-fe

# Vite envs are baked at build time
ARG VITE_API_BASE_URL
ARG VITE_SOCKET_URL
ARG VITE_SOLANA_RPC_URL

ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_SOCKET_URL=${VITE_SOCKET_URL}
ENV VITE_SOLANA_RPC_URL=${VITE_SOLANA_RPC_URL}

RUN pnpm -C apps/cross-chain-fe run build

FROM nginx:1.27-alpine AS runtime
COPY apps/cross-chain-fe/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/cross-chain-fe/dist /usr/share/nginx/html

EXPOSE 80
