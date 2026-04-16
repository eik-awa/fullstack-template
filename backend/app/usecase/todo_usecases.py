"""
ユースケース層: アプリケーション固有のビジネスロジック。

ドメインオブジェクトを組み合わせて「ユーザーがやりたいこと」を実現する。
- HTTPのことを知らない（Request/Response という概念がない）
- DB実装を知らない（抽象リポジトリのみ参照）
- トランザクション境界はここで定義する

研修メモ: 「〜する」という動詞1つに対してユースケースクラスを1つ作る。
メソッドは execute() のみ。これで「何をする処理か」が命名で明示される。
"""
from dataclasses import dataclass
from datetime import datetime
from uuid import UUID

from app.domain.entities.todo import Todo
from app.domain.repositories.todo_repository import TodoRepository
from app.domain.value_objects.todo_status import TodoStatus


class TodoNotFound(Exception):
    """Todoが見つからない / 他人の Todo にアクセスした場合に送出。"""


# =====================================================================
# Create
# =====================================================================
@dataclass
class CreateTodoInput:
    user_id: str
    title: str
    description: str | None = None
    due_date: datetime | None = None


class CreateTodoUseCase:
    def __init__(self, repository: TodoRepository) -> None:
        self._repository = repository

    async def execute(self, input: CreateTodoInput) -> Todo:
        todo = Todo.create(
            user_id=input.user_id,
            title=input.title,
            description=input.description,
            due_date=input.due_date,
        )
        await self._repository.add(todo)
        return todo


# =====================================================================
# List
# =====================================================================
class ListTodosUseCase:
    def __init__(self, repository: TodoRepository) -> None:
        self._repository = repository

    async def execute(self, user_id: str) -> list[Todo]:
        return await self._repository.list_by_user(user_id)


# =====================================================================
# Update
# =====================================================================
@dataclass
class UpdateTodoInput:
    todo_id: UUID
    user_id: str
    title: str | None = None
    description: str | None = None
    status: TodoStatus | None = None
    due_date: datetime | None = None


class UpdateTodoUseCase:
    def __init__(self, repository: TodoRepository) -> None:
        self._repository = repository

    async def execute(self, input: UpdateTodoInput) -> Todo:
        todo = await self._repository.get_by_id(input.todo_id, input.user_id)
        if todo is None:
            raise TodoNotFound(f"Todo {input.todo_id} not found")

        if input.title is not None:
            todo = todo.change_title(input.title)
        if input.description is not None:
            todo = todo.change_description(input.description)
        if input.status is not None:
            todo = todo.change_status(input.status)
        if input.due_date is not None:
            todo = todo.change_due_date(input.due_date)

        await self._repository.update(todo)
        return todo


# =====================================================================
# Delete
# =====================================================================
class DeleteTodoUseCase:
    def __init__(self, repository: TodoRepository) -> None:
        self._repository = repository

    async def execute(self, todo_id: UUID, user_id: str) -> None:
        deleted = await self._repository.delete(todo_id, user_id)
        if not deleted:
            raise TodoNotFound(f"Todo {todo_id} not found")
