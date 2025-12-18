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
  id?: string; // DB ID needed for grouping
  keyword: string;
  volume: number;
  history: { [monthKey: string]: MonthlyData };
  latestPosition: number | null;
  latestDiff: number | null;
  isNew?: boolean; 
}

export interface ParsedCsvData {
  keyword: string;
  volume: number;
  position: number | null;
  url: string;
  isAIOverview: boolean;
  dateStr: string; // YYYY-MM
}

export interface KeywordGroup {
  id: string;
  name: string;
  keywords: string[]; // List of keyword strings (or IDs, but strings are easier for frontend filtering currently)
}

export type SortField = 'keyword' | 'volume' | 'position' | 'diff';
export type SortOrder = 'asc' | 'desc';
