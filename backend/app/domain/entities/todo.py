"""
Todo ドメインエンティティ。

この層は「ビジネスルール」のみを表現する。
- FastAPI、SQLAlchemy、その他フレームワークに依存しない
- DBの都合で構造を変えない
- 「Todoとは何か」をコードで定義する

研修メモ: ここで type hint を書き切ることで、他の層で「Todoって何だっけ？」と
迷うことがなくなる。dataclass の frozen=True で不変オブジェクトにし、
状態変更は必ず新しいインスタンスを返す関数で行う（=純粋関数）。
"""
from dataclasses import dataclass, field, replace
from datetime import datetime, timezone
from uuid import UUID, uuid4

from app.domain.value_objects.todo_status import TodoStatus


class DomainError(Exception):
    """ドメインルール違反を表す基底例外。"""


class InvalidTodoTitle(DomainError):
    """Todoタイトルが不正。"""


@dataclass(frozen=True)
class Todo:
    """ToDoエンティティ。

    不変オブジェクトとして設計。状態を変更する操作は
    新しいインスタンスを返す。

    ビジネスルール:
    - title は 1〜200 文字
    - status の遷移: pending → in_progress → done
    - 一度 done になったタスクは pending には戻せない（任意のルール）
    """

    id: UUID
    user_id: str
    title: str
    status: TodoStatus
    description: str | None = None
    due_date: datetime | None = None
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    @classmethod
    def create(
        cls,
        user_id: str,
        title: str,
        description: str | None = None,
        due_date: datetime | None = None,
    ) -> "Todo":
        """新しい Todo を作成する（ファクトリメソッド）。"""
        cls._validate_title(title)
        return cls(
            id=uuid4(),
            user_id=user_id,
            title=title.strip(),
            description=description,
            status=TodoStatus.PENDING,
            due_date=due_date,
        )

    def change_title(self, new_title: str) -> "Todo":
        """タイトルを変更した新しいインスタンスを返す。"""
        self._validate_title(new_title)
        return replace(
            self,
            title=new_title.strip(),
            updated_at=datetime.now(timezone.utc),
        )

    def change_status(self, new_status: TodoStatus) -> "Todo":
        """ステータスを変更した新しいインスタンスを返す。

        ビジネスルール: done から pending への逆戻りは禁止。
        """
        if self.status == TodoStatus.DONE and new_status == TodoStatus.PENDING:
            raise DomainError("done のタスクは pending に戻せません")
        return replace(
            self,
            status=new_status,
            updated_at=datetime.now(timezone.utc),
        )

    def change_description(self, new_description: str | None) -> "Todo":
        return replace(
            self,
            description=new_description,
            updated_at=datetime.now(timezone.utc),
        )

    def change_due_date(self, new_due_date: datetime | None) -> "Todo":
        return replace(
            self,
            due_date=new_due_date,
            updated_at=datetime.now(timezone.utc),
        )

    @staticmethod
    def _validate_title(title: str) -> None:
        stripped = title.strip()
        if not stripped:
            raise InvalidTodoTitle("タイトルは1文字以上必要です")
        if len(stripped) > 200:
            raise InvalidTodoTitle("タイトルは200文字以内にしてください")
