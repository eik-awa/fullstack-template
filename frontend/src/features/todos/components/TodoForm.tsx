import { useState } from "react";
import { useCreateTodo } from "../hooks";

export function TodoForm() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const createMutation = useCreateTodo();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    createMutation.mutate(
      {
        title: title.trim(),
        description: description.trim() || undefined,
      },
      {
        onSuccess: () => {
          setTitle("");
          setDescription("");
        },
      },
    );
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-lg shadow p-4 space-y-3"
    >
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          タイトル
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
          required
          className="w-full border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="買い物に行く"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          詳細（任意）
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={2000}
          rows={2}
          className="w-full border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <button
        type="submit"
        disabled={createMutation.isPending || !title.trim()}
        className="w-full bg-blue-600 text-white font-medium py-2 rounded-md hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition"
      >
        {createMutation.isPending ? "追加中..." : "追加"}
      </button>
      {createMutation.isError && (
        <p className="text-red-600 text-sm">
          {createMutation.error.message}
        </p>
      )}
    </form>
  );
}
