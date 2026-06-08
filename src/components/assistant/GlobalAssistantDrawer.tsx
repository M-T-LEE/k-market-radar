import { X } from "lucide-react";
import { useEffect } from "react";
import { AssistantChatPanel } from "./AssistantChatPanel";

export function GlobalAssistantDrawer({
  open,
  onClose
}: {
  open: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="fixed bottom-24 right-8 z-50 h-[min(760px,calc(100vh-132px))] w-[440px] max-w-[calc(100vw-32px)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-950">
      <div className="flex items-start justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-950">
        <div>
          <h2 className="text-lg font-black text-slate-950 dark:text-slate-50">레이더 어시스턴트</h2>
          <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">
            외부 AI 미사용 · 내부 데이터 기준
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
          aria-label="레이더 어시스턴트 닫기"
        >
          <X className="size-4" />
        </button>
      </div>
      <div className="h-[calc(100%-73px)] p-4">
        <AssistantChatPanel />
      </div>
    </div>
  );
}
