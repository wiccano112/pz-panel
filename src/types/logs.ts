export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

export interface LogEntry {
  id: string;
  raw: string;
  level: LogLevel;
  timestamp: string;
}

export type LogFilterType = 'ALL' | LogLevel;
