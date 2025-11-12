import * as vscode from "vscode";

export interface SavedTab {
  label: string;
  uri: string;
  isActive: boolean;
  isPinned: boolean;
  isDirty: boolean;
  scrollLine?: number;
}

export interface SavedTabGroup {
  viewColumn: number;
  isActive: boolean;
  tabs: SavedTab[];
}

export interface SavedTabState {
  name: string;
  timestamp: string;
  branch?: string;
  projectName: string;
  groups: SavedTabGroup[];
  order?: number;
}

export interface TabStateCollection {
  savedTabs: SavedTabState[];
}

export interface HistoryEntry {
  timestamp: string;
  eventType: "open" | "close" | "switch";
  uri: string;
  label: string;
}

export interface TabAnalytics {
  uri: string;
  label: string;
  openCount: number;
  switchCount: number;
  totalTimeMs: number;
  lastAccessed: string;
}
