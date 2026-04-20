"""
API の I/O スキーマ（Pydantic モデル）。

ドメインエンティティとは別物。
- ドメインエンティティ: ビジネスロジック
- スキーマ: HTTP の境界で型を守る

バリデーションはまずこの層で行い、無効なリクエストは
ドメインに到達する前に 422 で弾く。
"""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.domain.entities.todo import Todo
from app.domain.value_objects.todo_status import TodoStatus


class TodoCreateRequest(BaseModel):
    """Todo作成リクエスト。"""

    title: str = Field(..., min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=2000)
    due_date: datetime | None = None


class TodoUpdateRequest(BaseModel):
    """Todo更新リクエスト（部分更新）。"""

    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=2000)
    status: TodoStatus | None = None
    due_date: datetime | None = None


class TodoResponse(BaseModel):
    """Todo応答。"""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: str
    description: str | None
    status: TodoStatus
    due_date: datetime | None
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_domain(cls, todo: Todo) -> "TodoResponse":
        """ドメインエンティティから変換。"""
        return cls(
            id=todo.id,
            title=todo.title,
            description=todo.description,
            status=todo.status,
            due_date=todo.due_date,
            created_at=todo.created_at,
            updated_at=todo.updated_at,
        )
