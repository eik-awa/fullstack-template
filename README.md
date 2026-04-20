# Training ToDo App

**新卒エンジニア研修 ゴールリポジトリ** — 21日間の研修を経た受講者が、自力で再構築できるようになることを目指すお手本リポジトリです。

## 🎯 このリポジトリの位置づけ

これは研修の **北極星**（=最終到達点のイメージ）です。
研修を通して Day 1 からこのリポジトリの各部分を段階的に学習し、Day 20 に受講者自身の手でゼロから再構築できることを目標にしています。

## 🏗️ アーキテクチャ概要

```
┌──────────────┐           ┌──────────────┐           ┌──────────────┐
│   Browser    │──HTTPS──▶ │   Amplify    │           │   Cognito    │
│ (React SPA)  │           │   Hosting    │           │  User Pool   │
└──────┬───────┘           └──────────────┘           └──────┬───────┘
       │                                                     │
       │ JWT付きAPIコール                       　　　　　　　　　│
       ▼                                                     │
┌──────────────┐           ┌──────────────┐                  │
│     ALB      │──────────▶│ ECS Fargate  │──── 認証検証 ──▶　 │
│   (HTTPS)    │           │  (FastAPI)   │                  │
└──────────────┘           └──────┬───────┘                  │
                                  │                          │
                                  ▼                          │
                           ┌──────────────┐                  │
                           │  RDS (MySQL) │                  │
                           │  Free Tier   │                  │
                           └──────────────┘                  │
```

詳細: [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)

## 🧱 技術スタック

| レイヤー | 採用技術 | 選定理由 |
|---|---|---|
| フロントエンド | React 18 + TypeScript + Vite | 業界標準、型安全、高速ビルド |
| 状態管理 | TanStack Query + Zustand | サーバ状態とUI状態の分離 |
| UIスタイル | Tailwind CSS | ユーティリティファースト、学習コスト低 |
| バックエンド | FastAPI (Python 3.12) | 型ヒント活用、自動OpenAPI生成 |
| アーキテクチャ | クリーンアーキテクチャ | 依存の向きを学ぶ教材として最適 |
| DB | MySQL 8.0 (RDS) | 無料枠対応、普及度が高い |
| ORM/マイグレーション | SQLAlchemy 2.0 + Alembic | Python標準 |
| 認証 | Amazon Cognito | AWSマネージド、OAuth 2.0学習 |
| コンテナ | Docker (マルチステージビルド) | 本番相当のイメージ作成 |
| コンピュート | ECS on Fargate | サーバレス、運用負荷低 |
| ホスティング | AWS Amplify Hosting | React向け、CDN込み |
| IaC | AWS CDK (TypeScript) | フロントエンドの知識流用可 |
| CI/CD | GitHub Actions | 事実上の標準、OIDC連携 |
| 監視 | CloudWatch Logs/Metrics | AWS標準 |

## 📂 ディレクトリ構成

```
training-todo-app/
├── README.md                 ← いまここ
├── docs/                     ← ドキュメント一式
│   ├── SETUP.md              ← ローカル環境構築
│   ├── DEPLOY.md             ← AWS無料枠デプロイ手順
│   ├── ARCHITECTURE.md       ← 構成と設計判断
│   └── LEARNING_PATH.md      ← 研修日程との対応表
├── frontend/                 ← React + TypeScript
├── backend/                  ← FastAPI (クリーンアーキテクチャ)
├── infra/                    ← AWS CDK
├── .github/workflows/        ← CI/CD
├── docker-compose.yml        ← ローカル統合環境
└── .env.example
```

## 🚀 クイックスタート（ローカル開発）

```bash
git clone <this-repo>
cd training-todo-app
cp .env.example .env
docker-compose up -d
# http://localhost:5173  (フロント)
# http://localhost:8000/docs  (バックエンドOpenAPI)
```

詳細: [docs/SETUP.md](./docs/SETUP.md)

## ☁️ AWSへのデプロイ（無料枠）

```bash
cd infra
npm install
npx cdk bootstrap
npx cdk deploy --all
```

詳細な前提条件・料金・後片付け手順: [docs/DEPLOY.md](./docs/DEPLOY.md)

## 🎓 研修日程との対応

各Dayの学習内容がリポジトリのどこに現れているかは [docs/LEARNING_PATH.md](./docs/LEARNING_PATH.md) を参照してください。

## 📜 ライセンス

MIT License (社内研修用途を想定)
