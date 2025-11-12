import * as vscode from "vscode";
import { SavedTabState, SavedTabGroup, SavedTab } from "./types.js";
import { ProjectUtils } from "./projectUtils.js";
import { StorageManager } from "./storageManager.js";

export class TabOperations {
  static captureCurrentTabs(): SavedTabGroup[] {
    const groups: SavedTabGroup[] = [];

    for (const group of vscode.window.tabGroups.all) {
      const savedGroup: SavedTabGroup = {
        viewColumn: group.viewColumn,
        isActive: group.isActive,
        tabs: [],
      };

      for (const tab of group.tabs) {
        const uri = this.extractUri(tab);
        if (!uri) {
          continue;
        }

        const scrollLine = this.getScrollPosition(uri);

        const savedTab: SavedTab = {
          label: tab.label,
          uri: uri.toString(),
          isActive: tab.isActive,
          isPinned: tab.isPinned,
          isDirty: tab.isDirty,
        };

        if (scrollLine !== undefined) {
          savedTab.scrollLine = scrollLine;
        }

        savedGroup.tabs.push(savedTab);
      }

      if (savedGroup.tabs.length > 0) {
        groups.push(savedGroup);
      }
    }

    return groups;
  }

  private static getScrollPosition(uri: vscode.Uri): number | undefined {
    const editors = vscode.window.visibleTextEditors;
    const editor = editors.find((e) => e.document.uri.toString() === uri.toString());

    if (editor && editor.visibleRanges.length > 0) {
      return editor.visibleRanges[0].start.line;
    }

    return undefined;
  }

  private static extractUri(tab: vscode.Tab): vscode.Uri | undefined {
    const input = tab.input;

    if (input instanceof vscode.TabInputText) {
      return input.uri;
    } else if (input instanceof vscode.TabInputTextDiff) {
      return input.modified;
    } else if (input instanceof vscode.TabInputCustom) {
      return input.uri;
    } else if (input instanceof vscode.TabInputNotebook) {
      return input.uri;
    } else if (input instanceof vscode.TabInputNotebookDiff) {
      return input.modified;
    }

    return undefined;
  }

  static async saveCurrentTabs(name?: string): Promise<void> {
    const projectName = ProjectUtils.getProjectName();
    const branch = ProjectUtils.getCurrentBranch();

    if (!name) {
      name = branch || "untitled";
    }

    const groups = this.captureCurrentTabs();

    if (groups.length === 0) {
      vscode.window.showWarningMessage("No tabs to save");
      return;
    }

    const state: SavedTabState = {
      name,
      timestamp: new Date().toISOString(),
      branch: branch || undefined,
      projectName,
      groups,
    };

    const storageManager = new StorageManager(projectName);
    await storageManager.saveTabState(state);

    const tabCount = groups.reduce((sum, group) => sum + group.tabs.length, 0);
    vscode.window.showInformationMessage(`Saved ${tabCount} tabs as "${name}"`);
  }

  static async restoreTabs(state: SavedTabState): Promise<void> {
    await vscode.commands.executeCommand("workbench.action.closeAllEditors");

    const openedGroups = new Map<number, boolean>();
    const missingFiles: string[] = [];

    for (const group of state.groups) {
      for (const tab of group.tabs) {
        try {
          const uri = vscode.Uri.parse(tab.uri);

          try {
            await vscode.workspace.fs.stat(uri);
          } catch {
            missingFiles.push(tab.label);
            continue;
          }

          const viewColumn = group.viewColumn as vscode.ViewColumn;
          const document = await vscode.workspace.openTextDocument(uri);

          const options: vscode.TextDocumentShowOptions = {
            viewColumn,
            preserveFocus: !tab.isActive,
            preview: false,
          };

          const editor = await vscode.window.showTextDocument(document, options);

          if (tab.scrollLine !== undefined) {
            const position = new vscode.Position(tab.scrollLine, 0);
            editor.revealRange(
              new vscode.Range(position, position),
              vscode.TextEditorRevealType.AtTop,
            );
          }

          openedGroups.set(group.viewColumn, true);
        } catch (error) {
          console.error(`Failed to open tab ${tab.label}:`, error);
          missingFiles.push(tab.label);
        }
      }
    }

    if (missingFiles.length > 0) {
      const message = `Restored tabs, but ${missingFiles.length} file(s) could not be opened`;
      vscode.window.showWarningMessage(message);
    } else {
      const tabCount = state.groups.reduce((sum, group) => sum + group.tabs.length, 0);
      vscode.window.showInformationMessage(`Restored ${tabCount} tabs from "${state.name}"`);
    }
  }
}
