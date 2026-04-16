"""
SQLAlchemy の ORM モデル。

ドメインエンティティとは別物として定義する。
- domain/entities/todo.py → ビジネスロジック用
- infrastructure/models/todo.py → DB永続化用（ここ）

相互変換はリポジトリ実装が担う。
"""
from datetime import datetime
from uuid import UUID

from sqlalchemy import DateTime, Enum as SqlEnum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.domain.value_objects.todo_status import TodoStatus
from app.infrastructure.database import Base


class TodoORM(Base):
    __tablename__ = "todos"

    id: Mapped[UUID] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[TodoStatus] = mapped_column(
        SqlEnum(TodoStatus, native_enum=False, length=20),
        nullable=False,
        default=TodoStatus.PENDING,
    )
    due_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
