# syntax=docker/dockerfile:1.6
# ローカル開発用（dev server）
FROM node:20-alpine

WORKDIR /app

# 依存関係の先行インストールでレイヤーキャッシュ活用
COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev"]
