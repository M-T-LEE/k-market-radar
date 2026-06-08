import type { AssistantClarification as AssistantClarificationType } from "../../services/internalAssistant/types";

export function AssistantClarification({
  clarification,
  onSelect
}: {
  clarification: AssistantClarificationType;
  onSelect: (prompt: string) => void;
}) {
  return (
    <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50 p-3 dark:border-blue-500/30 dark:bg-blue-500/10">
      <p className="text-sm font-black text-blue-900 dark:text-blue-100">{clarification.question}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {clarification.options.map((option) => (
          <button
            key={`${option.value}-${option.label}`}
            type="button"
            onClick={() => onSelect(option.prompt ?? option.value)}
            className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-black text-blue-700 hover:bg-blue-100 dark:border-blue-500/30 dark:bg-slate-950 dark:text-blue-200 dark:hover:bg-blue-500/10"
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
