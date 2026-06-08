import type { EntityResolutionResult, IntentClassification } from "./types";

export const scoreAssistantConfidence = (
  classification: IntentClassification,
  resolution: EntityResolutionResult,
  hasPageContext: boolean,
) => {
  let score = classification.confidence;

  const exactEntity = resolution.entities.some((entity) => entity.confidence >= 0.9);
  const exactStockEntity = resolution.entities.some(
    (entity) => entity.type === "stock" && entity.confidence >= 0.9,
  );
  const partialEntity = resolution.entities.some((entity) => entity.confidence >= 0.6);

  if (exactEntity) score += 0.18;
  else if (partialEntity) score += 0.1;

  if (hasPageContext) score += 0.04;
  if (classification.intent === "UNKNOWN" && !exactStockEntity) score = Math.min(score, 0.38);
  if (resolution.ambiguousEntities.length >= 2 && !exactStockEntity) score = Math.min(score, 0.72);

  return Math.max(0, Math.min(0.96, Number(score.toFixed(2))));
};
