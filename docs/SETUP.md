# ローカル環境構築ガイド

## 必要なツール

| ツール | バージョン | 用途 |
|---|---|---|
| Docker Desktop | 最新 | コンテナ実行 |
| Node.js | 20.x 以上 | フロント・CDK |
| Python | 3.12 以上 | バックエンド（Dockerで代替可） |
| Git | 最新 | バージョン管理 |
| AWS CLI | v2 | AWS操作（デプロイ時のみ） |

### セットアップ確認

```bash
docker --version           # Docker version 24.x以上
node --version             # v20.x以上
python --version           # Python 3.12.x
git --version
aws --version              # aws-cli/2.x
```

## 1. リポジトリのクローン

```bash
git clone <your-repo-url>
cd training-todo-app
```

## 2. 環境変数の設定

```bash
cp .env.example .env
```

`.env` を編集して必要な値を設定します。ローカル開発ではデフォルト値のままで動作します。

## 3. docker-compose で一括起動

```bash
docker-compose up -d
```

起動するサービス:
- `frontend` (React + Vite) → http://localhost:5173
- `backend` (FastAPI) → http://localhost:8000
- `db` (MySQL 8.0) → localhost:3306

初回はイメージビルドに数分かかります。

## 4. DBマイグレーションの実行

**Docker Compose で起動している場合:**

```bash
docker-compose exec backend alembic upgrade head
```

**devcontainer (VS Code) を使っている場合:**  
devcontainer 内は Docker コマンドが使えないため、ワークスペースから直接実行します。

```bash
cd /workspace/backend
DATABASE_URL="mysql+aiomysql://root:rootpass@db:3306/todos" alembic upgrade head
```

> **注意:** このマイグレーションを実行しないと、`/api/v1/todos` が 500 エラーを返し、  
> ブラウザ上では CORS エラーとして表示されます。

## 5. 動作確認

### バックエンド API

```bash
curl http://localhost:8000/health
# {"status":"ok"}
```

OpenAPI ドキュメント: http://localhost:8000/docs

### フロントエンド

http://localhost:5173 にアクセス。
ローカル環境では認証をモックしているため、そのまま ToDo の作成・編集が可能です。

## 開発時のコマンド

### バックエンド

```bash
# コンテナに入る
docker-compose exec backend bash

# テスト実行
docker-compose exec backend pytest

# lint / format
docker-compose exec backend ruff check .
docker-compose exec backend ruff format .

# 新しいマイグレーションを作成
docker-compose exec backend alembic revision --autogenerate -m "add foo column"
```

### フロントエンド

```bash
# コンテナに入る
docker-compose exec frontend sh

# テスト実行
docker-compose exec frontend npm test

# lint / format
docker-compose exec frontend npm run lint
docker-compose exec frontend npm run format

# 型チェック
docker-compose exec frontend npm run typecheck
```

### DB直接操作

```bash
docker-compose exec db mysql -u root -p todos
# パスワード: .env の DB_ROOT_PASSWORD
```

## 停止・クリーンアップ

```bash
# 停止（データは残る）
docker-compose down

# 完全削除（DBデータも消える）
docker-compose down -v
```

## トラブルシューティング

### Q. `docker-compose up` でポートが衝突する

A. 既にローカルで MySQL や別プロジェクトが動いていないか確認してください。
`docker-compose.yml` のポートマッピングを `- "3307:3306"` のように変更することで回避できます。

### Q. バックエンドが `Cannot connect to MySQL` でエラー

A. DBコンテナの起動を待たずに backend が起動している可能性があります。以下で再起動:
```bash
docker-compose restart backend
```

### Q. フロントエンドで「Network Error」

A. `.env` の `VITE_API_BASE_URL` が `http://localhost:8000` を指しているか確認。
Dockerネットワーク内からは `http://backend:8000` ですが、ブラウザからは `localhost:8000` です。

### Q. マイグレーションでエラー

A. DB コンテナをクリーンにしてから再実行:
```bash
docker-compose down -v
docker-compose up -d
sleep 10  # DBの起動待ち
docker-compose exec backend alembic upgrade head
```

## AIペアプログラミングの推奨セットアップ

研修では Claude Code / GitHub Copilot の併用を推奨します。

### VS Code 拡張

- GitHub Copilot
- Claude Code (VS Code統合)
- Python / Pylance
- ESLint / Prettier
- Tailwind CSS IntelliSense

### AI活用のコツ（研修メモ）

- `backend/app/domain/` のコードは設計の核なので、AIに書かせる前に**自分で考える**
- ボイラープレート（DTO変換、CRUD実装の骨格）は **AIに任せて時間を稼ぐ**
- 「なぜこの実装なのか？」を AI に問うのは学習として有効
