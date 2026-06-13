import { LockKeyhole } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAdminAuth } from "../context/AdminAuthContext";

function getNextPath(search: string) {
  const next = new URLSearchParams(search).get("next");
  return next?.startsWith("/") ? next : "/settings";
}

export default function AdminLogin() {
  const { isAdmin, login, status } = useAdminAuth();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const nextPath = getNextPath(location.search);

  useEffect(() => {
    if (isAdmin) {
      navigate(nextPath, { replace: true });
    }
  }, [isAdmin, navigate, nextPath]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    const result = await login(password);
    setSubmitting(false);

    if (result.ok) {
      navigate(nextPath, { replace: true });
      return;
    }

    setError(result.error);
  };

  return (
    <div className="flex min-h-[calc(100vh-128px)] items-center justify-center">
      <section className="w-full max-w-md rounded-lg border border-radar-line bg-white p-6 shadow-card dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <span className="rounded-lg bg-blue-50 p-3 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300">
            <LockKeyhole size={24} />
          </span>
          <div>
            <h2 className="text-xl font-black text-radar-ink dark:text-slate-100">관리자 로그인</h2>
            <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-400">
              설정 화면은 관리자 세션에서만 열립니다.
            </p>
          </div>
        </div>

        <form className="mt-6 space-y-4" onSubmit={submit}>
          <label className="block">
            <span className="text-sm font-black text-slate-700 dark:text-slate-200">관리자 비밀번호</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              className="mt-2 h-11 w-full rounded-lg border border-radar-line bg-white px-3 text-sm font-bold text-radar-ink outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </label>

          {error ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-red-700 dark:bg-red-950/40 dark:text-red-200">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting || status === "checking"}
            className="h-11 w-full rounded-lg bg-blue-600 text-sm font-black text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {submitting || status === "checking" ? "확인 중" : "로그인"}
          </button>
        </form>
      </section>
    </div>
  );
}
