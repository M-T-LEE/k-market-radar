import { buildScoreProfile } from "../../lib/scoring";
import {
  getMatchedScenarios,
  getScenarioStocks,
  normalizeScenarioText,
  resolveScenarioFilterParam,
  stockMatchesScenario
} from "../../lib/scenarioMatching";
import type { Issue, PortfolioHolding } from "../../types/portfolio";
import type { Stock } from "../../types/stock";
import { resolveContextStocks } from "./pageContextRegistry";
import type { AssistantContext, AssistantEntity, AssistantScope } from "./types";

function getEntityText(entity?: AssistantEntity) {
  return entity ? `${entity.label} ${entity.value}`.toLowerCase() : "";
}

function findScenarioByEntity(context: AssistantContext, entity?: AssistantEntity) {
  if (!entity) return undefined;
  const normalized = normalizeScenarioText(entity.value);

  if (entity.type === "scenario") {
    return context.scenarios.find(
      (scenario) => scenario.id === entity.id || scenario.id === entity.value || normalizeScenarioText(scenario.name) === normalized
    );
  }

  const resolved = resolveScenarioFilterParam(entity.value);
  if (resolved !== "전체") {
    return context.scenarios.find((scenario) => scenario.id === resolved);
  }

  return context.scenarios.find((scenario) => {
    const scenarioText = normalizeScenarioText(
      [
        scenario.name,
        scenario.description,
        ...scenario.coreValueChains,
        ...scenario.nodes.flatMap((node) => [node.label, node.theme, node.description])
      ].join(" ")
    );
    return scenarioText.includes(normalized);
  });
}

function findValueChainByEntity(context: AssistantContext, entity?: AssistantEntity) {
  if (!entity) return undefined;
  const normalized = normalizeScenarioText(entity.value);
  return context.valueChains.find((chain) => {
    const chainText = normalizeScenarioText([chain.name, chain.coreTechnology, ...chain.representativeCompanies].join(" "));
    return chain.id === entity.id || chainText.includes(normalized);
  });
}

function getStockSearchText(stock: Stock, context?: AssistantContext) {
  const scenarioText = context ? getMatchedScenarios(stock).map((scenario) => scenario.name).join(" ") : "";
  return normalizeScenarioText([stock.name, stock.ticker, stock.market, stock.sector, stock.theme, scenarioText].join(" "));
}

export function findStockByEntity(context: AssistantContext, entity?: AssistantEntity) {
  if (!entity) return undefined;
  if (entity.type === "stock") {
    return context.allStocks.find((stock) => stock.id === entity.id);
  }
  const text = getEntityText(entity);
  return context.allStocks.find(
    (stock) =>
      text.includes(stock.name.toLowerCase()) ||
      text.includes(stock.ticker.toLowerCase()) ||
      stock.name.toLowerCase().includes(entity.value.toLowerCase())
  );
}

export function filterStocksByEntity(stocks: Stock[], entity?: AssistantEntity, context?: AssistantContext) {
  if (!entity) return stocks;
  if (entity.type === "stock") {
    return stocks.filter((stock) => stock.id === entity.id);
  }
  const scenario = context ? findScenarioByEntity(context, entity) : undefined;
  if (scenario) return getScenarioStocks(scenario, stocks);

  const valueChain = context ? findValueChainByEntity(context, entity) : undefined;
  const needle = normalizeScenarioText(entity.value);

  if (valueChain) {
    const chainText = normalizeScenarioText(
      [valueChain.name, valueChain.coreTechnology, ...valueChain.representativeCompanies].join(" ")
    );
    return stocks.filter((stock) => {
      const stockText = getStockSearchText(stock, context);
      const representativeMatch = valueChain.representativeCompanies.some((company) =>
        normalizeScenarioText(stock.name).includes(normalizeScenarioText(company))
      );
      const scenarioMatch = context?.scenarios.some((scenarioItem) => {
        const belongsToChain =
          scenarioItem.coreValueChains.some((chain) => normalizeScenarioText(chain).includes(normalizeScenarioText(valueChain.name))) ||
          scenarioItem.nodes.some((node) => normalizeScenarioText(node.label).includes(normalizeScenarioText(valueChain.name)));
        return belongsToChain && stockMatchesScenario(stock, scenarioItem);
      });
      return representativeMatch || stockText.includes(needle) || stockText.includes(chainText) || Boolean(scenarioMatch);
    });
  }

  if (entity.type === "theme" || entity.type === "valueChain" || entity.type === "scenario") {
    return stocks.filter((stock) => getStockSearchText(stock, context).includes(needle));
  }
  return stocks;
}

export function getLeaderStocks(context: AssistantContext, scope: AssistantScope, entity?: AssistantEntity, limit = 5) {
  const scoped = resolveContextStocks(context, scope);
  return filterStocksByEntity(scoped, entity, context)
    .map((stock) => ({ stock, profile: buildScoreProfile(stock) }))
    .sort(
      (a, b) =>
        b.profile.marketAttentionScore * 0.35 +
        b.profile.finalScore * 0.45 +
        b.profile.earningsLinkScore * 0.2 -
        (a.profile.marketAttentionScore * 0.35 + a.profile.finalScore * 0.45 + a.profile.earningsLinkScore * 0.2)
    )
    .slice(0, limit);
}

export function getFollowerStocks(context: AssistantContext, scope: AssistantScope, entity?: AssistantEntity, limit = 5) {
  const scoped = resolveContextStocks(context, scope);
  return filterStocksByEntity(scoped, entity, context)
    .map((stock) => ({ stock, profile: buildScoreProfile(stock) }))
    .filter(({ profile }) => profile.structuralCompositeScore >= 58 && profile.marketAttentionScore <= 62)
    .sort(
      (a, b) =>
        b.profile.structuralCompositeScore - b.profile.marketAttentionScore -
        (a.profile.structuralCompositeScore - a.profile.marketAttentionScore)
    )
    .slice(0, limit);
}

export function getRiskStocks(context: AssistantContext, scope: AssistantScope, entity?: AssistantEntity, limit = 5) {
  const scoped = resolveContextStocks(context, scope);
  return filterStocksByEntity(scoped, entity, context)
    .map((stock) => ({ stock, profile: buildScoreProfile(stock) }))
    .sort((a, b) => b.profile.preReflectionRiskScore - a.profile.preReflectionRiskScore)
    .slice(0, limit);
}

export function getPortfolioHoldings(context: AssistantContext) {
  return context.holdings
    .map((holding) => ({
      holding,
      stock: context.allStocks.find((stock) => stock.id === holding.stockId)
    }))
    .filter((item): item is { holding: PortfolioHolding; stock: Stock } => Boolean(item.stock));
}

export function getPortfolioGaps(context: AssistantContext) {
  const holdings = getPortfolioHoldings(context);
  const heldThemes = new Set(holdings.map(({ stock }) => String(stock.theme)));
  const themeScores = new Map<string, { count: number; score: number; leader?: Stock }>();

  for (const stock of context.allStocks) {
    const profile = buildScoreProfile(stock);
    const key = String(stock.theme);
    const current = themeScores.get(key) ?? { count: 0, score: 0, leader: stock };
    current.count += 1;
    current.score += profile.finalScore;
    if (!current.leader || buildScoreProfile(current.leader).finalScore < profile.finalScore) {
      current.leader = stock;
    }
    themeScores.set(key, current);
  }

  return [...themeScores.entries()]
    .filter(([theme]) => !heldThemes.has(theme))
    .map(([theme, data]) => ({
      theme,
      averageScore: Math.round(data.score / Math.max(data.count, 1)),
      leader: data.leader,
      count: data.count
    }))
    .sort((a, b) => b.averageScore - a.averageScore)
    .slice(0, 5);
}

export function getIssuesForStock(context: AssistantContext, stock?: Stock) {
  if (!stock) return [] as Issue[];
  return context.issues.filter((issue) => issue.stockId === stock.id);
}

export function getValueChainEvidence(context: AssistantContext, entity?: AssistantEntity) {
  if (!entity) return context.valueChains.slice(0, 5);
  const scenario = findScenarioByEntity(context, entity);
  if (scenario) {
    const scenarioChains = new Set([
      ...scenario.coreValueChains.map((chain) => normalizeScenarioText(chain)),
      ...scenario.nodes.map((node) => normalizeScenarioText(node.label))
    ]);
    const chains = context.valueChains.filter((chain) => {
      const chainText = normalizeScenarioText([chain.name, chain.coreTechnology].join(" "));
      return scenario.id === chain.scenarioId || [...scenarioChains].some((scenarioChain) => chainText.includes(scenarioChain));
    });
    if (chains.length) return chains;
  }

  const valueChain = findValueChainByEntity(context, entity);
  if (valueChain) return [valueChain];

  const stock = findStockByEntity(context, entity);
  if (stock) {
    const matchedScenarioIds = new Set(getMatchedScenarios(stock).map((scenarioItem) => scenarioItem.id));
    return context.valueChains.filter(
      (chain) =>
        chain.representativeCompanies.some((company) => normalizeScenarioText(stock.name).includes(normalizeScenarioText(company))) ||
        matchedScenarioIds.has(chain.scenarioId)
    );
  }

  const needle = normalizeScenarioText(entity.value);
  return context.valueChains.filter((chain) =>
    normalizeScenarioText([chain.name, chain.coreTechnology, ...chain.representativeCompanies].join(" ")).includes(needle)
  );
}
