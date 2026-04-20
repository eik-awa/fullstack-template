"""
ユースケース層のテスト。

InMemoryRepository を使うので DB 不要 = 高速。
「ビジネスロジックが正しいか」に集中できる。
"""

import pytest

from app.domain.entities.todo import InvalidTodoTitleError
from app.domain.value_objects.todo_status import TodoStatus
from app.usecase.todo_usecases import (
    CreateTodoInput,
    CreateTodoUseCase,
    DeleteTodoUseCase,
    ListTodosUseCase,
    TodoNotFoundError,
    UpdateTodoInput,
    UpdateTodoUseCase,
)
from tests.conftest import InMemoryTodoRepository


class TestCreateTodo:
    async def test_正常系_作成できる(self, repo: InMemoryTodoRepository) -> None:
        usecase = CreateTodoUseCase(repo)
        todo = await usecase.execute(CreateTodoInput(user_id="user-1", title="買い物"))
        assert todo.title == "買い物"
        assert todo.status == TodoStatus.PENDING
        assert todo.user_id == "user-1"

    async def test_異常系_空タイトル(self, repo: InMemoryTodoRepository) -> None:
        usecase = CreateTodoUseCase(repo)
        with pytest.raises(InvalidTodoTitleError):
            await usecase.execute(CreateTodoInput(user_id="user-1", title="   "))

    async def test_異常系_長すぎるタイトル(self, repo: InMemoryTodoRepository) -> None:
        usecase = CreateTodoUseCase(repo)
        with pytest.raises(InvalidTodoTitleError):
            await usecase.execute(CreateTodoInput(user_id="user-1", title="a" * 201))


class TestListTodos:
    async def test_他ユーザーのTodoは見えない(self, repo: InMemoryTodoRepository) -> None:
        create = CreateTodoUseCase(repo)
        await create.execute(CreateTodoInput(user_id="user-1", title="A"))
        await create.execute(CreateTodoInput(user_id="user-2", title="B"))

        list_usecase = ListTodosUseCase(repo)
        result = await list_usecase.execute("user-1")
        assert len(result) == 1
        assert result[0].title == "A"


class TestUpdateTodo:
    async def test_ステータス変更(self, repo: InMemoryTodoRepository) -> None:
        create = CreateTodoUseCase(repo)
        todo = await create.execute(CreateTodoInput(user_id="u", title="T"))

        update = UpdateTodoUseCase(repo)
        updated = await update.execute(
            UpdateTodoInput(
                todo_id=todo.id,
                user_id="u",
                status=TodoStatus.IN_PROGRESS,
            )
        )
        assert updated.status == TodoStatus.IN_PROGRESS

    async def test_他人のTodoは更新できない(self, repo: InMemoryTodoRepository) -> None:
        create = CreateTodoUseCase(repo)
        todo = await create.execute(CreateTodoInput(user_id="owner", title="T"))

        update = UpdateTodoUseCase(repo)
        with pytest.raises(TodoNotFoundError):
            await update.execute(
                UpdateTodoInput(
                    todo_id=todo.id,
                    user_id="stranger",
                    title="hacked",
                )
            )


class TestDeleteTodo:
    async def test_削除できる(self, repo: InMemoryTodoRepository) -> None:
        create = CreateTodoUseCase(repo)
        todo = await create.execute(CreateTodoInput(user_id="u", title="T"))

        delete = DeleteTodoUseCase(repo)
        await delete.execute(todo.id, "u")

        result = await repo.list_by_user("u")
        assert result == []
