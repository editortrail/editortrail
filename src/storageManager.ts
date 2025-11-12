import * as vscode from "vscode";
import { FileUtils } from "./fileUtils.js";
import { SavedTabState, TabStateCollection, HistoryEntry } from "./types.js";

export class StorageManager {
  constructor(private projectName: string) {}

  async loadTabStates(): Promise<SavedTabState[]> {
    const stateFilePath = FileUtils.getStateFilePath(this.projectName);
    const collection = await FileUtils.readJSON<TabStateCollection>(stateFilePath);
    return collection?.savedTabs ?? [];
  }

  async saveTabState(state: SavedTabState): Promise<void> {
    const states = await this.loadTabStates();

    const existingIndex = states.findIndex((s) => s.name === state.name);
    if (existingIndex >= 0) {
      states[existingIndex] = state;
    } else {
      states.push(state);
    }

    const collection: TabStateCollection = { savedTabs: states };
    const stateFilePath = FileUtils.getStateFilePath(this.projectName);
    await FileUtils.writeJSON(stateFilePath, collection);
  }

  async deleteTabState(name: string): Promise<void> {
    const states = await this.loadTabStates();
    const filtered = states.filter((s) => s.name !== name);

    const collection: TabStateCollection = { savedTabs: filtered };
    const stateFilePath = FileUtils.getStateFilePath(this.projectName);
    await FileUtils.writeJSON(stateFilePath, collection);
  }

  async renameTabState(oldName: string, newName: string): Promise<void> {
    const states = await this.loadTabStates();
    const state = states.find((s) => s.name === oldName);

    if (!state) {
      throw new Error(`Tab state "${oldName}" not found`);
    }

    if (states.some((s) => s.name === newName)) {
      throw new Error(`Tab state "${newName}" already exists`);
    }

    state.name = newName;

    const collection: TabStateCollection = { savedTabs: states };
    const stateFilePath = FileUtils.getStateFilePath(this.projectName);
    await FileUtils.writeJSON(stateFilePath, collection);
  }

  async getTabState(name: string): Promise<SavedTabState | undefined> {
    const states = await this.loadTabStates();
    return states.find((s) => s.name === name);
  }

  async logHistoryEntry(entry: HistoryEntry): Promise<void> {
    const date = new Date();
    const historyFilePath = FileUtils.getHistoryFilePath(this.projectName, date);
    await FileUtils.appendJSONL(historyFilePath, entry);
  }
}
