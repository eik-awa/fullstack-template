# Architecture

## 設計思想

このリポジトリは研修の「お手本」として、以下の3つの原則で設計されています。

1. **依存の向きが一方向** — ドメイン層が外部（DB・HTTP）を知らない
2. **型で守る** — TypeScript (フロント)・Pydantic (API境界)・SQLAlchemy typed (永続化) の三段構え
3. **本番と同じ構成をローカルで動かせる** — docker-composeで全サービスが起動する

## システム全体図

```
┌────────────────────────────────────────┐
│               AWS Cloud                │
│                                        │
│   ┌──────────┐      ┌──────────────┐   │
│   │ Amplify  │◀────▶│   Cognito    │   │
│   │ Hosting  │      │  User Pool   │   │
│   │  (React) │      └──────┬───────┘   │
│   └─────┬────┘             │ JWT検証　  │
│         │ API (HTTPS)      │           │
│         ▼                  ▼           │
│   ┌──────────┐      ┌──────────────┐   │
│   │   ALB    │─────▶│ ECS Fargate  │   │
│   │  (443)   │      │  (FastAPI)   │   │
│   └──────────┘      └──────┬───────┘   │
│                            │           │
│                            ▼           │
│                     ┌──────────────┐   │
│                     │  RDS MySQL   │   │
│                     │ (プライベート) │   │
│                     └──────────────┘   │
│                                        │
│   ┌─────────────────────────────────┐  │
│   │ CloudWatch Logs / Metrics       │  │
│   └─────────────────────────────────┘  │
└────────────────────────────────────────┘
```

## バックエンドのレイヤー構成（クリーンアーキテクチャ）

```
┌─────────────────────────────────────────────────┐
│ api/            ← HTTPハンドラ（FastAPIルータ）    │
│   └─ schemas/   ← Pydanticスキーマ（I/O境界）　    │
├─────────────────────────────────────────────────┤
│ usecase/        ← アプリケーションロジック          │
│                    (トランザクション境界)  　　　　　│
├─────────────────────────────────────────────────┤
│ domain/         ← エンティティ・値オブジェクト　　　　│
│   └─ repositories/  ← リポジトリI/F（抽象）        │
├─────────────────────────────────────────────────┤
│ infrastructure/ ← DB実装・外部サービス             │
│   └─ repositories/  ← リポジトリ実装（SQLAlchemy） │
└─────────────────────────────────────────────────┘

依存の向き：api → usecase → domain ← infrastructure
                                ▲
                                │
                       （domainは何も知らない）
```

### なぜこの分離が重要か

- **テスト容易性**: ドメイン・ユースケースは DB なしで単体テスト可能
- **置き換え可能性**: MySQL を PostgreSQL に変えても domain は無変更
- **責務の明確化**: 「ビジネスルール」と「技術的な都合」を混ぜない

## フロントエンドの構成（機能ベース）

```
src/
├── features/          ← 機能単位でコード集約
│   └── todos/
│       ├── api.ts     ← このfeatureのAPI呼び出し
│       ├── hooks.ts   ← useQuery/useMutation
│       ├── types.ts   ← 型定義
│       └── components/
├── components/        ← 横断的なUI部品
├── hooks/             ← 横断的なカスタムフック
├── lib/               ← ユーティリティ（apiClient等）
└── types/             ← 横断的な型
```

機能ごとに凝集性を高め、`features/todos/` の中を触れば ToDo に関することは完結するようにしています。

## 認証フロー

```
1. ユーザーがログイン
   Browser ──▶ Cognito (Hosted UI)
             ◀── ID Token + Access Token (JWT)

2. APIコール
   Browser ──▶ ALB ──▶ FastAPI
   Authorization: Bearer <access_token>

3. FastAPI側の検証
   - JWKsエンドポイントから公開鍵取得（キャッシュ）
   - JWT署名検証
   - aud/iss/exp検証
   - user_id (sub) を取り出して DI

4. リポジトリ層で user_id によるフィルタリング
```

## データモデル

```
users (Cognitoで管理、APIでは参照のみ)
  - sub (UUID, PK)
  - email

todos
  - id (UUID, PK)
  - user_id (FK→users.sub)
  - title (string, 1-200文字)
  - description (text, nullable)
  - status (enum: pending / in_progress / done)
  - due_date (datetime, nullable)
  - created_at, updated_at
```

## 環境構成

| 環境 | 用途 | トリガー |
|---|---|---|
| local | 開発者のローカル | docker-compose up |
| dev | 共有検証環境 | develop ブランチ push |
| prod | 本番 | main ブランチ push + 手動承認 |

（このリポジトリでは local と dev のみ実装。prod 切り分けは研修の応用課題）

## 設計上の判断記録（ADR）

- **[ADR-001] なぜ DynamoDB ではなく RDS か** — ToDoは関係性のあるデータ構造になりやすく、SQL教育にも有用
- **[ADR-002] なぜ Next.js ではなく Vite + React か** — SSRは研修範囲外、純粋なSPA構成で基礎を固める
- **[ADR-003] なぜ Terraform ではなく CDK か** — 受講者のTypeScript学習資産が流用できるため
- **[ADR-004] なぜ Fargate Spot を使わないか** — 学習時点での複雑性回避、本番では検討価値あり

## セキュリティ観点の実装

- [x] Cognito による認証
- [x] IAM最小権限（CDKで明示的にロール定義）
- [x] RDSはプライベートサブネットのみ
- [x] Secrets Manager 経由でDB認証情報を渡す
- [x] ALB は HTTPS のみ受付（HTTP は 443 へリダイレクト）
- [x] CORS はフロント Amplify ドメインのみ許可
- [x] Dockerイメージは非rootユーザーで実行
- [ ] WAF（応用課題）
- [ ] VPCフローログ（応用課題）
