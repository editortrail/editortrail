import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";

export class FileUtils {
  static async ensureDir(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      console.error(`Failed to create directory ${dirPath}:`, error);
      throw error;
    }
  }

  static async readJSON<T>(filePath: string): Promise<T | null> {
    try {
      const content = await fs.readFile(filePath, "utf-8");
      return JSON.parse(content) as T;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return null;
      }
      console.error(`Failed to read JSON file ${filePath}:`, error);
      throw error;
    }
  }

  static async writeJSON<T>(filePath: string, data: T): Promise<void> {
    try {
      const dir = path.dirname(filePath);
      await this.ensureDir(dir);
      const content = JSON.stringify(data, null, 2);
      await fs.writeFile(filePath, content, "utf-8");
    } catch (error) {
      console.error(`Failed to write JSON file ${filePath}:`, error);
      throw error;
    }
  }

  static async appendJSONL(filePath: string, data: unknown): Promise<void> {
    try {
      const dir = path.dirname(filePath);
      await this.ensureDir(dir);
      const line = JSON.stringify(data) + "\n";
      await fs.appendFile(filePath, line, "utf-8");
    } catch (error) {
      console.error(`Failed to append to JSONL file ${filePath}:`, error);
      throw error;
    }
  }

  static async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  static async listFiles(dirPath: string): Promise<string[]> {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      return entries.filter((entry) => entry.isFile()).map((entry) => entry.name);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return [];
      }
      console.error(`Failed to list files in ${dirPath}:`, error);
      throw error;
    }
  }

  static getEditorTrailDir(): string {
    return path.join(os.homedir(), ".editortrail");
  }

  static getProjectTabsDir(projectName: string): string {
    return path.join(this.getEditorTrailDir(), "tabs", "projects", projectName);
  }

  static getStateFilePath(projectName: string): string {
    return path.join(this.getProjectTabsDir(projectName), "state.json");
  }

  static getHistoryFilePath(projectName: string, date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const timestamp = date.toISOString().replace(/[:.]/g, "-");
    const historyDir = path.join(
      this.getProjectTabsDir(projectName),
      "history",
      String(year),
      month,
    );
    return path.join(historyDir, `${year}-${month}-${day}-${timestamp}.jsonl`);
  }
}
