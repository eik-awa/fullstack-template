# 研修日程とリポジトリの対応表

このドキュメントは、21日間の研修で学ぶ内容がこのリポジトリのどこに現れているかを示します。
研修の講師・受講者双方が「今日学んだことは実務でこう使うのか」を確認するためのリファレンスです。

## 全体マップ

| Day | トピック | 該当箇所 | 意識するポイント |
|-----|---------|---------|------------------|
| Day 0 | オリエンテーション | `README.md` | 全体像を俯瞰する |
| **Phase 1: 土台** |||
| Day 1 | ネットワーク基礎 | `infra/lib/network-stack.ts` | VPC/Subnet/SGの意味を理解 |
| Day 2 | Webアーキテクチャ | `docs/ARCHITECTURE.md` | クライアント・ALB・APIの流れ |
| Day 3 | 環境構築 & AIペアプロ | `docker-compose.yml`, `.env.example` | 一発で立ち上がる環境の作法 |
| Day 4 | Git & チーム開発 | `.github/workflows/`, `CODEOWNERS` | PR/レビュー/自動チェック |
| **Phase 2: フロントエンド** |||
| Day 5 | TypeScript | `frontend/src/types/`, 全`.ts`ファイル | 型ヒントで守られる体験 |
| Day 6 | React基礎 | `frontend/src/components/`, `frontend/src/features/todos/components/` | コンポーネント分割と hooks |
| Day 7 | 状態管理・データフェッチ | `frontend/src/features/todos/hooks.ts` | TanStack Query のキャッシュ戦略 |
| Day 8 | UI & テスト | `frontend/tests/`, `tailwind.config.js` | Vitest + RTL の型安全なテスト |
| **Phase 3: バックエンド** |||
| Day 9 | FastAPI基礎 | `backend/app/api/`, `backend/app/main.py` | 型ヒント・Pydantic・自動OpenAPI |
| Day 10 | DB & SQLAlchemy | `backend/app/infrastructure/`, `backend/alembic/` | マイグレーション運用・N+1対策 |
| Day 11 | クリーンアーキテクチャ | `backend/app/domain/`, `backend/app/usecase/` | 依存の向き・リポジトリパターン |
| Day 12 | 認証・認可 | `backend/app/core/auth.py` | JWT検証・DIでのuser_id注入 |
| **Phase 4: AWS/インフラ** |||
| Day 13 | AWS & IAM | `infra/lib/network-stack.ts` | VPCとIAMロール設計 |
| Day 14 | Docker | `backend/Dockerfile`, `frontend/Dockerfile` | マルチステージ・非rootユーザー |
| Day 15 | ECS Fargate | `infra/lib/backend-stack.ts` | タスク定義・ALB・ヘルスチェック |
| Day 16 | Amplify Hosting | `infra/lib/frontend-stack.ts` | ビルド設定・環境変数 |
| Day 17 | IaC (CDK) | `infra/` 全体 | Stack分割・依存関係 |
| **Phase 5: 統合・品質・運用** |||
| Day 18 | CI/CD | `.github/workflows/ci.yml`, `cd.yml` | OIDC認証・デプロイ自動化 |
| Day 19 | 監視・ロギング | `backend/app/core/logging.py`, CloudWatch設定 | 構造化ログ・メトリクス |
| Day 20 | 総仕上げ | このリポジトリ全体 | 一人で再構築できるか |

## Day別の深掘り

### Day 1: ネットワーク基礎 → `infra/lib/network-stack.ts`

```typescript
// VPC と Subnet の定義
new ec2.Vpc(this, 'TodoVpc', {
  maxAzs: 2,
  subnetConfiguration: [
    { name: 'Public', subnetType: ec2.SubnetType.PUBLIC },
    { name: 'Private', subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
  ],
});
```

**研修での気づきポイント:**
- なぜ 2AZ 必要か → ALBの要件
- なぜ DB は PRIVATE_ISOLATED か → 外部から直接アクセスさせない
- Security Group は「どこから・どこへ・何のポート」の3点セット

### Day 11: クリーンアーキテクチャ → `backend/app/`

```
domain/
  entities/todo.py        ← Todoエンティティ（DBも何も知らない）
  repositories/
    todo_repository.py    ← 抽象I/F

usecase/
  create_todo.py          ← ユースケース（ビジネスロジック）
  list_todos.py

infrastructure/
  repositories/
    todo_repository_impl.py  ← SQLAlchemy実装

api/
  routes/todos.py         ← HTTPハンドラ
```

**研修での気づきポイント:**
- `domain/` は `infrastructure/` を import しない
- `usecase/` は抽象I/Fのみ依存、実装は DI で注入
- これによりユースケースは DB なしで単体テスト可能

### Day 18: CI/CD → `.github/workflows/`

```yaml
# ci.yml: PR時に走る
- lint (ruff / eslint)
- typecheck (mypy / tsc)
- test (pytest / vitest)
- build (Docker build)

# cd.yml: mainへのmergeで走る
- OIDCでAWS認証（長期シークレット不要）
- ECRへプッシュ
- ECSサービス更新
- Amplifyビルド起動
```

**研修での気づきポイント:**
- OIDC を使うと AWS のアクセスキーを GitHub Secrets に置かなくて済む
- `concurrency` で同時実行を制御
- 環境ごとに Environment を分けて承認フローを入れられる

## 応用課題の見つけ方

各Dayの応用トピックは、このリポジトリの「まだ実装されていない箇所」や「TODO コメント」として散りばめています。
以下は自己学習の題材例です。

| 応用課題 | 該当ファイル |
|---|---|
| BFFレイヤーの追加 | `backend/` に `bff/` を新設 |
| GraphQL化 | FastAPI + Strawberry |
| Storybook導入 | `frontend/.storybook/` を作成 |
| E2Eテスト (Playwright) | `e2e/` ディレクトリを新設 |
| Prometheus + Grafana | `docker-compose.yml` に追加 |
| WAF/CloudFront | `infra/lib/frontend-stack.ts` を拡張 |
| マルチ環境 (dev/prod) | `infra/bin/app.ts` の環境分岐 |
| ECS Blue/Green | CodeDeploy連携 |
| DDDの戦術的設計（集約、ドメインサービス） | `backend/app/domain/` を発展 |

## 研修中に見てほしい「商用で重要なのに教材で省略しがちなもの」

- [x] `.env` を Git に含めない（`.gitignore`）
- [x] Docker イメージの非root実行
- [x] 依存脆弱性スキャン（`npm audit`, `pip-audit`）
- [x] 構造化ログ（JSON形式、trace_id付き）
- [x] ヘルスチェックエンドポイント
- [x] CORS の厳密な設定
- [x] Secrets Manager の利用（環境変数直書きしない）
- [ ] 監査ログ（誰が何をしたか） ← 応用課題
- [ ] レート制限 ← 応用課題
