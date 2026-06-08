import type { AssistantSuggestion } from "../../services/internalAssistant/types";

export function AssistantAutocomplete({
  suggestions,
  onSelect
}: {
  suggestions: AssistantSuggestion[];
  onSelect: (suggestion: AssistantSuggestion) => void;
}) {
  if (!suggestions.length) return null;

  return (
    <div className="absolute bottom-full left-0 right-0 mb-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
      {suggestions.map((suggestion) => (
        <button
          key={suggestion.id}
          type="button"
          onClick={() => onSelect(suggestion)}
          className="flex w-full items-center justify-between gap-3 border-b border-slate-100 px-3 py-2 text-left last:border-b-0 hover:bg-blue-50 dark:border-slate-800 dark:hover:bg-blue-500/10"
        >
          <span className="min-w-0">
            <span className="block break-keep text-sm font-black leading-5 text-slate-900 dark:text-slate-50">{suggestion.label}</span>
            <span className="block break-keep text-xs font-bold leading-5 text-slate-500 dark:text-slate-400">{suggestion.subtitle}</span>
          </span>
          <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black uppercase text-slate-500 dark:bg-slate-800 dark:text-slate-300">
            {suggestion.type}
          </span>
        </button>
      ))}
    </div>
  );
}
