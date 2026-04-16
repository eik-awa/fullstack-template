import { useTodos } from "../hooks";
import { TodoItem } from "./TodoItem";

export function TodoList() {
  const { data: todos, isLoading, isError, error } = useTodos();

  if (isLoading) {
    return <p className="text-slate-500 text-center py-8">読み込み中...</p>;
  }

  if (isError) {
    return (
      <p className="text-red-600 text-center py-8">
        エラー: {error.message}
      </p>
    );
  }

  if (!todos || todos.length === 0) {
    return (
      <p className="text-slate-500 text-center py-8">
        まだ ToDo がありません。上のフォームから追加してください。
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {todos.map((todo) => (
        <TodoItem key={todo.id} todo={todo} />
      ))}
    </ul>
  );
}
