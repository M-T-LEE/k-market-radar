export function AssistantQuickPrompts({
  prompts,
  onSelect
}: {
  prompts: string[];
  onSelect: (prompt: string) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-black text-slate-500 dark:text-slate-400">빠른 질문</div>
      <div className="flex flex-wrap gap-2">
        {prompts.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => onSelect(prompt)}
            className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-blue-500/70 dark:hover:bg-blue-500/10"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}
