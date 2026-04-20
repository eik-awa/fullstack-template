"""
構造化ログ。

CloudWatch で JSON として解析できるフォーマット。
研修メモ: ログは「後で検索できる」ことが命。
- trace_id / request_id を必ず含める
- レベル (info/warn/error) を適切に
- 個人情報を書き込まない
"""

import logging
import sys
from typing import cast

import structlog

from app.config import settings


def configure_logging() -> None:
    """structlog の設定。"""
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=getattr(logging, settings.log_level.upper()),
    )

    processors = [
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
    ]

    if settings.env == "local":
        # ローカルは人間が読みやすい形式
        processors.append(structlog.dev.ConsoleRenderer())
    else:
        # 本番はJSON
        processors.append(structlog.processors.format_exc_info)
        processors.append(structlog.processors.JSONRenderer())

    structlog.configure(
        processors=processors,  # type: ignore[arg-type]
        wrapper_class=structlog.make_filtering_bound_logger(
            getattr(logging, settings.log_level.upper())
        ),
        cache_logger_on_first_use=True,
    )


def get_logger(name: str) -> structlog.stdlib.BoundLogger:
    """モジュール用のロガーを取得。"""
    return cast(structlog.stdlib.BoundLogger, structlog.get_logger(name))
