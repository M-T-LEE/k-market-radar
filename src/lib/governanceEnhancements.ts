import { groupGovernanceData } from "../data/groupGovernance";
import type { BusinessGroup, GovernanceEdge, GovernanceNode } from "../types/governance";

const relation = (value: string) => value as GovernanceEdge["relation"];
const market = (value: string) => value as GovernanceNode["market"];

function addUniqueNodes(nodes: GovernanceNode[], additions: GovernanceNode[]) {
  const existing = new Set(nodes.map((node) => node.id));
  return [...nodes, ...additions.filter((node) => !existing.has(node.id))];
}

function addUniqueEdges(edges: GovernanceEdge[], additions: GovernanceEdge[]) {
  const existing = new Set(edges.map((edge) => edge.id));
  return [...edges, ...additions.filter((edge) => !existing.has(edge.id))];
}

function createNode(node: GovernanceNode): GovernanceNode {
  return node;
}

function createEdge(edge: GovernanceEdge): GovernanceEdge {
  return edge;
}

function enhanceLgGroup(group: BusinessGroup): BusinessGroup {
  const extraNodes = [
    createNode({
      id: "lg-innotek",
      name: "LG이노텍",
      ticker: "011070",
      market: market("KOSPI"),
      listed: true,
      type: "OPERATING",
      role: "광학솔루션·전장부품·기판소재",
      x: 82,
      y: 25,
      notes: ["LG전자가 보유한 상장 계열사 지분 관계를 별도 보강"]
    }),
    createNode({
      id: "lg-display",
      name: "LG디스플레이",
      ticker: "034220",
      market: market("KOSPI"),
      listed: true,
      type: "OPERATING",
      role: "OLED·LCD 디스플레이 패널",
      x: 82,
      y: 72,
      notes: ["LG전자가 보유한 상장 계열사 지분 관계를 별도 보강"]
    })
  ];

  const extraEdges = [
    createEdge({
      id: "lg-extra-electronics-innotek",
      from: "lg-electronics",
      to: "lg-innotek",
      ownershipPercent: 40.79,
      relation: relation("주요지분"),
      source: "COMPANY_IR",
      asOf: "2025-12-31",
      confidence: "높음" as GovernanceEdge["confidence"],
      note: "LG이노텍 IR 주주현황 기준 LG전자가 40.79% 보유"
    }),
    createEdge({
      id: "lg-extra-electronics-display",
      from: "lg-electronics",
      to: "lg-display",
      ownershipPercent: 36.7,
      relation: relation("주요지분"),
      source: "COMPANY_IR",
      asOf: "2025-12-31",
      confidence: "높음" as GovernanceEdge["confidence"],
      note: "LG디스플레이 IR 주주현황 기준 LG전자가 36.7% 보유"
    })
  ];

  return {
    ...group,
    nodes: addUniqueNodes(group.nodes, extraNodes),
    edges: addUniqueEdges(group.edges, extraEdges),
    investmentRoadmap: group.investmentRoadmap.map((item) => {
      if (!["전장", "디스플레이", "AI"].some((term) => `${item.title} ${item.theme} ${item.rationale}`.includes(term))) {
        return item;
      }

      return {
        ...item,
        leadingCompanies: Array.from(new Set([...item.leadingCompanies, "LG전자", "LG이노텍", "LG디스플레이"])),
        listedTickers: Array.from(new Set([...item.listedTickers, "066570", "011070", "034220"]))
      };
    }),
    keyIssues: Array.from(
      new Set([
        ...group.keyIssues,
        "LG전자 보유 LG이노텍·LG디스플레이 지분의 전장·디스플레이 축 재평가"
      ])
    ),
    watchSignals: Array.from(
      new Set([
        ...group.watchSignals,
        "LG전자-LG이노텍-LG디스플레이 간 전장·광학·디스플레이 투자 연결성"
      ])
    )
  };
}

export function enhanceBusinessGroups(groups: BusinessGroup[]) {
  return groups.map((group) => (group.id === "lg" ? enhanceLgGroup(group) : group));
}

export const enhancedGroupGovernanceData = enhanceBusinessGroups(groupGovernanceData);
