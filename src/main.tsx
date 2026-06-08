import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";

function formatBootError(error: unknown) {
  if (error instanceof Error) {
    return {
      message: `${error.name}: ${error.message}`,
      stack: error.stack ?? ""
    };
  }

  return {
    message: String(error),
    stack: ""
  };
}

function showBootError(error: unknown) {
  const rootElement = document.getElementById("root");
  const { message, stack } = formatBootError(error);

  if (rootElement) {
    rootElement.innerHTML = `
      <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0f172a;color:#e2e8f0;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:32px;">
        <div style="max-width:920px;width:100%;border:1px solid #334155;border-radius:16px;background:#111827;padding:28px;box-shadow:0 24px 80px rgba(0,0,0,.35);">
          <p style="margin:0 0 8px;color:#93c5fd;font-weight:700;">K-Market Radar 부팅 오류</p>
          <h1 style="margin:0 0 16px;font-size:28px;line-height:1.25;color:#f8fafc;">화면을 그리는 중 오류가 발생했습니다.</h1>
          <p style="margin:0 0 18px;color:#cbd5e1;">아래 오류를 기준으로 바로 수정할 수 있게 부팅 단계에서 잡아낸 내용입니다.</p>
          <pre style="white-space:pre-wrap;word-break:break-word;margin:0;padding:16px;border-radius:12px;background:#020617;color:#fecaca;border:1px solid #7f1d1d;font-size:13px;line-height:1.55;">${message}${stack ? `\n\n${stack}` : ""}</pre>
        </div>
      </div>
    `;
  }

  console.error(error);
}

window.addEventListener("error", (event) => {
  showBootError(event.error ?? event.message);
});

window.addEventListener("unhandledrejection", (event) => {
  showBootError(event.reason);
});

async function bootstrap() {
  const rootElement = document.getElementById("root");

  if (!rootElement) {
    throw new Error("React root element #root not found.");
  }

  const { default: App } = await import("./app/App");

  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </React.StrictMode>
  );
}

void bootstrap().catch(showBootError);
