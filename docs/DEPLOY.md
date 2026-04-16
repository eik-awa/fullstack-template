# AWSデプロイ手順書（無料枠対応）

## ⚠️ 事前に読むこと

このガイドは **AWS無料枠を意識した構成** ですが、以下の点に注意してください。

### 無料枠で収まるもの
- RDS db.t3.micro（750時間/月、12ヶ月）
- ECS Fargate: **常時2タスク稼働で月額 約3-5USD** (無料枠対象外)
- Amplify Hosting: ビルド1000分/月、配信15GB/月
- CloudWatch: 基本メトリクス無料

### 注意が必要
- **ALB は常時課金**（月額 約18USD〜）
- **NAT Gateway は高額**（月額 約32USD〜） → このリポジトリでは Public Subnet 配置 + 厳格な SG で代替
- **ECR ストレージ**は 500MB/月まで無料

### 想定月額（東京リージョン）
- 学習用途（数時間/日）: **3-8 USD**
- 24時間稼働: **50-70 USD**

**必ず [後片付け](#後片付け) を実行してください。**

## 必要な事前準備

### 1. AWSアカウント

- AWSアカウント作成済み（[公式手順](https://aws.amazon.com/jp/register-flow/)）
- MFA設定済み
- IAMユーザー作成済み（ルートユーザーは使わない）

### 2. AWS CLI の設定

```bash
aws configure
# AWS Access Key ID:     xxxxx
# AWS Secret Access Key: xxxxx
# Default region name:   ap-northeast-1
# Default output format: json

aws sts get-caller-identity   # 自分のARNが表示されればOK
```

### 3. 必要な権限

このリポジトリをデプロイするIAMユーザー/ロールには、以下のマネージドポリシー程度の権限が必要です。

- `AdministratorAccess`（学習環境のみ）
- 本番環境では CDK Bootstrap Role + CloudFormation + 各サービスに絞る

### 4. CDK Bootstrap（初回のみ）

```bash
cd infra
npm install
npx cdk bootstrap aws://<ACCOUNT_ID>/ap-northeast-1
```

## デプロイ手順

### Step 1. インフラのデプロイ

```bash
cd infra
npx cdk deploy --all --require-approval never
```

所要時間: **約15-25分**

デプロイされるスタック:
1. `TodoNetworkStack` - VPC, Subnet, SG
2. `TodoAuthStack` - Cognito User Pool
3. `TodoDatabaseStack` - RDS MySQL
4. `TodoBackendStack` - ECR, ECS Cluster/Service, ALB
5. `TodoFrontendStack` - Amplify App

### Step 2. バックエンドDockerイメージのビルド＆プッシュ

```bash
# ECRにログイン
aws ecr get-login-password --region ap-northeast-1 | \
  docker login --username AWS --password-stdin \
  <ACCOUNT_ID>.dkr.ecr.ap-northeast-1.amazonaws.com

# ビルド＆プッシュ
cd ../backend
docker build -t todo-backend .
docker tag todo-backend:latest \
  <ACCOUNT_ID>.dkr.ecr.ap-northeast-1.amazonaws.com/todo-backend:latest
docker push \
  <ACCOUNT_ID>.dkr.ecr.ap-northeast-1.amazonaws.com/todo-backend:latest
```

ECRのURIは CDK deploy の Output に出力されています。

### Step 3. ECSサービスの更新

```bash
aws ecs update-service \
  --cluster todo-cluster \
  --service todo-backend-service \
  --force-new-deployment
```

### Step 4. DBマイグレーションの適用

ECS Exec 経由で実行します。

```bash
# タスクIDを取得
TASK_ID=$(aws ecs list-tasks --cluster todo-cluster \
  --service-name todo-backend-service \
  --query 'taskArns[0]' --output text | awk -F/ '{print $NF}')

# マイグレーション実行
aws ecs execute-command \
  --cluster todo-cluster \
  --task $TASK_ID \
  --container backend \
  --interactive \
  --command "alembic upgrade head"
```

**もし ECS Exec が使えない場合**: RDS にパブリックアクセスを一時的に許可してローカルから `alembic upgrade head` する方法もありますが、**必ず作業後にアクセスを閉じてください**。

### Step 5. フロントエンドのデプロイ

Amplify は GitHub リポジトリと連携してデプロイする想定です。

```bash
# CDK Output で表示された Amplify App ID を使う
aws amplify start-job \
  --app-id <AMPLIFY_APP_ID> \
  --branch-name main \
  --job-type RELEASE
```

もしくは Amplify Console の GUI から `main` ブランチのビルドをトリガー。

### Step 6. 動作確認

```bash
# バックエンドの疎通
curl https://<ALB_DNS>/health
# {"status":"ok"}

# フロントエンド
open https://<AMPLIFY_URL>
```

Cognito Hosted UI からサインアップ → ログイン → ToDo作成。

## 環境変数の設定

各Stackが必要とする環境変数の一覧は `infra/lib/*.ts` 内に定義されています。
主要なもの:

| 変数名 | 設定場所 | 説明 |
|---|---|---|
| `DB_SECRET_ARN` | ECS Task Definition | Secrets Manager のARN（自動設定） |
| `COGNITO_USER_POOL_ID` | ECS Task Definition | Cognito User Pool ID |
| `COGNITO_CLIENT_ID` | ECS Task Definition | Cognito App Client ID |
| `VITE_API_BASE_URL` | Amplify 環境変数 | ALBのURL |
| `VITE_COGNITO_DOMAIN` | Amplify 環境変数 | Cognito Hosted UI ドメイン |

## 後片付け

**絶対に忘れないでください。** 料金発生の最大の原因です。

```bash
cd infra
npx cdk destroy --all
```

手動で削除が必要な可能性があるもの:
- ECR のイメージ（destroy前に `aws ecr batch-delete-image` で削除推奨）
- CloudWatch Logs Group（デフォルトでは残る）
- S3 バケット（Amplifyのビルドアーティファクト）

### 削除確認

AWS コンソールで以下を確認:
- [ ] CloudFormation: 全スタックが `DELETE_COMPLETE`
- [ ] EC2 → Load Balancers: なし
- [ ] RDS → Databases: なし
- [ ] Amplify → Apps: なし
- [ ] Cognito → User Pools: なし

## トラブルシューティング

### `cdk bootstrap` で権限エラー
→ IAMユーザーに `AWSCloudFormationFullAccess` と関連権限が必要

### ECS タスクが起動しては落ちる
→ CloudWatch Logs で `/aws/ecs/todo-backend` を確認。
よくある原因: DB接続失敗（SG設定ミス）、Secrets取得失敗（IAMロール）

### Amplify ビルドが失敗
→ `amplify.yml` のビルドコマンドと Node バージョンを確認。環境変数未設定も多い。

### ALB のヘルスチェックが通らない
→ バックエンドの `/health` エンドポイントが200を返すか、SGが8000ポートを許可しているか確認

## コスト監視のすすめ

```bash
# 当月のコスト確認
aws ce get-cost-and-usage \
  --time-period Start=2026-04-01,End=2026-04-30 \
  --granularity MONTHLY \
  --metrics UnblendedCost
```

**予算アラートを必ず設定してください**（AWS Budgets で月10USD超えたら通知など）。

## 応用課題

研修後のステップアップとして:
- [ ] Route 53 でカスタムドメイン + ACM 証明書
- [ ] CloudFront を ALB の前段に配置
- [ ] RDS のマルチAZ化（本番想定）
- [ ] Secrets Manager のローテーション
- [ ] AWS WAF の追加
- [ ] prod 環境の追加と、承認フロー付きCD
