export const brokerRealtimeProvider = {
  id: "brokerRealtimeProvider" as const,
  label: "브로커 실시간 시세",
  status: "disabled" as const,
  candidates: ["한국투자증권 WebSocket", "키움 OpenAPI+"],
  note: "MVP에서는 비활성화합니다. 체결, 호가, 브로커 시세 연동 후보만 보관합니다."
};
