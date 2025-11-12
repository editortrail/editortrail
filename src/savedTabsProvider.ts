import * as vscode from "vscode";
import { SavedTabState, SavedTab, SavedTabGroup } from "./types.js";
import { StorageManager } from "./storageManager.js";
import { ProjectUtils } from "./projectUtils.js";

type TreeItem = SavedTabStateItem | SavedTabFileItem;

export class SavedTabsProvider
  implements vscode.TreeDataProvider<TreeItem>, vscode.TreeDragAndDropController<TreeItem>
{
  private _onDidChangeTreeData: vscode.EventEmitter<TreeItem | undefined | null | void> =
    new vscode.EventEmitter<TreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<TreeItem | undefined | null | void> =
    this._onDidChangeTreeData.event;

  dropMimeTypes = ["application/vnd.code.tree.editortrail.savedTabs"];
  dragMimeTypes = ["application/vnd.code.tree.editortrail.savedTabs"];

  private storageManager: StorageManager | null = null;

  constructor() {
    this.updateStorageManager();
  }

  refresh(): void {
    this.updateStorageManager();
    this._onDidChangeTreeData.fire();
  }

  private updateStorageManager(): void {
    const projectName = ProjectUtils.getProjectName();
    this.storageManager = new StorageManager(projectName);
  }

  getTreeItem(element: TreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: TreeItem): Promise<TreeItem[]> {
    if (!this.storageManager) {
      return [];
    }

    if (!element) {
      try {
        const states = await this.storageManager.loadTabStates();
        states.sort((a, b) => {
          const orderA = a.order ?? Number.MAX_SAFE_INTEGER;
          const orderB = b.order ?? Number.MAX_SAFE_INTEGER;
          return orderA - orderB;
        });
        return states.map((state) => new SavedTabStateItem(state));
      } catch (error) {
        console.error("Failed to load saved tabs:", error);
        return [];
      }
    }

    if (element instanceof SavedTabStateItem) {
      const fileItems: SavedTabFileItem[] = [];
      for (const group of element.state.groups) {
        for (const tab of group.tabs) {
          fileItems.push(new SavedTabFileItem(tab, group, element.state));
        }
      }
      return fileItems;
    }

    return [];
  }

  async handleDrag(source: readonly TreeItem[], dataTransfer: vscode.DataTransfer): Promise<void> {
    const stateItems = source.filter(
      (item) => item instanceof SavedTabStateItem,
    ) as SavedTabStateItem[];
    if (stateItems.length > 0) {
      dataTransfer.set(
        "application/vnd.code.tree.editortrail.savedTabs",
        new vscode.DataTransferItem(stateItems.map((item) => item.state.name)),
      );
    }
  }

  async handleDrop(target: TreeItem | undefined, dataTransfer: vscode.DataTransfer): Promise<void> {
    if (!this.storageManager) {
      return;
    }

    const transferItem = dataTransfer.get("application/vnd.code.tree.editortrail.savedTabs");
    if (!transferItem) {
      return;
    }

    const draggedNames = transferItem.value as string[];
    if (!draggedNames || draggedNames.length === 0) {
      return;
    }

    try {
      const states = await this.storageManager.loadTabStates();

      const draggedStates = states.filter((s) => draggedNames.includes(s.name));
      const otherStates = states.filter((s) => !draggedNames.includes(s.name));

      let newStates: SavedTabState[];
      if (target instanceof SavedTabStateItem) {
        const targetIndex = otherStates.findIndex((s) => s.name === target.state.name);
        if (targetIndex >= 0) {
          newStates = [
            ...otherStates.slice(0, targetIndex),
            ...draggedStates,
            ...otherStates.slice(targetIndex),
          ];
        } else {
          newStates = [...otherStates, ...draggedStates];
        }
      } else {
        newStates = [...draggedStates, ...otherStates];
      }

      newStates.forEach((state, index) => {
        state.order = index;
      });

      for (const state of newStates) {
        await this.storageManager.saveTabState(state);
      }

      this.refresh();
    } catch (error) {
      console.error("Failed to reorder tabs:", error);
      vscode.window.showErrorMessage(`Failed to reorder: ${error}`);
    }
  }
}

export class SavedTabStateItem extends vscode.TreeItem {
  constructor(public readonly state: SavedTabState) {
    super(state.name, vscode.TreeItemCollapsibleState.Collapsed);

    this.tooltip = this.buildTooltip();
    this.description = this.buildDescription();
    this.contextValue = "savedTabState";
    this.iconPath = new vscode.ThemeIcon("layers");
  }

  private buildTooltip(): string {
    const parts: string[] = [];
    parts.push(`Name: ${this.state.name}`);
    parts.push(`Saved: ${new Date(this.state.timestamp).toLocaleString()}`);

    if (this.state.branch) {
      parts.push(`Branch: ${this.state.branch}`);
    }

    const tabCount = this.state.groups.reduce(
      (sum: number, group: SavedTabGroup) => sum + group.tabs.length,
      0,
    );
    parts.push(`Tabs: ${tabCount}`);
    parts.push(`Groups: ${this.state.groups.length}`);

    return parts.join("\n");
  }

  private buildDescription(): string {
    const tabCount = this.state.groups.reduce(
      (sum: number, group: SavedTabGroup) => sum + group.tabs.length,
      0,
    );
    const date = new Date(this.state.timestamp);
    const dateStr = date.toLocaleDateString();

    return `${tabCount} tabs, ${dateStr}`;
  }
}

export class SavedTabFileItem extends vscode.TreeItem {
  constructor(
    public readonly tab: SavedTab,
    public readonly group: SavedTabGroup,
    public readonly state: SavedTabState,
  ) {
    super(tab.label, vscode.TreeItemCollapsibleState.None);

    this.resourceUri = vscode.Uri.parse(tab.uri);
    this.contextValue = "savedTabFile";

    this.command = {
      command: "editortrail.openTabFile",
      title: "Open File",
      arguments: [this],
    };

    this.description = this.buildDescription();
    this.tooltip = this.buildTooltip();
  }

  private buildDescription(): string {
    const parts: string[] = [];

    if (this.tab.isActive) {
      parts.push("active");
    }
    if (this.tab.isPinned) {
      parts.push("pinned");
    }
    if (this.tab.isDirty) {
      parts.push("modified");
    }
    if (this.tab.scrollLine !== undefined) {
      parts.push(`line ${this.tab.scrollLine}`);
    }

    return parts.length > 0 ? parts.join(", ") : "";
  }

  private buildTooltip(): string {
    const parts: string[] = [];
    parts.push(this.tab.label);
    parts.push(`Group: ${this.group.viewColumn}`);
    if (this.tab.isActive) {
      parts.push("Active in group");
    }
    if (this.tab.isPinned) {
      parts.push("Pinned");
    }
    if (this.tab.isDirty) {
      parts.push("Has unsaved changes");
    }
    if (this.tab.scrollLine !== undefined) {
      parts.push(`Scroll position: line ${this.tab.scrollLine}`);
    }
    parts.push(`\n${this.tab.uri}`);

    return parts.join("\n");
  }
}
