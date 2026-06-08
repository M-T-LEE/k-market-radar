import { Send, X } from "lucide-react";
import { useMemo, useState } from "react";
import { getAutocompleteSuggestions } from "../../services/internalAssistant/entityResolver";
import type { AssistantContext, AssistantSuggestion } from "../../services/internalAssistant/types";
import { AssistantAutocomplete } from "./AssistantAutocomplete";

export function AssistantInput({
  context,
  disabled,
  onSubmit
}: {
  context: AssistantContext;
  disabled?: boolean;
  onSubmit: (value: string) => void;
}) {
  const [value, setValue] = useState("");
  const suggestions = useMemo(() => getAutocompleteSuggestions(value, context), [context, value]);

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSubmit(trimmed);
    setValue("");
  };

  const selectSuggestion = (suggestion: AssistantSuggestion) => {
    setValue(suggestion.value);
  };

  return (
    <div className="relative">
      <AssistantAutocomplete suggestions={suggestions} onSelect={selectSuggestion} />
      <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-700 dark:bg-slate-950">
        <textarea
          value={value}
          disabled={disabled}
          rows={1}
          placeholder="예: LG가 더 좋아? / HBM 대장주는?"
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              submit();
            }
          }}
          className="max-h-28 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-sm font-bold text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-50"
        />
        {value ? (
          <button
            type="button"
            onClick={() => setValue("")}
            className="mb-1 flex size-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            aria-label="입력 지우기"
          >
            <X className="size-4" />
          </button>
        ) : null}
        <button
          type="button"
          disabled={!value.trim() || disabled}
          onClick={submit}
          className="mb-1 flex size-9 items-center justify-center rounded-lg bg-blue-600 text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-700"
          aria-label="질문 보내기"
        >
          <Send className="size-4" />
        </button>
      </div>
      <p className="mt-2 text-[11px] font-bold text-slate-400">
        외부 AI를 호출하지 않으며, 액션은 확인 후 실행됩니다.
      </p>
    </div>
  );
}
