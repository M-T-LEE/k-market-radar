import { Bot, User } from "lucide-react";
import { cn } from "../../lib/formatters";
import type { AssistantResponse, AssistantAction } from "../../services/internalAssistant/types";
import { AssistantActionButtons } from "./AssistantActionButtons";
import { AssistantClarification } from "./AssistantClarification";

export type AssistantMessage =
  | {
      id: string;
      role: "user";
      text: string;
    }
  | {
      id: string;
      role: "assistant";
      response: AssistantResponse;
    }
  | {
      id: string;
      role: "system";
      text: string;
    };

function AnswerSections({ response }: { response: AssistantResponse }) {
  const answer = response.answer;
  if (!answer) return null;

  return (
    <div className="space-y-3">
      {[
        ["요약", answer.summary],
        ["판단", answer.judgment]
      ].map(([title, body]) => (
        <div key={title}>
          <p className="text-[11px] font-black text-slate-400">{title}</p>
          <p className="mt-1 text-sm font-bold leading-6 text-slate-800 dark:text-slate-100">{body}</p>
        </div>
      ))}
      <div>
        <p className="text-[11px] font-black text-slate-400">내부 데이터 근거</p>
        <ul className="mt-1 space-y-1">
          {answer.evidence.map((item) => (
            <li key={item} className="text-sm font-bold leading-6 text-slate-700 dark:text-slate-200">
              - {item}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className="text-[11px] font-black text-slate-400">리스크</p>
        <ul className="mt-1 space-y-1">
          {answer.risks.map((item) => (
            <li key={item} className="text-sm font-bold leading-6 text-slate-700 dark:text-slate-200">
              - {item}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className="text-[11px] font-black text-slate-400">다음 액션</p>
        <ul className="mt-1 space-y-1">
          {answer.nextActions.map((item) => (
            <li key={item} className="text-sm font-bold leading-6 text-slate-700 dark:text-slate-200">
              - {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function AssistantMessageList({
  messages,
  onClarificationSelect,
  onRequestConfirm,
  onConfirmAction,
  onCancelAction
}: {
  messages: AssistantMessage[];
  onClarificationSelect: (prompt: string) => void;
  onRequestConfirm: (action: AssistantAction) => void;
  onConfirmAction: (action: AssistantAction) => void;
  onCancelAction: () => void;
}) {
  return (
    <div className="flex-1 space-y-4 overflow-y-auto pr-1">
      {messages.map((message) => {
        const isUser = message.role === "user";
        const isSystem = message.role === "system";
        return (
          <div
            key={message.id}
            className={cn("flex gap-3", isUser ? "justify-end" : "justify-start", isSystem && "justify-center")}
          >
            {!isUser && !isSystem ? (
              <span className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-200">
                <Bot className="size-4" />
              </span>
            ) : null}
            <div
              className={cn(
                "max-w-[88%] rounded-2xl px-4 py-3 shadow-sm",
                isUser
                  ? "bg-blue-600 text-white"
                  : isSystem
                    ? "bg-slate-100 text-xs font-black text-slate-500 dark:bg-slate-800 dark:text-slate-300"
                    : "border border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
              )}
            >
              {message.role === "user" ? (
                <p className="text-sm font-bold leading-6">{message.text}</p>
              ) : message.role === "system" ? (
                message.text
              ) : (
                <>
                  <AnswerSections response={message.response} />
                  {message.response.clarification ? (
                    <AssistantClarification
                      clarification={message.response.clarification}
                      onSelect={onClarificationSelect}
                    />
                  ) : null}
                  {message.response.choices?.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {message.response.choices.map((choice) => (
                        <button
                          key={choice.value}
                          type="button"
                          onClick={() => onClarificationSelect(choice.prompt ?? choice.value)}
                          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-700 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                        >
                          {choice.label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                  <AssistantActionButtons
                    actions={message.response.answer?.actions}
                    pendingAction={message.response.pendingAction}
                    onRequestConfirm={onRequestConfirm}
                    onConfirm={onConfirmAction}
                    onCancel={onCancelAction}
                  />
                </>
              )}
            </div>
            {isUser ? (
              <span className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-200">
                <User className="size-4" />
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
