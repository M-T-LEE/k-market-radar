import { MessageCircle, Sparkles } from "lucide-react";
import { useState } from "react";
import { GlobalAssistantDrawer } from "./GlobalAssistantDrawer";

export function GlobalAssistantButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="fixed bottom-8 right-8 z-40 flex items-center gap-3 rounded-full bg-blue-600 px-5 py-4 text-sm font-black text-white shadow-2xl shadow-blue-900/30 transition hover:-translate-y-0.5 hover:bg-blue-700"
        aria-label="레이더 어시스턴트 열기"
      >
        <span className="relative flex size-9 items-center justify-center rounded-full bg-white/15">
          <MessageCircle className="size-5" />
          <Sparkles className="absolute -right-1 -top-1 size-3.5 text-amber-200" />
        </span>
        <span className="hidden sm:inline">레이더 어시스턴트</span>
      </button>
      <GlobalAssistantDrawer open={open} onClose={() => setOpen(false)} />
    </>
  );
}
