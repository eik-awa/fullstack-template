"""
Todoリポジトリの抽象インタフェース。

domain層からはこの抽象のみを参照する。
実装（SQLAlchemy、InMemory など）は infrastructure層に置く。

これにより、
- ドメイン/ユースケースは DB の存在を知らない
- テスト時は InMemory 実装を DI するだけで単体テストできる
- 将来 MySQL → PostgreSQL でも domain は無変更
"""
from abc import ABC, abstractmethod
from uuid import UUID

from app.domain.entities.todo import Todo


class TodoRepository(ABC):
    """Todoの永続化を抽象化するリポジトリ。"""

    @abstractmethod
    async def add(self, todo: Todo) -> None:
        """新しい Todo を保存する。"""

    @abstractmethod
    async def get_by_id(self, todo_id: UUID, user_id: str) -> Todo | None:
        """ID で Todo を取得する。他ユーザーの Todo は返さない。"""

    @abstractmethod
    async def list_by_user(self, user_id: str) -> list[Todo]:
        """ユーザーが所有する Todo の一覧。"""

    @abstractmethod
    async def update(self, todo: Todo) -> None:
        """Todo を更新する。"""

    @abstractmethod
    async def delete(self, todo_id: UUID, user_id: str) -> bool:
        """Todo を削除する。削除成功時 True。"""
