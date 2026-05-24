export type SybilLabel = "genuine" | "suspicious" | "sybil";

export interface EvidenceItem {
  type: string;
  description: string;
  cluster_id?: string;
  cluster_size?: number;
  confidence: number;
}

export interface ScoreResponse {
  address: string;
  chain: string;
  sybil_score: number;
  label: SybilLabel;
  confidence: number;
  cluster_id: string | null;
  cluster_size: number | null;
  evidence: EvidenceItem[];
}

export interface AnalysisSummary {
  total_scored: number;
  sybil_count: number;
  suspicious_count: number;
  genuine_count: number;
  cluster_count: number;
  largest_cluster_size: number;
}
