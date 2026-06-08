import {
  ArrowRight,
  Building2,
  ExternalLink,
  GitBranch,
  GripHorizontal,
  Network,
  RefreshCw,
  Search,
  ShieldCheck,
  X
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "../components/Badge";
import { GovernanceChangeWatchPanel } from "../components/DecisionSupportPanels";
import { useMarketData } from "../context/MarketDataContext";
import { governanceUpdatePolicy, groupGovernanceData } from "../data/groupGovernance";
import { getStockExternalUrl } from "../lib/externalLinks";
import {
  cn,
  formatNumber,
  formatPercent,
  getMarketMoveTextClass
} from "../lib/formatters";
import type { BusinessGroup, GovernanceEdge, GovernanceNode } from "../types/governance";
import type { Stock } from "../types/stock";

const relationLegend = [
  {
    id: "subsidiary",
    label: "지배/자회사",
    color: "bg-blue-600",
    text: "text-blue-700",
    border: "border-blue-200",
    description: "보유 주체가 피보유 기업을 실질적으로 지배하거나 자회사로 연결하는 지분입니다."
  },
  {
    id: "major",
    label: "주요 지분",
    color: "bg-teal-600",
    text: "text-teal-700",
    border: "border-teal-200",
    description: "20% 이상이거나 그룹 내 주요 영향력이 있는 지분입니다."
  },
  {
    id: "strategic",
    label: "전략 지분",
    color: "bg-violet-600",
    text: "text-violet-700",
    border: "border-violet-200",
    description: "신사업, 기술 제휴, 옵션성 투자를 보기 위한 전략 지분입니다."
  },
  {
    id: "circular",
    label: "순환/복합",
    color: "bg-amber-600",
    text: "text-amber-700",
    border: "border-amber-200",
    description: "순환출자 또는 해석이 필요한 복합 지분입니다."
  },
  {
    id: "minor",
    label: "기타 지분",
    color: "bg-slate-400",
    text: "text-slate-700",
    border: "border-slate-200",
    description: "소수 지분이지만 그룹 구조나 전략 로드맵에서 추적할 필요가 있는 지분입니다."
  }
];

type RelationMeta = (typeof relationLegend)[number];

type OwnershipRow = {
  edge: GovernanceEdge;
  holder: GovernanceNode;
  asset: GovernanceNode;
  holderStock?: Stock;
  assetStock?: Stock;
  estimatedStakeValue: number;
  roadmapTitle?: string;
  meta: RelationMeta;
};

type RoadmapView = BusinessGroup["investmentRoadmap"][number] & {
  relatedStocks: Stock[];
  avgMove: number;
};

function formatOwnership(value: number) {
  return `${formatNumber(value, value % 1 === 0 ? 0 : 1)}%`;
}

function formatPrice(stock?: Stock) {
  if (!stock) return "-";
  if (stock.market === "KOSPI" || stock.market === "KOSDAQ") {
    return `${formatNumber(stock.currentPrice)}원`;
  }
  return `$${formatNumber(stock.currentPrice, 2)}`;
}

function formatCapValue(marketCap?: number, market?: Stock["market"]) {
  if (!marketCap) return "-";
  if (market === "KOSPI" || market === "KOSDAQ") {
    return marketCap >= 10000 ? `${formatNumber(marketCap / 10000, 1)}조 원` : `${formatNumber(marketCap)}억 원`;
  }
  return `$${formatNumber(marketCap, 1)}B`;
}

function nodeTypeLabel(type: GovernanceNode["type"]) {
  const labels: Record<GovernanceNode["type"], string> = {
    OWNER: "오너",
    HOLDING: "지주",
    OPERATING: "사업",
    FINANCE: "금융",
    UNLISTED: "비상장",
    AFFILIATE: "계열",
    STRATEGIC: "전략투자"
  };
  return labels[type];
}

function getMove(stock?: Stock) {
  return stock?.dailyChangeRate ?? stock?.priceChange3M ?? 0;
}

function getRelationMeta(edge: GovernanceEdge) {
  const relation = String(edge.relation);
  if (relation.includes("순환")) return relationLegend[3];
  if (relation.includes("전략")) return relationLegend[2];
  if (edge.ownershipPercent >= 50 || relation.includes("지배") || relation.includes("자회사")) return relationLegend[0];
  if (edge.ownershipPercent >= 20 || relation.includes("주요")) return relationLegend[1];
  return relationLegend[4];
}

function getConnectedEdges(group: BusinessGroup, nodeId: string) {
  return group.edges.filter((edge) => edge.from === nodeId || edge.to === nodeId);
}

function getRelationAccentClass(meta: RelationMeta) {
  if (meta.id === "subsidiary") return "border-l-blue-500";
  if (meta.id === "major") return "border-l-teal-500";
  if (meta.id === "strategic") return "border-l-violet-500";
  if (meta.id === "circular") return "border-l-amber-500";
  return "border-l-slate-400";
}

function StakeProgress({ percent, meta }: { percent: number; meta: RelationMeta }) {
  return (
    <div className="min-w-0 flex-1">
      <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800">
        <div className={cn("h-2 rounded-full", meta.color)} style={{ width: `${Math.min(percent, 100)}%` }} />
      </div>
    </div>
  );
}

function getRelationStroke(meta: RelationMeta) {
  if (meta.id === "subsidiary") return "#2563eb";
  if (meta.id === "major") return "#0d9488";
  if (meta.id === "strategic") return "#7c3aed";
  if (meta.id === "circular") return "#d97706";
  return "#94a3b8";
}

function getNodeToneClass(type: GovernanceNode["type"]) {
  if (type === "OWNER") return "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-100";
  if (type === "HOLDING") return "border-blue-300 bg-blue-50 text-blue-950 dark:border-blue-500/50 dark:bg-blue-500/15 dark:text-blue-100";
  if (type === "FINANCE") return "border-teal-300 bg-teal-50 text-teal-950 dark:border-teal-500/40 dark:bg-teal-500/15 dark:text-teal-100";
  if (type === "STRATEGIC") return "border-violet-300 bg-violet-50 text-violet-950 dark:border-violet-500/40 dark:bg-violet-500/15 dark:text-violet-100";
  if (type === "UNLISTED") return "border-slate-300 bg-slate-50 text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100";
  return "border-radar-line bg-white text-radar-ink dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";
}

function getNodeSizeClass(type: GovernanceNode["type"]) {
  if (type === "OWNER") return "w-[142px] min-h-[74px]";
  if (type === "HOLDING") return "w-[160px] min-h-[78px]";
  if (type === "STRATEGIC" || type === "UNLISTED") return "w-[158px] min-h-[76px]";
  return "w-[154px] min-h-[76px]";
}

function getNodeRouteBox(type: GovernanceNode["type"], compact = false) {
  if (compact) {
    if (type === "OWNER") return { halfX: 5.4, halfY: 5.6 };
    if (type === "HOLDING") return { halfX: 5.7, halfY: 5.7 };
    if (type === "STRATEGIC" || type === "UNLISTED") return { halfX: 5.6, halfY: 5.6 };
    return { halfX: 5.5, halfY: 5.6 };
  }

  if (type === "OWNER") return { halfX: 7.9, halfY: 7.2 };
  if (type === "HOLDING") return { halfX: 8.9, halfY: 7.8 };
  if (type === "STRATEGIC" || type === "UNLISTED") return { halfX: 8.8, halfY: 7.6 };
  return { halfX: 8.6, halfY: 7.6 };
}

function getNodeCollisionBox(type: GovernanceNode["type"], compact = false) {
  if (compact) {
    if (type === "OWNER") return { halfX: 5.1, halfY: 5.3 };
    if (type === "HOLDING") return { halfX: 5.5, halfY: 5.7 };
    if (type === "STRATEGIC" || type === "UNLISTED") return { halfX: 5.4, halfY: 5.3 };
    return { halfX: 5.3, halfY: 5.6 };
  }

  if (type === "OWNER") return { halfX: 6.8, halfY: 6.8 };
  if (type === "HOLDING") return { halfX: 7.6, halfY: 7.8 };
  if (type === "STRATEGIC" || type === "UNLISTED") return { halfX: 7.5, halfY: 7.4 };
  return { halfX: 7.4, halfY: 7.6 };
}

function clampMapPercent(value: number, min = 8, max = 92) {
  return Math.min(max, Math.max(min, value));
}

function OwnershipStakeMap({
  rows,
  group,
  selectedNodeId,
  stockByTicker,
  roadmapViews,
  groupStockViews,
  onSelectNode
}: {
  rows: OwnershipRow[];
  group: BusinessGroup;
  selectedNodeId: string | null;
  stockByTicker: Map<string, Stock>;
  roadmapViews: RoadmapView[];
  groupStockViews: { node: GovernanceNode; stock?: Stock }[];
  onSelectNode: (nodeId: string) => void;
}) {
  const connectedNodeIds = useMemo(() => new Set(rows.flatMap((row) => [row.edge.from, row.edge.to])), [rows]);
  const connectedNodes = useMemo(() => group.nodes.filter((node) => connectedNodeIds.has(node.id)), [connectedNodeIds, group.nodes]);
  const isDenseMap = rows.length >= 12 || connectedNodes.length >= 10;
  const mapNodes = useMemo(() => {
    if (!connectedNodes.length) return new Map<string, GovernanceNode & { mapX: number; mapY: number; mapLevel: number }>();

    const xs = connectedNodes.map((node) => node.x);
    const ys = connectedNodes.map((node) => node.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const xSpan = Math.max(1, maxX - minX);
    const ySpan = Math.max(1, maxY - minY);

    const arranged = connectedNodes.map((node) => {
      const xRatio = (node.x - minX) / xSpan;
      const mapLevel = node.type === "OWNER"
        ? 0
        : isDenseMap
          ? xRatio < 0.28
            ? 1
            : xRatio < 0.58
              ? 2
              : xRatio < 0.82
                ? 3
                : 4
          : xRatio < 0.36
            ? 1
            : xRatio < 0.68
              ? 2
              : 3;
      const xInset = isDenseMap ? 6 : 10;
      const yTop = isDenseMap ? 15 : 22;
      const yBottom = isDenseMap ? 88 : 78;

      return {
        ...node,
        mapX: clampMapPercent(xInset + xRatio * (100 - xInset * 2), xInset, 100 - xInset),
        mapY: clampMapPercent(yTop + ((node.y - minY) / ySpan) * (yBottom - yTop), yTop, yBottom),
        mapLevel
      };
    });

    const buckets = arranged.reduce((bucketMap, node) => {
      bucketMap.set(node.mapLevel, [...(bucketMap.get(node.mapLevel) ?? []), node]);
      return bucketMap;
    }, new Map<number, typeof arranged>());

    buckets.forEach((nodes) => {
      const sorted = [...nodes].sort((a, b) => a.mapY - b.mapY);
      if (sorted.length < 2) return;

      const top = isDenseMap ? 15 : 22;
      const bottom = isDenseMap ? 88 : 78;
      const minGap = isDenseMap ? (sorted.length > 4 ? 14 : 18) : sorted.length > 5 ? 9 : 15;

      if (minGap * (sorted.length - 1) > bottom - top) {
        const step = (bottom - top) / (sorted.length - 1);
        sorted.forEach((node, index) => {
          node.mapY = top + step * index;
        });
        return;
      }

      let nextY = top;
      sorted.forEach((node) => {
        node.mapY = Math.max(node.mapY, nextY);
        nextY = node.mapY + minGap;
      });

      const overflow = sorted[sorted.length - 1].mapY - bottom;
      if (overflow > 0) {
        sorted.forEach((node) => {
          node.mapY -= overflow;
        });
      }
    });

    return new Map(arranged.map((node) => [node.id, node]));
  }, [connectedNodes, isDenseMap]);
  const isolatedListedNodes = group.nodes.filter((node) => node.listed && !connectedNodeIds.has(node.id));
  const visibleMapNodes = Array.from(mapNodes.values());
  const mapColumns = Array.from(new Set(visibleMapNodes.map((node) => node.mapLevel)))
    .sort((a, b) => a - b)
    .map((level) => {
      const nodes = visibleMapNodes.filter((node) => node.mapLevel === level);
      const x = nodes[0]?.mapX ?? 0;
      const denseLabels = ["지배력", "보유 주체", "핵심 계열", "사업/투자", "외부 확장"];
      const label = isDenseMap
        ? denseLabels[level] ?? "기타"
        : level === 0 ? "지배력" : level === 1 ? "보유 주체" : level === 2 ? "핵심 계열" : "전략/자회사";
      return { level, x, label, count: nodes.length };
    });
  const rootNode = visibleMapNodes.find((node) => node.type === "OWNER") ?? visibleMapNodes[0];
  const holdingNodes = visibleMapNodes.filter((node) => node.type === "HOLDING").length;
  const strategicEdges = rows.filter((row) => row.meta.id === "strategic").length;
  const mainOwnershipRows = rows.slice(0, 3);
  const mainRoadmaps = roadmapViews.slice(0, 2);
  const mainStockViews = groupStockViews.slice(0, 4);
  const denseLaneUsage = new Map<string, number>();

  const getNodeStock = (node: GovernanceNode) => (node.ticker ? stockByTicker.get(node.ticker) : undefined);
  const getNodeConnections = (node: GovernanceNode) => rows.filter((row) => row.edge.from === node.id || row.edge.to === node.id).length;
  const routableRows = rows.filter((row) => mapNodes.has(row.edge.from) && mapNodes.has(row.edge.to));
  const sortNetworkEdges = (edgeRows: OwnershipRow[]) => [...edgeRows].sort((a, b) => {
    const aTo = mapNodes.get(a.edge.to);
    const bTo = mapNodes.get(b.edge.to);
    const aFrom = mapNodes.get(a.edge.from);
    const bFrom = mapNodes.get(b.edge.from);

    return (aTo?.mapLevel ?? 0) - (bTo?.mapLevel ?? 0)
      || (aTo?.mapY ?? 0) - (bTo?.mapY ?? 0)
      || (aTo?.mapX ?? 0) - (bTo?.mapX ?? 0)
      || (aFrom?.mapY ?? 0) - (bFrom?.mapY ?? 0);
  });
  const networkOutgoingByNode = routableRows.reduce((edgeMap, row) => {
    edgeMap.set(row.edge.from, [...(edgeMap.get(row.edge.from) ?? []), row]);
    return edgeMap;
  }, new Map<string, OwnershipRow[]>());
  const networkIncomingByNode = routableRows.reduce((edgeMap, row) => {
    edgeMap.set(row.edge.to, [...(edgeMap.get(row.edge.to) ?? []), row]);
    return edgeMap;
  }, new Map<string, OwnershipRow[]>());
  networkOutgoingByNode.forEach((edgeRows, nodeId) => {
    networkOutgoingByNode.set(nodeId, sortNetworkEdges(edgeRows));
  });
  networkIncomingByNode.forEach((edgeRows, nodeId) => {
    networkIncomingByNode.set(nodeId, sortNetworkEdges(edgeRows).sort((a, b) => {
      const aFrom = mapNodes.get(a.edge.from);
      const bFrom = mapNodes.get(b.edge.from);
      return (aFrom?.mapX ?? 0) - (bFrom?.mapX ?? 0) || (aFrom?.mapY ?? 0) - (bFrom?.mapY ?? 0);
    }));
  });
  const getNetworkEdgeSlot = (row: OwnershipRow, edgeRows: OwnershipRow[]) => {
    const slot = edgeRows.findIndex((candidate) => candidate.edge.id === row.edge.id);
    return slot >= 0 ? slot : 0;
  };
  const getNetworkPortOffset = (row: OwnershipRow, edgeRows: OwnershipRow[], maxSpread: number) => {
    if (edgeRows.length <= 1) return 0;

    const slot = getNetworkEdgeSlot(row, edgeRows);
    return ((slot / (edgeRows.length - 1)) - 0.5) * maxSpread;
  };
  const getNetworkPortY = (
    node: GovernanceNode & { mapX: number; mapY: number; mapLevel: number },
    row: OwnershipRow,
    edgeRows: OwnershipRow[],
    maxSpread: number
  ) => {
    const box = getNodeRouteBox(node.type, true);
    return Number(clampMapPercent(
      node.mapY + getNetworkPortOffset(row, edgeRows, maxSpread),
      node.mapY - box.halfY + 1.8,
      node.mapY + box.halfY - 1.8
    ).toFixed(2));
  };
  const getNetworkLanePeers = (row: OwnershipRow, sameColumn: boolean) => {
    const from = mapNodes.get(row.edge.from);
    const to = mapNodes.get(row.edge.to);
    if (!from || !to) return [row];

    return routableRows.filter((candidate) => {
      const candidateFrom = mapNodes.get(candidate.edge.from);
      const candidateTo = mapNodes.get(candidate.edge.to);
      if (!candidateFrom || !candidateTo) return false;

      const candidateSameColumn = Math.abs(candidateTo.mapX - candidateFrom.mapX) < 8;
      if (candidateSameColumn !== sameColumn) return false;

      return Math.abs(candidateFrom.mapLevel - from.mapLevel) <= 1
        && Math.abs(candidateTo.mapLevel - to.mapLevel) <= 1
        && Math.sign(candidateTo.mapX - candidateFrom.mapX || 1) === Math.sign(to.mapX - from.mapX || 1);
    }).sort((a, b) => {
      const aFrom = mapNodes.get(a.edge.from);
      const bFrom = mapNodes.get(b.edge.from);
      const aTo = mapNodes.get(a.edge.to);
      const bTo = mapNodes.get(b.edge.to);
      return (aFrom?.mapY ?? 0) - (bFrom?.mapY ?? 0)
        || (aTo?.mapY ?? 0) - (bTo?.mapY ?? 0)
        || (aFrom?.mapX ?? 0) - (bFrom?.mapX ?? 0);
    });
  };
  const networkRouteNumber = (value: number) => Number(value.toFixed(2));
  const getNetworkLabelCandidates = (
    segments: Array<{ x1: number; x2: number; y: number }>,
    verticalSegments: Array<{ x: number; y1: number; y2: number }> = []
  ) => {
    const fractions = [0.5, 0.26, 0.74, 0.1, 0.9, 0.02, 0.98, 0.38, 0.62];

    const horizontalCandidates = segments.flatMap((segment) => {
      const left = Math.min(segment.x1, segment.x2);
      const right = Math.max(segment.x1, segment.x2);
      const safeLeft = left + 2.4;
      const safeRight = right - 2.4;
      const candidateLeft = safeRight > safeLeft ? safeLeft : left;
      const candidateRight = safeRight > safeLeft ? safeRight : right;

      return fractions.map((fraction) => ({
        x: networkRouteNumber(candidateLeft + (candidateRight - candidateLeft) * fraction),
        y: networkRouteNumber(segment.y)
      }));
    });
    const verticalCandidates = verticalSegments.flatMap((segment) => {
      const top = Math.min(segment.y1, segment.y2);
      const bottom = Math.max(segment.y1, segment.y2);
      const safeTop = top + 2.4;
      const safeBottom = bottom - 2.4;
      const candidateTop = safeBottom > safeTop ? safeTop : top;
      const candidateBottom = safeBottom > safeTop ? safeBottom : bottom;

      return fractions.map((fraction) => ({
        x: networkRouteNumber(segment.x),
        y: networkRouteNumber(candidateTop + (candidateBottom - candidateTop) * fraction)
      }));
    });

    return [...horizontalCandidates, ...verticalCandidates];
  };
  const edgeRoute = (row: OwnershipRow, index: number) => {
    const from = mapNodes.get(row.edge.from);
    const to = mapNodes.get(row.edge.to);
    if (!from || !to) {
      return { path: "", label: { x: 0, y: 0 }, labelBounds: { from: 0, to: 0 }, end: { x: 0, y: 0 }, direction: 1 };
    }

    const dx = to.mapX - from.mapX;
    const dy = to.mapY - from.mapY;
    const direction = dx >= 0 ? 1 : -1;
    const fromBox = getNodeRouteBox(from.type, isDenseMap);
    const toBox = getNodeRouteBox(to.type, isDenseMap);

    if (isDenseMap) {
      const outgoingRows = networkOutgoingByNode.get(from.id) ?? [row];
      const incomingRows = networkIncomingByNode.get(to.id) ?? [row];
      const portSpread = Math.min(11.5, Math.max(outgoingRows.length, incomingRows.length) * 2.1);
      const sameColumn = Math.abs(dx) < 8;
      const routeSide = sameColumn
        ? from.mapY <= to.mapY ? 1 : -1
        : direction;
      const startX = networkRouteNumber(clampMapPercent(from.mapX + routeSide * (fromBox.halfX + 1.05), 4, 96));
      const endX = networkRouteNumber(clampMapPercent(to.mapX - routeSide * (toBox.halfX + 1.1), 4, 96));
      const startY = getNetworkPortY(from, row, outgoingRows, portSpread);
      const endY = getNetworkPortY(to, row, incomingRows, portSpread);
      const lanePeers = getNetworkLanePeers(row, sameColumn);
      const laneSlot = getNetworkEdgeSlot(row, lanePeers);
      const laneCenterOffset = (laneSlot - (lanePeers.length - 1) * 0.5) * 1.35;

      if (sameColumn) {
        const laneX = networkRouteNumber(clampMapPercent(
          from.mapX + routeSide * (fromBox.halfX + 14 + laneSlot * 3),
          5,
          95
        ));
        const labelX = networkRouteNumber(startX + (laneX - startX) * 0.54);
        const labelCandidates = getNetworkLabelCandidates([
          { x1: startX, x2: laneX, y: startY },
          { x1: laneX, x2: endX, y: endY }
        ], [
          { x: laneX, y1: startY, y2: endY }
        ]);

        return {
          path: `M ${startX} ${startY} H ${laneX} V ${endY} H ${endX}`,
          label: { x: labelX, y: startY },
          labelCandidates,
          labelBounds: { from: Math.min(startX, laneX), to: Math.max(startX, laneX) },
          end: { x: endX, y: endY },
          direction: -routeSide
        };
      }

      const midpointX = startX + (endX - startX) * 0.5;
      const laneX = networkRouteNumber(clampMapPercent(midpointX + laneCenterOffset, 8, 92));
      const firstSegmentLength = Math.abs(laneX - startX);
      const secondSegmentLength = Math.abs(endX - laneX);
      const labelOnFirstSegment = firstSegmentLength >= secondSegmentLength;
      const labelStartX = labelOnFirstSegment ? startX : laneX;
      const labelEndX = labelOnFirstSegment ? laneX : endX;
      const labelY = labelOnFirstSegment ? startY : endY;
      const labelCandidates = getNetworkLabelCandidates([
        { x1: startX, x2: laneX, y: startY },
        { x1: laneX, x2: endX, y: endY }
      ], [
        { x: laneX, y1: startY, y2: endY }
      ]);

      return {
        path: `M ${startX} ${startY} H ${laneX} V ${endY} H ${endX}`,
        label: {
          x: networkRouteNumber(labelStartX + (labelEndX - labelStartX) * 0.5),
          y: networkRouteNumber(labelY)
        },
        labelCandidates,
        labelBounds: { from: Math.min(labelStartX, labelEndX), to: Math.max(labelStartX, labelEndX) },
        end: { x: endX, y: endY },
        direction: routeSide
      };
    }

    const startX = clampMapPercent(from.mapX + direction * (fromBox.halfX + 0.8), 5, 95);
    const startY = from.mapY;
    const endX = clampMapPercent(to.mapX - direction * (toBox.halfX + 1.2), 5, 95);
    const endY = to.mapY;
    const laneOffset = ((index % 3) - 1) * 1.6;
    const elbowX = clampMapPercent(startX + (endX - startX) * 0.56 + laneOffset, 6, 94);

    if (Math.abs(dy) < 4) {
      const approachX = clampMapPercent(endX - direction * 1.1, 5, 95);
      return {
        path: `M ${startX} ${startY} H ${approachX} H ${endX}`,
        label: { x: startX + (endX - startX) * 0.5, y: startY },
        labelBounds: { from: Math.min(startX, endX), to: Math.max(startX, endX) },
        end: { x: endX, y: endY },
        direction
      };
    }

    const firstLength = Math.abs(elbowX - startX);
    const secondLength = Math.abs(endX - elbowX);
    const label = firstLength >= secondLength
      ? { x: startX + (elbowX - startX) * 0.5, y: startY }
      : { x: elbowX + (endX - elbowX) * 0.5, y: endY };

    return {
      path: `M ${startX} ${startY} H ${elbowX} V ${endY} H ${endX}`,
      label,
      labelBounds: { from: Math.min(startX, elbowX, endX), to: Math.max(startX, elbowX, endX) },
      end: { x: endX, y: endY },
      direction
    };
  };
  const routedRows = rows.map((row, index) => ({ row, route: edgeRoute(row, index) }));
  const placedEdgeLabels: Array<{ x: number; y: number }> = [];
  const labelCollidesWithNode = (label: { x: number; y: number }) => visibleMapNodes.some((node) => {
    const box = getNodeCollisionBox(node.type, isDenseMap);
    const labelHalfX = isDenseMap ? 2.6 : 3.8;
    const labelHalfY = isDenseMap ? 2.25 : 3.8;
    return Math.abs(label.x - node.mapX) < box.halfX + labelHalfX && Math.abs(label.y - node.mapY) < box.halfY + labelHalfY;
  });
  const labelCollidesWithLabel = (label: { x: number; y: number }) => placedEdgeLabels.some((placed) => (
    Math.abs(placed.x - label.x) < (isDenseMap ? 5.4 : 9.5)
    && Math.abs(placed.y - label.y) < (isDenseMap ? 4.6 : 8.5)
  ));
  const labelCollisionScore = (label: { x: number; y: number }, anchor: { x: number; y: number }) => {
    const labelHits = placedEdgeLabels.filter((placed) => (
      Math.abs(placed.x - label.x) < (isDenseMap ? 5.4 : 9.5)
      && Math.abs(placed.y - label.y) < (isDenseMap ? 4.6 : 8.5)
    )).length;
    const nodeHits = visibleMapNodes.filter((node) => {
      const box = getNodeCollisionBox(node.type, isDenseMap);
      const labelHalfX = isDenseMap ? 2.6 : 3.8;
      const labelHalfY = isDenseMap ? 2.25 : 3.8;
      return Math.abs(label.x - node.mapX) < box.halfX + labelHalfX && Math.abs(label.y - node.mapY) < box.halfY + labelHalfY;
    }).length;

    return labelHits * 1200 + nodeHits * 900 + Math.abs(label.x - anchor.x) * 0.35 + Math.abs(label.y - anchor.y) * 0.5;
  };
  const routedRowsWithLabels = routedRows.map((item, index) => {
    if (isDenseMap) {
      const rawCandidates = [
        item.route.label,
        ...("labelCandidates" in item.route ? item.route.labelCandidates ?? [] : [])
      ];
      const candidates = Array.from(new Map(rawCandidates.map((candidate) => [
        `${candidate.x}-${candidate.y}`,
        candidate
      ])).values());
      let label = item.route.label;
      let bestLabel = label;
      let bestScore = Number.POSITIVE_INFINITY;

      for (const candidate of candidates) {
        const score = labelCollisionScore(candidate, item.route.label);
        if (score < bestScore) {
          bestScore = score;
          bestLabel = candidate;
        }

        if (!labelCollidesWithLabel(candidate) && !labelCollidesWithNode(candidate)) {
          label = candidate;
          break;
        }
      }

      if (label === item.route.label) {
        label = bestLabel;
      }

      placedEdgeLabels.push(label);
      return {
        ...item,
        route: {
          ...item.route,
          label
        },
        labelKey: `${item.row.edge.id}-label-${index}`
      };
    }

    let label = { ...item.route.label };
    const xMin = Math.min(item.route.labelBounds.from, item.route.labelBounds.to) + (isDenseMap ? 3 : 4);
    const xMax = Math.max(item.route.labelBounds.from, item.route.labelBounds.to) - (isDenseMap ? 3 : 4);
    const safeXMin = Math.min(xMin, xMax);
    const safeXMax = Math.max(xMin, xMax);
    const xSpan = Math.max(0, safeXMax - safeXMin);
    const xFractions = isDenseMap ? [0.5, 0.24, 0.76, 0.12, 0.88, 0.36, 0.64, 0.04, 0.96] : [0.5, 0.3, 0.7, 0.1, 0.9];
    const xCandidates = Array.from(new Set([
      item.route.label.x,
      ...xFractions.map((fraction) => safeXMin + xSpan * fraction)
    ].map((value) => Number(clampMapPercent(value, safeXMin, safeXMax).toFixed(2)))))
      .sort((a, b) => Math.abs(a - item.route.label.x) - Math.abs(b - item.route.label.x));
    const yOffsets = isDenseMap ? [0, 5.5, -5.5, 11, -11, 16.5, -16.5, 22, -22, 28, -28, 34, -34] : [0, 8.5, -8.5, 17, -17];
    let bestLabel = label;
    let bestScore = Number.POSITIVE_INFINITY;
    let placed = false;

    for (const yOffset of yOffsets) {
      const nextY = clampMapPercent(item.route.label.y + yOffset, isDenseMap ? 12 : 14, isDenseMap ? 89 : 86);
      for (const candidateX of xCandidates) {
        const candidate = { x: candidateX, y: nextY };
        const score = labelCollisionScore(candidate, item.route.label);
        if (score < bestScore) {
          bestScore = score;
          bestLabel = candidate;
        }
        if (!labelCollidesWithLabel(candidate) && !labelCollidesWithNode(candidate)) {
          label = candidate;
          placed = true;
          break;
        }
      }

      if (placed) {
        break;
      }
    }

    if (!placed) {
      label = bestLabel;
    }

    placedEdgeLabels.push(label);
    return {
      ...item,
      route: {
        ...item.route,
        label
      },
      labelKey: `${item.row.edge.id}-label-${index}`
    };
  });
  const outgoingCountByNode = rows.reduce((countMap, row) => {
    countMap.set(row.edge.from, (countMap.get(row.edge.from) ?? 0) + 1);
    return countMap;
  }, new Map<string, number>());
  const coreNodeIds = new Set(
    visibleMapNodes
      .filter((node) => node.type === "OWNER" || node.type === "HOLDING" || (outgoingCountByNode.get(node.id) ?? 0) >= 2)
      .map((node) => node.id)
  );
  const coreNodes = visibleMapNodes
    .filter((node) => coreNodeIds.has(node.id))
    .sort((a, b) => a.x - b.x || a.y - b.y);
  const coreRows = rows.filter((row) => coreNodeIds.has(row.edge.from) && coreNodeIds.has(row.edge.to));
  const forwardCoreRows = coreRows
    .filter((row) => {
      const holder = mapNodes.get(row.edge.from);
      const asset = mapNodes.get(row.edge.to);
      return holder && asset && asset.x >= holder.x;
    })
    .sort((a, b) => {
      const holderA = mapNodes.get(a.edge.from);
      const holderB = mapNodes.get(b.edge.from);
      return (holderA?.x ?? 0) - (holderB?.x ?? 0);
    });
  const returnCoreRows = coreRows.filter((row) => !forwardCoreRows.some((forwardRow) => forwardRow.edge.id === row.edge.id));
  const expansionNodes = visibleMapNodes
    .filter((node) => !coreNodeIds.has(node.id))
    .sort((a, b) => a.x - b.x || a.y - b.y);
  const expansionCards = expansionNodes.map((node) => ({
    node,
    stock: getNodeStock(node),
    inboundRows: rows
      .filter((row) => row.edge.to === node.id)
      .sort((a, b) => b.edge.ownershipPercent - a.edge.ownershipPercent)
  }));
  const multiHolderTargets = expansionCards.filter((card) => card.inboundRows.length > 1).length;
  const flowStages = mapColumns.map((column) => ({
    ...column,
    nodes: visibleMapNodes
      .filter((node) => node.mapLevel === column.level)
      .sort((a, b) => a.mapY - b.mapY || a.mapX - b.mapX)
  }));
  const ownershipFlowGroups = visibleMapNodes
    .map((holder) => ({
      holder,
      holderStock: getNodeStock(holder),
      rows: rows
        .filter((row) => row.edge.from === holder.id)
        .sort((a, b) => b.edge.ownershipPercent - a.edge.ownershipPercent || a.asset.name.localeCompare(b.asset.name))
    }))
    .filter((item) => item.rows.length)
    .sort((a, b) => a.holder.mapLevel - b.holder.mapLevel || a.holder.mapY - b.holder.mapY || a.holder.name.localeCompare(b.holder.name));
  const ownerPyramidNodes = visibleMapNodes.filter((node) => node.type === "OWNER");
  const holdingPyramidNodes = visibleMapNodes.filter((node) => node.type === "HOLDING");
  const coreBusinessPyramidNodes = visibleMapNodes
    .filter((node) => coreNodeIds.has(node.id) && node.type !== "OWNER" && node.type !== "HOLDING")
    .sort((a, b) => a.y - b.y || a.x - b.x);
  const firstExpansionPyramidNodes = visibleMapNodes
    .filter((node) => !coreNodeIds.has(node.id) && node.mapLevel < 4)
    .sort((a, b) => a.y - b.y || a.x - b.x);
  const secondExpansionPyramidNodes = visibleMapNodes
    .filter((node) => !coreNodeIds.has(node.id) && node.mapLevel >= 4)
    .sort((a, b) => a.y - b.y || a.x - b.x);
  const pyramidRows = [
    { id: "control", label: "지배력", y: 12, nodes: ownerPyramidNodes.length ? ownerPyramidNodes : rootNode ? [rootNode] : [] },
    { id: "holding", label: "지주·중간축", y: 29, nodes: holdingPyramidNodes },
    { id: "core", label: "핵심 사업축", y: 47, nodes: coreBusinessPyramidNodes },
    { id: "growth", label: "사업 계열", y: 66, nodes: firstExpansionPyramidNodes },
    { id: "outer", label: "외부 확장", y: 85, nodes: secondExpansionPyramidNodes }
  ].filter((row) => row.nodes.length);
  const pyramidPlacedNodes = pyramidRows.flatMap((row) => {
    const count = row.nodes.length;
    const gap = count <= 1 ? 0 : Math.min(22, 76 / (count - 1));
    const startX = 50 - gap * (count - 1) * 0.5;

    return row.nodes.map((node, index) => ({
      ...node,
      pyramidX: count <= 1 ? 50 : startX + gap * index,
      pyramidY: row.y,
      pyramidRow: row.id
    }));
  });
  const pyramidNodeMap = new Map(pyramidPlacedNodes.map((node) => [node.id, node]));
  const pyramidDrawableRows = rows.filter((row) => pyramidNodeMap.has(row.edge.from) && pyramidNodeMap.has(row.edge.to));
  const pyramidNodeRowOrder = new Map(pyramidRows.map((row, index) => [row.id, index]));
  const getPyramidNodeSortValue = (nodeId: string, axis: "source" | "target") => {
    const node = pyramidNodeMap.get(nodeId);
    if (!node) return 0;

    const rowOrder = pyramidNodeRowOrder.get(node.pyramidRow) ?? 0;
    return rowOrder * 1000 + (axis === "source" ? node.pyramidX : node.pyramidX + node.pyramidY * 0.01);
  };
  const sortPyramidEdges = (edgeRows: OwnershipRow[]) => [...edgeRows].sort((a, b) => {
    const aTo = pyramidNodeMap.get(a.edge.to);
    const bTo = pyramidNodeMap.get(b.edge.to);
    const aFrom = pyramidNodeMap.get(a.edge.from);
    const bFrom = pyramidNodeMap.get(b.edge.from);

    return (aTo?.pyramidY ?? 0) - (bTo?.pyramidY ?? 0)
      || (aTo?.pyramidX ?? 0) - (bTo?.pyramidX ?? 0)
      || (aFrom?.pyramidY ?? 0) - (bFrom?.pyramidY ?? 0)
      || (aFrom?.pyramidX ?? 0) - (bFrom?.pyramidX ?? 0);
  });
  const pyramidOutgoingByNode = pyramidDrawableRows.reduce((map, row) => {
    map.set(row.edge.from, [...(map.get(row.edge.from) ?? []), row]);
    return map;
  }, new Map<string, OwnershipRow[]>());
  const pyramidIncomingByNode = pyramidDrawableRows.reduce((map, row) => {
    map.set(row.edge.to, [...(map.get(row.edge.to) ?? []), row]);
    return map;
  }, new Map<string, OwnershipRow[]>());
  pyramidOutgoingByNode.forEach((edgeRows, nodeId) => {
    pyramidOutgoingByNode.set(nodeId, sortPyramidEdges(edgeRows));
  });
  pyramidIncomingByNode.forEach((edgeRows, nodeId) => {
    pyramidIncomingByNode.set(
      nodeId,
      [...edgeRows].sort((a, b) => getPyramidNodeSortValue(a.edge.from, "source") - getPyramidNodeSortValue(b.edge.from, "source"))
    );
  });
  const getPyramidEdgeSlot = (row: OwnershipRow, edgeRows: OwnershipRow[]) => {
    const slot = edgeRows.findIndex((candidate) => candidate.edge.id === row.edge.id);
    return slot >= 0 ? slot : 0;
  };
  const getPyramidPortOffset = (row: OwnershipRow, edgeRows: OwnershipRow[], maxSpread: number) => {
    if (edgeRows.length <= 1) return 0;

    const slot = getPyramidEdgeSlot(row, edgeRows);
    return ((slot / (edgeRows.length - 1)) - 0.5) * maxSpread;
  };
  const getPyramidPortX = (
    node: (typeof pyramidPlacedNodes)[number],
    row: OwnershipRow,
    edgeRows: OwnershipRow[],
    maxSpread: number
  ) => {
    const box = getNodeRouteBox(node.type, true);
    return clampMapPercent(
      node.pyramidX + getPyramidPortOffset(row, edgeRows, maxSpread),
      node.pyramidX - box.halfX + 1.7,
      node.pyramidX + box.halfX - 1.7
    );
  };
  const getPyramidPortY = (
    node: (typeof pyramidPlacedNodes)[number],
    row: OwnershipRow,
    edgeRows: OwnershipRow[],
    maxSpread: number
  ) => {
    const box = getNodeRouteBox(node.type, true);
    return clampMapPercent(
      node.pyramidY + getPyramidPortOffset(row, edgeRows, maxSpread),
      node.pyramidY - box.halfY + 1.8,
      node.pyramidY + box.halfY - 1.8
    );
  };
  const getPyramidLanePeers = (row: OwnershipRow, mode: "down" | "same" | "up") => {
    const from = pyramidNodeMap.get(row.edge.from);
    const to = pyramidNodeMap.get(row.edge.to);
    if (!from || !to) return [row];

    return pyramidDrawableRows.filter((candidate) => {
      const candidateFrom = pyramidNodeMap.get(candidate.edge.from);
      const candidateTo = pyramidNodeMap.get(candidate.edge.to);
      if (!candidateFrom || !candidateTo) return false;

      const candidateDy = candidateTo.pyramidY - candidateFrom.pyramidY;
      const candidateMode = candidateDy > 3 ? "down" : Math.abs(candidateDy) <= 3 ? "same" : "up";
      return candidateMode === mode
        && Math.abs(candidateFrom.pyramidY - from.pyramidY) < 1
        && Math.abs(candidateTo.pyramidY - to.pyramidY) < 1;
    }).sort((a, b) => {
      const aFrom = pyramidNodeMap.get(a.edge.from);
      const bFrom = pyramidNodeMap.get(b.edge.from);
      const aTo = pyramidNodeMap.get(a.edge.to);
      const bTo = pyramidNodeMap.get(b.edge.to);
      return (aFrom?.pyramidX ?? 0) - (bFrom?.pyramidX ?? 0)
        || (aTo?.pyramidX ?? 0) - (bTo?.pyramidX ?? 0)
        || a.edge.ownershipPercent - b.edge.ownershipPercent;
    });
  };
  const routeNumber = (value: number) => Number(value.toFixed(2));
  const pyramidRoute = (row: OwnershipRow, index: number) => {
    const from = pyramidNodeMap.get(row.edge.from);
    const to = pyramidNodeMap.get(row.edge.to);
    if (!from || !to) {
      return { path: "", label: { x: 0, y: 0 }, end: { x: 0, y: 0 }, endDir: "down" as const };
    }

    const fromBox = getNodeRouteBox(from.type, true);
    const toBox = getNodeRouteBox(to.type, true);
    const dy = to.pyramidY - from.pyramidY;
    const dx = to.pyramidX - from.pyramidX;
    const outgoingRows = pyramidOutgoingByNode.get(from.id) ?? [row];
    const incomingRows = pyramidIncomingByNode.get(to.id) ?? [row];

    if (dy > 3) {
      const startY = routeNumber(from.pyramidY + fromBox.halfY + 0.65);
      const endY = routeNumber(to.pyramidY - toBox.halfY - 0.85);
      const startX = routeNumber(getPyramidPortX(from, row, outgoingRows, Math.min(9.8, outgoingRows.length * 2.7)));
      const endX = routeNumber(getPyramidPortX(to, row, incomingRows, Math.min(9.8, incomingRows.length * 2.7)));
      const lanePeers = getPyramidLanePeers(row, "down");
      const laneSlot = getPyramidEdgeSlot(row, lanePeers);
      const laneRatio = lanePeers.length <= 1 ? 0.5 : (laneSlot + 0.5) / lanePeers.length;
      const laneMin = startY + 2.8;
      const laneMax = endY - 2.8;
      const laneY = routeNumber(
        laneMax > laneMin
          ? laneMin + (laneMax - laneMin) * laneRatio
          : startY + (endY - startY) * 0.5 + (laneSlot - (lanePeers.length - 1) / 2) * 1.15
      );
      const isNearlyVertical = Math.abs(endX - startX) < 4.8;
      const labelX = routeNumber(isNearlyVertical ? startX : startX + (endX - startX) * 0.5);

      return {
        path: isNearlyVertical
          ? `M ${startX} ${startY} V ${endY}`
          : `M ${startX} ${startY} V ${laneY} H ${endX} V ${endY}`,
        label: { x: labelX, y: routeNumber(isNearlyVertical ? startY + (endY - startY) * 0.5 : laneY) },
        end: { x: endX, y: endY },
        endDir: "down" as const
      };
    }

    if (Math.abs(dy) <= 3) {
      const direction = dx >= 0 ? 1 : -1;
      const sameRowPeers = getPyramidLanePeers(row, "same");
      const laneSlot = getPyramidEdgeSlot(row, sameRowPeers);
      const laneSide = laneSlot % 2 === 0 ? 1 : -1;
      const laneStep = Math.floor(laneSlot / 2);
      const startX = routeNumber(from.pyramidX + direction * (fromBox.halfX + 0.85));
      const endX = routeNumber(to.pyramidX - direction * (toBox.halfX + 0.95));
      const startY = routeNumber(getPyramidPortY(from, row, outgoingRows, Math.min(9.2, outgoingRows.length * 2.3)));
      const endY = routeNumber(getPyramidPortY(to, row, incomingRows, Math.min(9.2, incomingRows.length * 2.3)));
      const laneY = routeNumber(clampMapPercent(from.pyramidY + laneSide * (fromBox.halfY + 3.8 + laneStep * 3.1), 8, 92));

      return {
        path: `M ${startX} ${startY} V ${laneY} H ${endX} V ${endY}`,
        label: { x: routeNumber(startX + (endX - startX) * 0.5), y: laneY },
        end: { x: endX, y: endY },
        endDir: direction >= 0 ? "right" as const : "left" as const
      };
    }

    const routeSide = from.pyramidX >= to.pyramidX ? -1 : 1;
    const upwardPeers = getPyramidLanePeers(row, "up");
    const laneSlot = getPyramidEdgeSlot(row, upwardPeers);
    const startX = routeNumber(from.pyramidX + routeSide * (fromBox.halfX + 0.9));
    const endX = routeNumber(to.pyramidX - routeSide * (toBox.halfX + 0.95));
    const startY = routeNumber(getPyramidPortY(from, row, outgoingRows, Math.min(9.2, outgoingRows.length * 2.3)));
    const endY = routeNumber(getPyramidPortY(to, row, incomingRows, Math.min(9.2, incomingRows.length * 2.3)));
    const laneX = clampMapPercent(
      routeSide < 0
        ? Math.min(from.pyramidX, to.pyramidX) - 10.5 - laneSlot * 3.2
        : Math.max(from.pyramidX, to.pyramidX) + 10.5 + laneSlot * 3.2,
      5,
      95
    );

    return {
      path: `M ${startX} ${startY} H ${routeNumber(laneX)} V ${endY} H ${endX}`,
      label: { x: routeNumber(laneX), y: routeNumber(startY + (endY - startY) * 0.5) },
      end: { x: endX, y: endY },
      endDir: routeSide < 0 ? "right" as const : "left" as const
    };
  };
  const pyramidRoutedRowsWithLabels = pyramidDrawableRows.map((row, index) => ({
    row,
    route: pyramidRoute(row, index),
    labelKey: `${row.edge.id}-pyramid-label-${index}`
  }));

  return (
    <div className="rounded-lg border border-radar-line bg-white p-5 shadow-card dark:border-slate-700 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-black text-radar-ink">{group.name} 지배구조 플로우 보드</h3>
          <p className="mt-1 text-sm font-bold text-slate-500">
            복잡한 선 대신 계열 단계와 보유 관계를 같은 화면에서 읽습니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {relationLegend.map((item) => (
            <span key={item.id} className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-black text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <span className={cn("size-2.5 rounded-full", item.color)} />
              {item.label}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-3 text-xs font-bold text-slate-500 max-xl:grid-cols-2 max-md:grid-cols-1">
        <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-950">
          기준점 <strong className="ml-1 text-radar-ink">{rootNode?.name ?? "-"}</strong>
        </div>
        <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-950">
          지주·중간축 <strong className="ml-1 text-radar-ink">{holdingNodes}개</strong>
        </div>
        <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-950">
          보유 관계 <strong className="ml-1 text-radar-ink">{rows.length}개</strong>
        </div>
        <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-950">
          전략투자 <strong className="ml-1 text-radar-ink">{strategicEdges}개</strong>
        </div>
      </div>

      <div data-governance-flow-board={group.id} className="mt-4 overflow-hidden rounded-2xl border border-radar-line bg-slate-50 dark:border-slate-700 dark:bg-slate-950">
          <section className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h4 className="text-base font-black text-radar-ink">계열 단계 보기</h4>
                <p className="mt-1 text-xs font-bold text-slate-500">오너·지주·핵심 계열·사업/투자 축을 한 레일 안에서 이어 봅니다.</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {flowStages.map((stage) => (
                  <span key={stage.level} className="rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-slate-500 dark:bg-slate-900 dark:text-slate-300">
                    {stage.label} {stage.nodes.length}
                  </span>
                ))}
              </div>
            </div>

            <div
              className="mt-4 grid items-start gap-2.5"
              style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 180px), 1fr))" }}
            >
              {flowStages.map((stage) => (
                <div key={stage.level} className="min-w-0 rounded-xl border border-radar-line bg-white/80 p-2.5 dark:border-slate-800 dark:bg-slate-900/80">
                  <div className="flex items-center justify-between gap-2 border-b border-radar-line pb-2 dark:border-slate-800">
                    <p className="text-xs font-black text-radar-ink">{stage.label}</p>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-500 dark:bg-slate-800 dark:text-slate-300">{stage.nodes.length}</span>
                  </div>
                  <div className="mt-2 space-y-1.5">
                    {stage.nodes.map((node) => {
                      const stock = getNodeStock(node);
                      const inboundCount = rows.filter((row) => row.edge.to === node.id).length;
                      const outboundCount = rows.filter((row) => row.edge.from === node.id).length;
                      const isSelected = selectedNodeId === node.id;

                      return (
                        <button
                          key={node.id}
                          type="button"
                          onClick={() => onSelectNode(node.id)}
                          className={cn(
                            "w-full rounded-lg border px-2.5 py-2 text-left transition hover:border-blue-400 hover:bg-blue-50/40 dark:hover:border-blue-500/60",
                            getNodeToneClass(node.type),
                            isSelected && "border-blue-500 ring-2 ring-blue-200 dark:ring-blue-500/30"
                          )}
                        >
                          <span className="flex items-start justify-between gap-2">
                            <span className="min-w-0">
                              <span className="block text-[10px] font-black text-slate-500 dark:text-slate-300">{nodeTypeLabel(node.type)}</span>
                              <span className="mt-0.5 block break-keep text-sm font-black leading-5">{node.name}</span>
                            </span>
                            <span className="shrink-0 rounded-full bg-white/80 px-1.5 py-0.5 text-[10px] font-black text-slate-600 dark:bg-slate-950/80 dark:text-slate-300">
                              {inboundCount}/{outboundCount}
                            </span>
                          </span>
                          <span className="mt-1 flex items-start justify-between gap-2">
                            <span className="min-w-0 break-keep text-[10px] font-bold leading-4 text-slate-500 dark:text-slate-300">
                              {node.ticker ? `${node.ticker} · ${node.market ?? ""}` : node.market ?? "비상장"}
                            </span>
                            {stock ? (
                              <span className={cn("shrink-0 text-[10px] font-black", getMarketMoveTextClass(getMove(stock)))}>
                                {formatPercent(getMove(stock), 1)}
                              </span>
                            ) : null}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="border-t border-radar-line p-4 dark:border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h4 className="text-base font-black text-radar-ink">보유 관계 읽기</h4>
                <p className="mt-1 text-xs font-bold text-slate-500">보유 주체별 지분율과 지분가치를 한 장부처럼 이어서 봅니다.</p>
              </div>
              <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-slate-500 dark:bg-slate-900 dark:text-slate-300">
                {ownershipFlowGroups.length}개 주체
              </span>
            </div>

            <div className="mt-4 space-y-2.5">
              {ownershipFlowGroups.map(({ holder, rows: holderRows }) => (
                <article key={holder.id} className="grid overflow-hidden rounded-xl border border-radar-line bg-white dark:border-slate-800 dark:bg-slate-900 lg:grid-cols-[220px_minmax(0,1fr)]">
                  <div className="flex flex-wrap items-start justify-between gap-2 border-b border-radar-line px-3 py-2.5 dark:border-slate-800 lg:border-b-0 lg:border-r">
                    <div className="min-w-0">
                      <p className="break-keep text-sm font-black leading-5 text-radar-ink">{holder.name}</p>
                      <p className="mt-0.5 text-[11px] font-bold text-slate-500">
                        {nodeTypeLabel(holder.type)} · {holder.ticker ? `${holder.ticker} · ${holder.market ?? ""}` : holder.market ?? "비상장"}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[11px] font-black text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {holderRows.length}개 보유
                    </span>
                  </div>

                  <div className="divide-y divide-radar-line dark:divide-slate-800">
                    {holderRows.map((row) => (
                      <button
                        key={row.edge.id}
                        type="button"
                        onClick={() => onSelectNode(row.asset.id)}
                        className="grid w-full grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 px-3 py-2.5 text-left transition hover:bg-blue-50/50 dark:hover:bg-blue-500/10 max-lg:grid-cols-[minmax(0,1fr)_auto]"
                      >
                        <span className="min-w-0">
                          <span className="flex min-w-0 flex-wrap items-center gap-1.5">
                            <span className="break-keep text-xs font-black leading-5 text-radar-ink">{row.asset.name}</span>
                            <span className={cn("inline-flex items-center gap-1 rounded-full border bg-white px-1.5 py-0.5 text-[10px] font-black dark:bg-slate-950", row.meta.border, row.meta.text)}>
                              <span className={cn("size-1.5 rounded-full", row.meta.color)} />
                              {row.meta.label}
                            </span>
                          </span>
                          <span className="mt-0.5 block break-keep text-[10px] font-bold leading-4 text-slate-500">
                            {row.asset.ticker ? `${row.asset.ticker} · ${row.asset.role}` : row.asset.role}
                          </span>
                        </span>
                        <span className="text-right">
                          <span className="block text-sm font-black text-radar-ink">{formatOwnership(row.edge.ownershipPercent)}</span>
                          <span className="block text-[10px] font-bold text-slate-500 lg:hidden">{row.estimatedStakeValue ? formatCapValue(row.estimatedStakeValue, row.assetStock?.market) : "미산정"}</span>
                        </span>
                        <span className="hidden min-w-[76px] text-right text-[10px] font-bold text-slate-500 lg:block">
                          {row.estimatedStakeValue ? formatCapValue(row.estimatedStakeValue, row.assetStock?.market) : "미산정"}
                        </span>
                      </button>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>

      <section data-governance-summary-strip={group.id} className="mt-4 overflow-hidden rounded-xl border border-radar-line bg-slate-50 dark:border-slate-700 dark:bg-slate-950">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-radar-line px-4 py-3 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <Network size={17} className="text-blue-600" />
              <h4 className="font-black text-radar-ink">그룹 구조 압축 보기</h4>
            </div>
            <p className="mt-1 text-xs font-bold leading-5 text-slate-500">보유 관계가 사업축과 시세로 어떻게 이어지는지 같이 봅니다.</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-right text-[11px] font-black text-slate-500 max-md:w-full max-md:text-left">
            <span className="rounded-lg bg-white px-2.5 py-1.5 dark:bg-slate-900">보유 관계 {rows.length}개</span>
            <span className="rounded-lg bg-white px-2.5 py-1.5 dark:bg-slate-900">사업축 {roadmapViews.length}개</span>
            <span className="rounded-lg bg-white px-2.5 py-1.5 dark:bg-slate-900">종목 {groupStockViews.length}개</span>
          </div>
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)_minmax(0,0.85fr)] divide-x divide-radar-line bg-white/70 dark:divide-slate-800 dark:bg-slate-900/60 max-2xl:grid-cols-1 max-2xl:divide-x-0 max-2xl:divide-y">
          <div className="min-w-0 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-black text-radar-ink">지분 핵심축</p>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-black text-slate-600 dark:bg-slate-800 dark:text-slate-300">대표 {mainOwnershipRows.length}개</span>
              </div>
              <div className="mt-3 space-y-2">
                {mainOwnershipRows.map((row) => (
                  <button
                    key={row.edge.id}
                    type="button"
                    onClick={() => onSelectNode(row.asset.id)}
                    className="w-full rounded-lg border border-radar-line bg-white px-3 py-2 text-left transition hover:border-blue-300 hover:bg-blue-50/40 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-blue-500/60"
                  >
                    <span className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                      <span className="flex min-w-0 flex-wrap items-center gap-1.5 break-keep text-xs font-black leading-5 text-radar-ink">
                        <span>{row.holder.name}</span>
                        <ArrowRight size={12} className="shrink-0 text-slate-400" />
                        <span>{row.asset.name}</span>
                      </span>
                      <span className="shrink-0 text-xs font-black text-radar-ink">{formatOwnership(row.edge.ownershipPercent)}</span>
                    </span>
                    <span className="mt-1 flex min-w-0 items-center justify-between gap-2">
                      <span className={cn("inline-flex items-center gap-1 rounded-full border bg-white px-1.5 py-0.5 text-[10px] font-black dark:bg-slate-950", row.meta.border, row.meta.text)}>
                        <span className={cn("size-1.5 rounded-full", row.meta.color)} />
                        {row.meta.label}
                      </span>
                      <span className="text-right text-[10px] font-bold text-slate-500">{row.estimatedStakeValue ? formatCapValue(row.estimatedStakeValue, row.assetStock?.market) : "미산정"}</span>
                    </span>
                  </button>
                ))}
              </div>
          </div>

          <div className="min-w-0 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-black text-radar-ink">사업/투자 축</p>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-black text-slate-600 dark:bg-slate-800 dark:text-slate-300">대표 {mainRoadmaps.length}개</span>
              </div>
              <div className="mt-3 space-y-2">
                {mainRoadmaps.map((item) => (
                  <article key={item.id} className="rounded-lg border border-radar-line bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-950">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="break-keep text-xs font-black leading-5 text-radar-ink">{item.title}</p>
                        <p className="mt-0.5 break-keep text-[11px] font-bold leading-4 text-slate-500">{item.theme}</p>
                      </div>
                      <span className={cn("shrink-0 text-xs font-black", getMarketMoveTextClass(item.avgMove))}>
                        {item.relatedStocks.length ? formatPercent(item.avgMove, 1) : "-"}
                      </span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {item.leadingCompanies.slice(0, 2).map((company) => (
                        <span key={company} className="rounded-md bg-white px-1.5 py-0.5 text-[10px] font-black text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                          {company}
                        </span>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
          </div>

          <div className="min-w-0 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-black text-radar-ink">연결 시세</p>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-black text-slate-600 dark:bg-slate-800 dark:text-slate-300">대표 {mainStockViews.length}개</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {mainStockViews.map(({ node, stock }) => (
                  <button
                    key={node.id}
                    type="button"
                    onClick={() => onSelectNode(node.id)}
                    className="rounded-lg border border-radar-line bg-white px-3 py-2 text-left hover:border-blue-300 hover:bg-blue-50/40 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-blue-500/60"
                  >
                    <p className="break-keep text-[11px] font-black leading-4 text-radar-ink">{node.name}</p>
                    <p className="mt-0.5 text-[10px] font-bold text-slate-500">{formatPrice(stock)}</p>
                    <p className={cn("mt-0.5 text-[11px] font-black", getMarketMoveTextClass(getMove(stock)))}>
                      {formatPercent(getMove(stock), 1)}
                    </p>
                  </button>
                ))}
              </div>
          </div>
        </div>
      </section>

      {isolatedListedNodes.length ? (
        <section className="mt-4 rounded-xl border border-dashed border-radar-line bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950">
          <div className="flex items-center gap-2">
            <GripHorizontal size={18} className="text-slate-500" />
            <h4 className="font-black text-radar-ink">보유 관계 없이 별도 관찰할 상장 계열사</h4>
          </div>
          <p className="mt-1 text-xs font-bold text-slate-500">
            현재 입력된 보유 지분 관계가 없더라도 그룹 내 상장 계열사는 빠짐없이 따로 보여줍니다.
          </p>
          <div className="mt-3 grid grid-cols-4 items-start gap-2 max-xl:grid-cols-2 max-md:grid-cols-1">
            {isolatedListedNodes.map((node) => (
              <button
                key={node.id}
                type="button"
                onClick={() => onSelectNode(node.id)}
                className="rounded-lg border border-radar-line bg-white p-3 text-left hover:border-blue-300 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-blue-500/60"
              >
                <p className="break-keep text-sm font-black leading-5 text-radar-ink">{node.name}</p>
                <p className="mt-1 text-xs font-bold text-slate-500">{node.ticker} · {node.role}</p>
              </button>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

export default function GroupGovernance() {
  const { stocks } = useMarketData();
  const [selectedGroupId, setSelectedGroupId] = useState(groupGovernanceData[0].id);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [groupQuery, setGroupQuery] = useState("");

  const stockByTicker = useMemo(() => new Map(stocks.map((stock) => [stock.ticker, stock])), [stocks]);
  const selectedGroup = groupGovernanceData.find((group) => group.id === selectedGroupId) ?? groupGovernanceData[0];
  const selectedNode = selectedNodeId ? selectedGroup.nodes.find((node) => node.id === selectedNodeId) ?? null : null;
  const selectedStock = selectedNode?.ticker ? stockByTicker.get(selectedNode.ticker) : undefined;
  const filteredGroups = useMemo(() => {
    const query = groupQuery.trim().toLowerCase();
    if (!query) return groupGovernanceData;

    return groupGovernanceData.filter((group) => {
      const searchText = [
        group.name,
        group.shortName,
        group.description,
        ...group.nodes.flatMap((node) => [node.name, node.ticker ?? "", node.role])
      ].join(" ").toLowerCase();

      return searchText.includes(query);
    });
  }, [groupQuery]);

  const groupStockViews = useMemo(
    () =>
      selectedGroup.nodes
        .map((node) => ({ node, stock: node.ticker ? stockByTicker.get(node.ticker) : undefined }))
        .filter((item) => item.stock)
        .sort((a, b) => Math.abs(getMove(b.stock)) - Math.abs(getMove(a.stock))),
    [selectedGroup, stockByTicker]
  );

  const ownershipRows = useMemo<OwnershipRow[]>(
    () =>
      selectedGroup.edges
        .flatMap((edge): OwnershipRow[] => {
          const holder = selectedGroup.nodes.find((node) => node.id === edge.from);
          const asset = selectedGroup.nodes.find((node) => node.id === edge.to);
          if (!holder || !asset) return [];
          const holderStock = holder.ticker ? stockByTicker.get(holder.ticker) : undefined;
          const assetStock = asset.ticker ? stockByTicker.get(asset.ticker) : undefined;
          const estimatedStakeValue = assetStock ? assetStock.marketCap * (edge.ownershipPercent / 100) : 0;
          const roadmap = selectedGroup.investmentRoadmap.find((item) =>
            asset.ticker ? item.listedTickers.includes(asset.ticker) : item.leadingCompanies.includes(asset.name)
          );

          return [{
            edge,
            holder,
            asset,
            holderStock,
            assetStock,
            estimatedStakeValue,
            roadmapTitle: roadmap?.title,
            meta: getRelationMeta(edge)
          }];
        })
        .sort((a, b) => b.estimatedStakeValue - a.estimatedStakeValue),
    [selectedGroup, stockByTicker]
  );

  const roadmapViews = useMemo(
    () =>
      selectedGroup.investmentRoadmap.map((item) => {
        const relatedStocks = item.listedTickers
          .map((ticker) => stockByTicker.get(ticker))
          .filter((stock): stock is Stock => Boolean(stock));
        const avgMove = relatedStocks.length
          ? relatedStocks.reduce((sum, stock) => sum + getMove(stock), 0) / relatedStocks.length
          : 0;
        return { ...item, relatedStocks, avgMove };
      }),
    [selectedGroup, stockByTicker]
  );

  const avgMove = groupStockViews.length
    ? groupStockViews.reduce((sum, item) => sum + getMove(item.stock), 0) / groupStockViews.length
    : 0;
  const totalStakeValue = ownershipRows.reduce((sum, row) => sum + row.estimatedStakeValue, 0);
  const connectedEdges = selectedNode ? getConnectedEdges(selectedGroup, selectedNode.id) : [];
  const findNode = (id: string) => selectedGroup.nodes.find((node) => node.id === id);

  useEffect(() => {
    setSelectedNodeId(null);
  }, [selectedGroupId]);

  useEffect(() => {
    const closeOnEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedNodeId(null);
    };
    window.addEventListener("keydown", closeOnEsc);
    return () => window.removeEventListener("keydown", closeOnEsc);
  }, []);

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-radar-line bg-white p-5 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-black text-blue-600">기업집단 진단 보드</p>
            <h2 className="mt-2 text-2xl font-black text-radar-ink">그룹별 지분 확보 구조와 투자 로드맵을 한 화면에서 봅니다</h2>
            <p className="mt-2 max-w-4xl text-sm font-bold leading-6 text-slate-600">
              오너·지주·사업회사·전략투자를 단계별 구조와 보유 관계 행으로 정리해 어느 회사가 어떤 계열사 지분을 몇 % 보유하는지 확인합니다.
            </p>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold leading-5 text-amber-800">
            지분율은 공시 시점에 따라 바뀔 수 있어 DART·공정위 기준으로 주기 갱신이 필요합니다.
          </div>
        </div>
      </section>

      <section className="grid grid-cols-[280px_1fr] items-start gap-5 max-xl:grid-cols-1">
        <aside className="space-y-5">
          <div className="rounded-lg border border-radar-line bg-white p-4 shadow-card dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center gap-2">
              <Network size={20} className="text-blue-600" />
              <h3 className="text-lg font-black text-radar-ink">그룹 선택</h3>
            </div>
            <label className="mt-4 flex h-10 items-center gap-2 rounded-lg border border-radar-line bg-slate-50 px-3 dark:border-slate-700 dark:bg-slate-950">
              <Search size={16} className="shrink-0 text-slate-400" />
              <input
                value={groupQuery}
                onChange={(event) => setGroupQuery(event.target.value)}
                placeholder="그룹·계열사·티커 검색"
                className="min-w-0 flex-1 bg-transparent text-sm font-bold outline-none placeholder:text-slate-400"
              />
            </label>
            <div className="mt-3 flex items-center justify-between text-[11px] font-black text-slate-500">
              <span>표시 {filteredGroups.length}개</span>
              <span>전체 {groupGovernanceData.length}개 그룹</span>
            </div>
            <div className="mt-4 max-h-[520px] space-y-2 overflow-y-auto pr-1 scrollbar-thin">
              {filteredGroups.length ? filteredGroups.map((group) => {
                const listedCount = group.nodes.filter((node) => node.listed).length;
                return (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() => setSelectedGroupId(group.id)}
                    className={cn(
                      "w-full rounded-lg border px-3 py-3 text-left transition",
                      selectedGroup.id === group.id
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-radar-line bg-white text-slate-700 hover:border-blue-300 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-blue-500/60"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="break-keep text-sm font-black leading-5">{group.name}</span>
                      <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[11px] font-black text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {listedCount}개 상장
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-3 text-xs font-bold leading-5 text-slate-500">{group.description}</p>
                  </button>
                );
              }) : (
                <div className="rounded-lg border border-dashed border-radar-line bg-slate-50 p-4 text-sm font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
                  검색 결과가 없습니다. 그룹명, 계열사명, 티커를 다시 입력해 주세요.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-radar-line bg-white p-4 shadow-card dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center gap-2">
              <RefreshCw size={18} className="text-teal-600" />
              <h3 className="text-base font-black text-radar-ink">갱신 정책</h3>
            </div>
            <div className="mt-3 space-y-3">
              {governanceUpdatePolicy.map((item) => (
                <div key={item.title} className="rounded-lg bg-slate-50 p-3 dark:bg-slate-950">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-black text-radar-ink">{item.title}</p>
                    <span className="shrink-0 rounded-full bg-white px-2 py-1 text-[11px] font-black text-blue-600 dark:bg-slate-900 dark:text-blue-300">{item.cadence}</span>
                  </div>
                  <p className="mt-1 text-xs font-bold leading-5 text-slate-500">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <div className="space-y-5">
          <div className="grid grid-cols-4 items-start gap-4 max-2xl:grid-cols-2 max-md:grid-cols-1">
            <div className="rounded-lg border border-radar-line bg-white p-4 shadow-card dark:border-slate-700 dark:bg-slate-900">
              <p className="text-xs font-black text-slate-500">선택 그룹</p>
              <p className="mt-2 text-2xl font-black text-radar-ink">{selectedGroup.name}</p>
              <p className="mt-1 text-xs font-bold text-slate-500">{selectedGroup.dataQuality}</p>
            </div>
            <div className="rounded-lg border border-radar-line bg-white p-4 shadow-card dark:border-slate-700 dark:bg-slate-900">
              <p className="text-xs font-black text-slate-500">상장 계열사</p>
              <p className="mt-2 text-2xl font-black text-blue-600">{groupStockViews.length}개</p>
              <p className="mt-1 text-xs font-bold text-slate-500">현재 universe 연결 기준</p>
            </div>
            <div className="rounded-lg border border-radar-line bg-white p-4 shadow-card dark:border-slate-700 dark:bg-slate-900">
              <p className="text-xs font-black text-slate-500">그룹 평균 등락률</p>
              <p className={cn("mt-2 text-2xl font-black", getMarketMoveTextClass(avgMove))}>
                {formatPercent(avgMove, 1)}
              </p>
              <p className="mt-1 text-xs font-bold text-slate-500">지연시세 기준</p>
            </div>
            <div className="rounded-lg border border-radar-line bg-white p-4 shadow-card dark:border-slate-700 dark:bg-slate-900">
              <p className="text-xs font-black text-slate-500">상장 지분가치 합계</p>
              <p className="mt-2 text-2xl font-black text-radar-ink">{formatCapValue(totalStakeValue, "KOSPI")}</p>
              <p className="mt-1 text-xs font-bold text-slate-500">현재가 기준 추정</p>
            </div>
          </div>

          <GovernanceChangeWatchPanel groupName={selectedGroup.name} shortName={selectedGroup.shortName} />

          <OwnershipStakeMap
            rows={ownershipRows}
            group={selectedGroup}
            selectedNodeId={selectedNodeId}
            stockByTicker={stockByTicker}
            roadmapViews={roadmapViews}
            groupStockViews={groupStockViews}
            onSelectNode={setSelectedNodeId}
          />
        </div>
      </section>

      {selectedNode ? (
        <div
          className="fixed inset-0 z-40 flex justify-end bg-slate-950/35 backdrop-blur-sm"
          onClick={() => setSelectedNodeId(null)}
        >
          <aside
            className="h-full w-[560px] overflow-y-auto bg-white p-7 shadow-2xl dark:bg-slate-950"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-black text-blue-600">{selectedGroup.name}</p>
                <h2 className="mt-1 text-3xl font-black text-radar-ink">{selectedNode.name}</h2>
                <p className="mt-2 text-sm font-bold text-slate-500">{selectedNode.ticker ?? selectedNode.market} · {selectedNode.role}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedNodeId(null)}
                className="flex size-10 items-center justify-center rounded-lg border border-radar-line text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                aria-label="기업 진단 상세 패널 닫기"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700 dark:bg-blue-500/15 dark:text-blue-200">{nodeTypeLabel(selectedNode.type)}</span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700 dark:bg-slate-800 dark:text-slate-200">연결 관계 {connectedEdges.length}개</span>
              {selectedStock ? <Badge value={selectedStock.finalDecision} /> : null}
            </div>

            {selectedStock ? (
              <a
                href={getStockExternalUrl(selectedStock)}
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex items-center gap-2 rounded-lg border border-radar-line px-3 py-2 text-sm font-black text-blue-600 dark:border-slate-700 dark:text-blue-300"
              >
                외부 시세 확인
                <ExternalLink size={15} />
              </a>
            ) : null}

            <div className="mt-6 grid grid-cols-2 items-start gap-3">
              <div className="rounded-lg border border-radar-line p-4 dark:border-slate-700 dark:bg-slate-900">
                <p className="text-xs font-black text-slate-500">현재가</p>
                <p className="mt-2 text-2xl font-black text-radar-ink">{formatPrice(selectedStock)}</p>
              </div>
              <div className="rounded-lg border border-radar-line p-4 dark:border-slate-700 dark:bg-slate-900">
                <p className="text-xs font-black text-slate-500">등락률</p>
                <p className={cn("mt-2 text-2xl font-black", getMarketMoveTextClass(getMove(selectedStock)))}>
                  {selectedStock ? formatPercent(getMove(selectedStock), 1) : "-"}
                </p>
              </div>
              <div className="rounded-lg border border-radar-line p-4 dark:border-slate-700 dark:bg-slate-900">
                <p className="text-xs font-black text-slate-500">시가총액</p>
                <p className="mt-2 text-2xl font-black text-radar-ink">{formatCapValue(selectedStock?.marketCap, selectedStock?.market)}</p>
              </div>
              <div className="rounded-lg border border-radar-line p-4 dark:border-slate-700 dark:bg-slate-900">
                <p className="text-xs font-black text-slate-500">그룹 내 역할</p>
                <p className="mt-2 text-lg font-black text-radar-ink">{selectedNode.role}</p>
              </div>
            </div>

            <section className="mt-6 rounded-lg border border-radar-line p-5 dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-center gap-2">
                <GitBranch size={18} className="text-blue-600" />
                <h3 className="text-lg font-black text-radar-ink">지분 연결</h3>
              </div>
              <div className="mt-4 space-y-3">
                {connectedEdges.length ? connectedEdges.map((edge) => {
                  const from = findNode(edge.from);
                  const to = findNode(edge.to);
                  const meta = getRelationMeta(edge);
                  const isOutgoing = edge.from === selectedNode.id;
                  return (
                    <div key={edge.id} className="rounded-lg bg-slate-50 p-3 dark:bg-slate-950">
                      <div className="flex items-center gap-2 text-sm font-black text-radar-ink">
                        <span>{from?.name}</span>
                        <ArrowRight size={14} className="text-slate-400" />
                        <span>{to?.name}</span>
                      </div>
                      <p className="mt-1 text-xs font-bold text-slate-500">
                        {isOutgoing ? "보유 지분" : "피보유 지분"} · {formatOwnership(edge.ownershipPercent)} · {String(edge.relation)}
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <StakeProgress percent={edge.ownershipPercent} meta={meta} />
                        <span className={cn("rounded-full border bg-white px-2 py-1 text-xs font-black dark:bg-slate-900", meta.border, meta.text)}>
                          {meta.label}
                        </span>
                      </div>
                      {edge.note ? <p className="mt-2 text-xs font-bold leading-5 text-slate-600">{edge.note}</p> : null}
                    </div>
                  );
                }) : (
                  <p className="rounded-lg bg-slate-50 p-4 text-sm font-bold text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                    현재 입력된 직접 지분 관계가 없습니다. 그룹 내 별도 상장 계열사로 관찰합니다.
                  </p>
                )}
              </div>
            </section>

            <section className="mt-6 rounded-lg border border-radar-line p-5">
              <div className="flex items-center gap-2">
                <Building2 size={18} className="text-teal-600" />
                <h3 className="text-lg font-black text-radar-ink">해석 포인트</h3>
              </div>
              <p className="mt-3 text-sm font-bold leading-6 text-slate-600">
                {selectedNode.name}은 {selectedGroup.shortName} 그룹에서 {selectedNode.role} 역할을 합니다.
                {selectedStock
                  ? ` 현재 등락률은 ${formatPercent(getMove(selectedStock), 1)}이며, 같은 그룹 내 지분 관계가 있는 종목과 동조화 여부를 함께 확인해야 합니다.`
                  : " 비상장 또는 오너 노드라 직접 시세가 없으므로 연결 상장사의 움직임으로 간접 확인합니다."}
              </p>
              <div className="mt-4 rounded-lg bg-blue-50 p-4 text-xs font-bold leading-5 text-blue-800">
                이 패널은 매수·매도 추천이 아니라 그룹 지배구조와 가격 반응을 함께 보기 위한 분석 보조 정보입니다.
              </div>
            </section>

            <section className="mt-6 rounded-lg border border-radar-line p-5">
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-teal-600" />
                <h3 className="text-lg font-black text-radar-ink">범례 설명</h3>
              </div>
              <div className="mt-4 space-y-2">
                {relationLegend.map((item) => (
                  <div key={item.id} className="rounded-lg bg-slate-50 p-3 dark:bg-slate-950">
                    <div className="flex items-center gap-2">
                      <span className={cn("size-2.5 rounded-full", item.color)} />
                      <p className="text-sm font-black text-radar-ink">{item.label}</p>
                    </div>
                    <p className="mt-1 text-xs font-bold text-slate-500">{item.description}</p>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
