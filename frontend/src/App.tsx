import { useAuth } from "react-oidc-context";
import { AuthGuard } from "./components/AuthGuard";
import { TodoForm } from "./features/todos/components/TodoForm";
import { TodoList } from "./features/todos/components/TodoList";
import { authMockEnabled } from "./lib/authConfig";

export function App() {
  const auth = useAuth();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-900">
            📋 Training ToDo
          </h1>
          <div className="flex items-center gap-3">
            {authMockEnabled ? (
              <span className="text-sm text-slate-500">mock user</span>
            ) : auth.isAuthenticated ? (
              <>
                <span className="text-sm text-slate-600">
                  {auth.user?.profile.email}
                </span>
                <button
                  onClick={() => void auth.removeUser()}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  ログアウト
                </button>
              </>
            ) : null}
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <AuthGuard>
          <TodoForm />
          <TodoList />
        </AuthGuard>
      </main>

      <footer className="py-6 text-center text-xs text-slate-400">
        Training ToDo App — 新卒研修ゴールリポジトリ
      </footer>
    </div>
  );
}
