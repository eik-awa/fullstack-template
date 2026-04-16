# syntax=docker/dockerfile:1.6
# ====================================================================
# Stage 1: Builder - 依存関係のインストール
# ====================================================================
FROM python:3.12-slim AS builder

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# ビルドに必要なパッケージ
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# 依存関係のみ先にコピー → レイヤーキャッシュ活用
COPY pyproject.toml ./
RUN pip install --prefix=/install "fastapi[standard]" "sqlalchemy[asyncio]>=2.0" \
    "pydantic>=2.0" "pydantic-settings" "alembic" "aiomysql" "cryptography" \
    "python-jose[cryptography]" "httpx" "structlog"

# ====================================================================
# Stage 2: Runtime - 実行環境
# ====================================================================
FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/usr/local/bin:$PATH"

# 非rootユーザー作成
RUN groupadd -r app && useradd -r -g app -u 1000 app

WORKDIR /app

# 必要なライブラリのみインストール
COPY --from=builder /install /usr/local

# アプリケーションコードをコピー
COPY --chown=app:app . .

USER app

EXPOSE 8000

# ヘルスチェック
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
