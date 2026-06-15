import type { PortfolioHolding } from "../types/portfolio";
import type { Stock } from "../types/stock";

export const PORTFOLIO_STORAGE_KEY = "market-cycle-radar:portfolio-holdings";

export function readPortfolioHoldings(): PortfolioHolding[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(PORTFOLIO_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PortfolioHolding[]) : [];
  } catch {
    return [];
  }
}

export function writePortfolioHoldings(holdings: PortfolioHolding[]) {
  if (typeof window === "undefined") return;

  localStorage.setItem(PORTFOLIO_STORAGE_KEY, JSON.stringify(holdings));
  window.dispatchEvent(new Event("market-cycle-radar:portfolio-updated"));
}

export function createPortfolioHolding(
  stock: Stock,
  form: {
    averagePrice?: string;
    quantity?: string;
    buyDate?: string;
  } = {}
): PortfolioHolding {
  return {
    id: `holding-${stock.id}-${Date.now()}`,
    stockId: stock.id,
    averagePrice: Number(form.averagePrice) || stock.currentPrice,
    quantity: Number(form.quantity) || 0,
    weight: 0,
    buyDate: form.buyDate || new Date().toISOString().slice(0, 10),
    investmentThesis: `${stock.name}의 ${stock.theme} 흐름과 실적 연결성을 추적합니다.`,
    coreScenario: `${stock.theme} 산업 시나리오`,
    coreValueChain: stock.sector,
    expectedEarningsPoint: "실적, 수주, 가격 협상력 변화를 함께 확인",
    keyRisks: "밸류 부담, 수급 약화, 산업 이벤트 변화",
    addCondition: "가격 반응과 실적 기대가 동시에 개선될 때",
    reduceCondition: "주가가 실적 기대보다 빠르게 선반영될 때",
    exitCondition: "투자 논리를 훼손하는 실적 또는 산업 이벤트 발생 시",
    currentDecision: "실적 확인 대기" as PortfolioHolding["currentDecision"],
    riskLevel: "보통" as PortfolioHolding["riskLevel"],
    reevaluationScore: {
      scenarioPersistence: 14,
      coreCompanyStatus: 11,
      earningsLinkChange: 12,
      issueImpact: 9,
      valuationBurden: 6,
      supplyMomentum: 6,
      riskChange: 6
    }
  };
}
