import * as vscode from "vscode";
import { SavedTabsProvider, SavedTabFileItem } from "./savedTabsProvider.js";
import { TabOperations } from "./tabOperations.js";
import { StorageManager } from "./storageManager.js";
import { SavedTabGroup } from "./types.js";

export function activate(context: vscode.ExtensionContext) {
  console.log("EditorTrail extension is now active!");

  const savedTabsProvider = new SavedTabsProvider();
  const treeView = vscode.window.createTreeView("editortrail.savedTabs", {
    treeDataProvider: savedTabsProvider,
    dragAndDropController: savedTabsProvider,
  });

  const helloWorldCommand = vscode.commands.registerCommand("editortrail.helloWorld", () => {
    console.log("Hello World from editortrail!");
    vscode.window.showInformationMessage("Hello World from editortrail! Yeah!");
    listTabs();
  });

  const saveTabsCommand = vscode.commands.registerCommand("editortrail.saveTabs", async () => {
    const name = await vscode.window.showInputBox({
      prompt: "Enter a name for this tab configuration",
      placeHolder: "e.g., feature-branch or leave empty for default",
      validateInput: (value) => {
        if (value && value.length > 100) {
          return "Name is too long (max 100 characters)";
        }
        return null;
      },
    });

    if (name === undefined) {
      return;
    }

    try {
      await TabOperations.saveCurrentTabs(name || undefined);
      savedTabsProvider.refresh();
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to save tabs: ${error}`);
    }
  });

  const restoreTabsCommand = vscode.commands.registerCommand(
    "editortrail.restoreTabs",
    async (item) => {
      if (!item || !item.state) {
        vscode.window.showErrorMessage("No tab configuration selected");
        return;
      }

      try {
        await TabOperations.restoreTabs(item.state);
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to restore tabs: ${error}`);
      }
    },
  );

  const renameTabStateCommand = vscode.commands.registerCommand(
    "editortrail.renameTabState",
    async (item) => {
      if (!item || !item.state) {
        vscode.window.showErrorMessage("No tab configuration selected");
        return;
      }

      const newName = await vscode.window.showInputBox({
        prompt: "Enter a new name for this tab configuration",
        value: item.state.name,
        validateInput: (value) => {
          if (!value || value.trim().length === 0) {
            return "Name cannot be empty";
          }
          if (value.length > 100) {
            return "Name is too long (max 100 characters)";
          }
          return null;
        },
      });

      if (!newName || newName === item.state.name) {
        return;
      }

      try {
        const projectName = item.state.projectName;
        const storageManager = new StorageManager(projectName);
        await storageManager.renameTabState(item.state.name, newName);
        savedTabsProvider.refresh();
        vscode.window.showInformationMessage(`Renamed to "${newName}"`);
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to rename: ${error}`);
      }
    },
  );

  const deleteTabStateCommand = vscode.commands.registerCommand(
    "editortrail.deleteTabState",
    async (item) => {
      if (!item || !item.state) {
        vscode.window.showErrorMessage("No tab configuration selected");
        return;
      }

      const confirmation = await vscode.window.showWarningMessage(
        `Delete "${item.state.name}"?`,
        { modal: true },
        "Delete",
      );

      if (confirmation !== "Delete") {
        return;
      }

      try {
        const projectName = item.state.projectName;
        const storageManager = new StorageManager(projectName);
        await storageManager.deleteTabState(item.state.name);
        savedTabsProvider.refresh();
        vscode.window.showInformationMessage(`Deleted "${item.state.name}"`);
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to delete: ${error}`);
      }
    },
  );

  const viewTabStateCommand = vscode.commands.registerCommand(
    "editortrail.viewTabState",
    async (item) => {
      if (!item || !item.state) {
        vscode.window.showErrorMessage("No tab configuration selected");
        return;
      }

      const state = item.state;
      const tabCount = state.groups.reduce(
        (sum: number, group: SavedTabGroup) => sum + group.tabs.length,
        0,
      );
      const date = new Date(state.timestamp).toLocaleString();

      const lines: string[] = [];
      lines.push(`# ${state.name}\n`);
      lines.push(`**Saved:** ${date}`);
      if (state.branch) {
        lines.push(`**Branch:** ${state.branch}`);
      }
      lines.push(`**Project:** ${state.projectName}`);
      lines.push(`**Total Tabs:** ${tabCount}`);
      lines.push(`**Groups:** ${state.groups.length}\n`);

      for (const group of state.groups) {
        const groupLabel = group.isActive ? "(Active Group)" : "";
        lines.push(`## Group ${group.viewColumn} ${groupLabel}\n`);
        for (const tab of group.tabs) {
          const active = tab.isActive ? "**[Active]**" : "";
          const pinned = tab.isPinned ? "📌" : "";
          const dirty = tab.isDirty ? "●" : "";
          lines.push(`- ${active} ${pinned}${dirty} ${tab.label}`);
          lines.push(`  \`${tab.uri}\``);
        }
        lines.push("");
      }

      const doc = await vscode.workspace.openTextDocument({
        content: lines.join("\n"),
        language: "markdown",
      });
      await vscode.window.showTextDocument(doc, { preview: true });
    },
  );

  const openTabFileCommand = vscode.commands.registerCommand(
    "editortrail.openTabFile",
    async (item: SavedTabFileItem) => {
      if (!item || !item.tab) {
        vscode.window.showErrorMessage("No file selected");
        return;
      }

      try {
        const uri = vscode.Uri.parse(item.tab.uri);

        try {
          await vscode.workspace.fs.stat(uri);
        } catch {
          vscode.window.showErrorMessage(`File not found: ${item.tab.label}`);
          return;
        }

        const targetViewColumn = findBestViewColumn(item.group.viewColumn);
        const document = await vscode.workspace.openTextDocument(uri);

        const editor = await vscode.window.showTextDocument(document, {
          viewColumn: targetViewColumn,
          preserveFocus: false,
          preview: false,
        });

        if (item.tab.scrollLine !== undefined) {
          const position = new vscode.Position(item.tab.scrollLine, 0);
          editor.revealRange(
            new vscode.Range(position, position),
            vscode.TextEditorRevealType.AtTop,
          );
        }
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to open file: ${error}`);
      }
    },
  );

  const refreshCommand = vscode.commands.registerCommand("editortrail.refreshSavedTabs", () => {
    savedTabsProvider.refresh();
  });

  context.subscriptions.push(
    helloWorldCommand,
    saveTabsCommand,
    restoreTabsCommand,
    renameTabStateCommand,
    deleteTabStateCommand,
    viewTabStateCommand,
    openTabFileCommand,
    refreshCommand,
    treeView,
  );
}

function findBestViewColumn(preferredColumn: number): vscode.ViewColumn {
  const activeEditor = vscode.window.activeTextEditor;
  const allGroups = vscode.window.tabGroups.all;

  const groupExists = allGroups.some((group) => group.viewColumn === preferredColumn);
  if (groupExists) {
    return preferredColumn as vscode.ViewColumn;
  }

  if (activeEditor) {
    const activeColumn = activeEditor.viewColumn;
    const availableColumns = [
      vscode.ViewColumn.One,
      vscode.ViewColumn.Two,
      vscode.ViewColumn.Three,
    ];

    for (const column of availableColumns) {
      if (column !== activeColumn) {
        return column;
      }
    }
  }

  return vscode.ViewColumn.Beside;
}

// Yeah, list tab is working
function listTabs() {
  for (const group of vscode.window.tabGroups.all) {
    const groupInfo = group.isActive ? " (active group)" : "";
    console.log(`Group ${group.viewColumn}${groupInfo}`);

    for (const tab of group.tabs) {
      // Try to extract a URI from known tab input types
      let uri: vscode.Uri | undefined;
      const input = tab.input;

      if (input instanceof vscode.TabInputText) uri = input.uri;
      else if (input instanceof vscode.TabInputTextDiff) uri = input.modified;
      else if (input instanceof vscode.TabInputCustom) uri = input.uri;
      else if (input instanceof vscode.TabInputNotebook) uri = input.uri;
      else if (input instanceof vscode.TabInputNotebookDiff) uri = input.modified;

      console.log(
        `- ${tab.label}${tab.isActive ? " (active tab)" : ""}${uri ? " -> " + uri.toString() : ""}`,
      );
    }
  }
}

// This method is called when your extension is deactivated
export function deactivate() {}
