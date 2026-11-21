export type Criterion = { id: string; name: string; weight: number }
export type Option = { id: string; name: string }
export type Decision = {
  version: number; title: string; context: string; options: Option[]; criteria: Criterion[];
  scores: Record<string, Record<string, number | null>>;
  chosen: string; rationale: string; decidedAt: string; outcome: string; reviewedAt: string;
}
export type NotebookRow = { id: string; document: Decision }
export type NotebookAdapter = {
  mode: string; readonly ready: boolean;
  list(): Promise<NotebookRow[]>;
  save(id: string | null, document: Decision): Promise<string>;
  subscribe(notify: () => void): () => void;
}
