import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { composeAssistantResponse } from "../../services/internalAssistant/answerComposer";
import { executeAssistantAction } from "../../services/internalAssistant/actionDispatcher";
import { getPageQuickPrompts } from "../../services/internalAssistant/pageContextRegistry";
import type { AssistantAction, AssistantResponse, AssistantScope } from "../../services/internalAssistant/types";
import { useAssistantPageContext } from "../../hooks/useAssistantPageContext";
import { AssistantContextBadge } from "./AssistantContextBadge";
import { AssistantInput } from "./AssistantInput";
import { AssistantMessageList, type AssistantMessage } from "./AssistantMessageList";
import { AssistantQuickPrompts } from "./AssistantQuickPrompts";

function makeId(prefix: string) {
  return `${prefix}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
}

function confirmationResponse(action: AssistantAction): AssistantResponse {
  return {
    mode: "confirm",
    intent:
      action.type === "ADD_TO_WATCHLIST"
        ? "ADD_TO_WATCHLIST"
        : action.type === "REGISTER_ISSUE_MONITORING"
          ? "REGISTER_ISSUE_MONITORING"
          : "SEND_TO_SCREENER",
    confidence: 1,
    query: action.label,
    pendingAction: action,
    answer: {
      summary: `${action.label} 실행 전 확인이 필요합니다.`,
      judgment: "자연어 입력이나 버튼 클릭만으로 액션을 바로 실행하지 않습니다.",
      evidence: [action.description],
      risks: ["선택한 종목과 조건이 맞는지 확인해야 합니다."],
      nextActions: ["확인 또는 취소를 선택하세요."],
      actions: [action]
    }
  };
}

export function AssistantChatPanel() {
  const [scope, setScope] = useState<AssistantScope>("page");
  const context = useAssistantPageContext(scope);
  const navigate = useNavigate();
  const quickPrompts = useMemo(() => getPageQuickPrompts(context.pathname), [context.pathname]);
  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      id: makeId("system"),
      role: "system",
      text: "외부 AI 미사용 · 내부 데이터 기준 · 실행 액션은 확인 후 처리"
    }
  ]);

  const submitPrompt = (prompt: string) => {
    const response = composeAssistantResponse(prompt, context, scope);
    setMessages((current) => [
      ...current,
      { id: makeId("user"), role: "user", text: prompt },
      { id: makeId("assistant"), role: "assistant", response }
    ]);
  };

  const requestConfirm = (action: AssistantAction) => {
    setMessages((current) => [
      ...current,
      { id: makeId("assistant"), role: "assistant", response: confirmationResponse(action) }
    ]);
  };

  const confirmAction = (action: AssistantAction) => {
    const result = executeAssistantAction(action);
    setMessages((current) => [
      ...current,
      { id: makeId("system"), role: "system", text: result.message }
    ]);
    if (result.path) {
      navigate(result.path);
    }
  };

  const cancelAction = () => {
    setMessages((current) => [
      ...current,
      { id: makeId("system"), role: "system", text: "요청한 액션을 실행하지 않았습니다." }
    ]);
  };

  return (
    <div className="flex h-full flex-col gap-4">
      <AssistantContextBadge pageLabel={context.pageLabel} scope={scope} onScopeChange={setScope} />
      <AssistantQuickPrompts prompts={quickPrompts} onSelect={submitPrompt} />
      <AssistantMessageList
        messages={messages}
        onClarificationSelect={submitPrompt}
        onRequestConfirm={requestConfirm}
        onConfirmAction={confirmAction}
        onCancelAction={cancelAction}
      />
      <AssistantInput context={context} onSubmit={submitPrompt} />
    </div>
  );
}
