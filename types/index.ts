export interface CsvRow {
  Keyword: string;
  Volume: string | number;
  'Current position': string | number;
  'Current URL inside': string;
  'Current URL': string;
}

export interface MonthlyData {
  position: number | null;
  url: string;
  isAIOverview: boolean;
  dateStr: string; // YYYY-MM
}

export interface KeywordHistory {
  keyword: string;
  volume: number;
  history: { [monthKey: string]: MonthlyData };
  latestPosition: number | null;
  latestDiff: number | null;
  isNew?: boolean; // 新規キーワードフラグ
}

export interface ParsedCsvData {
  keyword: string;
  volume: number;
  position: number | null;
  url: string;
  isAIOverview: boolean;
  dateStr: string; // YYYY-MM
}

export type SortField = 'keyword' | 'volume' | 'position' | 'diff';
export type SortOrder = 'asc' | 'desc';
