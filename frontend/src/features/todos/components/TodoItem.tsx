import { useDeleteTodo, useUpdateTodo } from "../hooks";
import { statusLabels, type Todo, type TodoStatus } from "../types";

interface Props {
  todo: Todo;
}

const statusColors: Record<TodoStatus, string> = {
  pending: "bg-slate-100 text-slate-700",
  in_progress: "bg-blue-100 text-blue-700",
  done: "bg-green-100 text-green-700",
};

export function TodoItem({ todo }: Props) {
  const updateMutation = useUpdateTodo();
  const deleteMutation = useDeleteTodo();

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateMutation.mutate({
      id: todo.id,
      input: { status: e.target.value as TodoStatus },
    });
  };

  const handleDelete = () => {
    if (confirm(`「${todo.title}」を削除しますか？`)) {
      deleteMutation.mutate(todo.id);
    }
  };

  return (
    <li
      className={`bg-white rounded-lg shadow p-4 flex items-start gap-3 ${
        todo.status === "done" ? "opacity-60" : ""
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${statusColors[todo.status]}`}
          >
            {statusLabels[todo.status]}
          </span>
          <h3
            className={`font-medium text-slate-900 break-words ${
              todo.status === "done" ? "line-through" : ""
            }`}
          >
            {todo.title}
          </h3>
        </div>
        {todo.description && (
          <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">
            {todo.description}
          </p>
        )}
        <p className="text-xs text-slate-400 mt-2">
          作成: {new Date(todo.created_at).toLocaleString("ja-JP")}
        </p>
      </div>
      <div className="flex flex-col gap-2 shrink-0">
        <select
          value={todo.status}
          onChange={handleStatusChange}
          disabled={updateMutation.isPending}
          className="text-sm border border-slate-300 rounded px-2 py-1"
        >
          <option value="pending">未着手</option>
          <option value="in_progress">進行中</option>
          <option value="done">完了</option>
        </select>
        <button
          onClick={handleDelete}
          disabled={deleteMutation.isPending}
          className="text-sm text-red-600 hover:text-red-800 disabled:text-slate-400"
        >
          削除
        </button>
      </div>
    </li>
  );
}
