import * as vscode from "vscode";
import * as path from "path";
import { execSync } from "child_process";

export class ProjectUtils {
  static getProjectName(workspaceFolder?: vscode.WorkspaceFolder): string {
    if (!workspaceFolder) {
      const folders = vscode.workspace.workspaceFolders;
      if (!folders || folders.length === 0) {
        return "default";
      }
      workspaceFolder = folders[0];
    }

    const workspacePath = workspaceFolder.uri.fsPath;

    const gitRemote = this.getGitRemote(workspacePath);
    if (gitRemote) {
      return gitRemote;
    }

    return path.basename(workspacePath);
  }

  private static getGitRemote(workspacePath: string): string | null {
    try {
      const remote = execSync("git config --get remote.origin.url", {
        cwd: workspacePath,
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "ignore"],
      }).trim();

      if (!remote) {
        return null;
      }

      const normalized = this.normalizeGitRemote(remote);
      return normalized;
    } catch {
      return null;
    }
  }

  private static normalizeGitRemote(remote: string): string {
    let normalized = remote;

    if (normalized.startsWith("git@")) {
      normalized = normalized.replace(/^git@([^:]+):/, "https://$1/");
    }

    normalized = normalized.replace(/\.git$/, "");

    normalized = normalized.replace(/^https?:\/\//, "");

    normalized = normalized.replace(/\//g, "-");

    return normalized;
  }

  static getCurrentBranch(workspaceFolder?: vscode.WorkspaceFolder): string | null {
    if (!workspaceFolder) {
      const folders = vscode.workspace.workspaceFolders;
      if (!folders || folders.length === 0) {
        return null;
      }
      workspaceFolder = folders[0];
    }

    const workspacePath = workspaceFolder.uri.fsPath;

    try {
      const branch = execSync("git rev-parse --abbrev-ref HEAD", {
        cwd: workspacePath,
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "ignore"],
      }).trim();

      return branch || null;
    } catch {
      return null;
    }
  }
}
