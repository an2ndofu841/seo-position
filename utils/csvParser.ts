import Papa from 'papaparse';
import { CsvRow } from '../types';
import { format } from 'date-fns';
import { ParsedCsvData } from '@/app/actions';

export const extractDateFromFilename = (filename: string): string => {
  // Try to match YYYY-MM-DD or YYYY-MM
  const match = filename.match(/(\d{4})[-_](\d{2})(?:[-_](\d{2}))?/);
  if (match) {
    return `${match[1]}-${match[2]}`;
  }
  return format(new Date(), 'yyyy-MM');
};

export const parseCsvFile = (
  file: File,
  dateOverride?: string
): Promise<{ parsedData: ParsedCsvData[]; monthKey: string }> => {
  return new Promise((resolve, reject) => {
    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const monthKey = dateOverride || extractDateFromFilename(file.name);
        const parsedData: ParsedCsvData[] = [];

        results.data.forEach((row) => {
          const keyword = row.Keyword;
          if (!keyword) return;

          const positionRaw = row['Current position'];
          let position: number | null = null;
          if (typeof positionRaw === 'number') {
            position = positionRaw;
          } else if (typeof positionRaw === 'string' && positionRaw.trim() !== '') {
            const parsed = parseInt(positionRaw, 10);
            if (!isNaN(parsed)) position = parsed;
          }

          const volumeRaw = row.Volume;
          let volume = 0;
           if (typeof volumeRaw === 'number') {
            volume = volumeRaw;
          } else if (typeof volumeRaw === 'string') {
            volume = parseInt(volumeRaw.replace(/,/g, ''), 10) || 0;
          }

          const isAIOverview = row['Current URL inside']?.includes('AI Overview') || false;
          const url = row['Current URL'] || '';

          parsedData.push({
            keyword,
            volume,
            position,
            url,
            isAIOverview,
            dateStr: monthKey,
          });
        });

        resolve({ parsedData, monthKey });
      },
      error: (error) => {
        reject(error);
      },
    });
  });
};
