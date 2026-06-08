import { Check, ExternalLink, Plus, ShieldCheck, X } from "lucide-react";
import type { AssistantAction } from "../../services/internalAssistant/types";

function ActionIcon({ type }: { type: AssistantAction["type"] }) {
  if (type === "NAVIGATE_SCREENER") return <ExternalLink className="size-4" />;
  if (type === "REGISTER_ISSUE_MONITORING") return <ShieldCheck className="size-4" />;
  return <Plus className="size-4" />;
}

export function AssistantActionButtons({
  actions,
  pendingAction,
  onRequestConfirm,
  onConfirm,
  onCancel
}: {
  actions?: AssistantAction[];
  pendingAction?: AssistantAction;
  onRequestConfirm?: (action: AssistantAction) => void;
  onConfirm?: (action: AssistantAction) => void;
  onCancel?: () => void;
}) {
  if (pendingAction) {
    return (
      <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-500/30 dark:bg-amber-500/10">
        <p className="text-xs font-black text-amber-800 dark:text-amber-100">실행 전 확인</p>
        <p className="mt-1 text-sm font-bold text-amber-900 dark:text-amber-50">{pendingAction.description}</p>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => onConfirm?.(pendingAction)}
            className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-xs font-black text-white hover:bg-blue-700"
          >
            <Check className="size-4" />
            확인
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <X className="size-4" />
            취소
          </button>
        </div>
      </div>
    );
  }

  if (!actions?.length) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {actions.map((action) => (
        <button
          key={action.id}
          type="button"
          onClick={() => onRequestConfirm?.(action)}
          className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 hover:bg-blue-100 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200"
        >
          <ActionIcon type={action.type} />
          {action.label}
        </button>
      ))}
    </div>
  );
}
