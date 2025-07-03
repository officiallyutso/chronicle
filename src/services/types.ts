// Shared interfaces and types for the Chronicle application
export interface ActivityEvent {
  id: string;
  timestamp: number;
  type: ActivityType;
  data: any;
  category: string;
}

export enum ActivityType {
  APP_OPENED = 'app_opened',
  APP_CLOSED = 'app_closed',
  TERMINAL_COMMAND = 'terminal_command',
  FILE_CHANGED = 'file_changed',
  BROWSER_SEARCH = 'browser_search',
  VSCODE_ACTION = 'vscode_action',
  SYSTEM_IDLE = 'system_idle',
  SYSTEM_ACTIVE = 'system_active'
}

// Event data type interfaces for better type safety
export interface AppEventData {
  appName: string;
  platform?: string;
  previousApp?: string;
}

export interface FileEventData {
  action: string;
  fileName: string;
  directory: string;
  extension: string;
  fullPath: string;
}

export interface TerminalEventData {
  command: string;
  shell: string;
  timestamp: number;
  originalCommand?: string;
  platform?: string;
  workingDirectory?: string;
  projectName?: string;
  projectType?: string;
}

export interface BrowserEventData {
  url?: string;
  title?: string;
  action: string;
  query?: string;
}

export interface VSCodeEventData {
  action: string;
  file: string;
  project: string;
}

export interface SystemEventData {
  platform: string;
  uptime: number;
  loadAverage: number[];
  totalMemory: number;
  freeMemory: number;
  cpuCount: number;
  idleTime: number;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface HealthCheckResponse {
  status: string;
  timestamp: number;
  eventsCount: number;
  isTracking: boolean;
}