/**
 * Test Artifact Manager
 *
 * Comprehensive test artifact management for aggressive MCP UI testing including:
 * - Test directory creation and cleanup
 * - HTML capture and saving
 * - Screenshot management via Chrome MCP
 * - Large file creation and automatic cleanup
 * - Logging and debugging
 * - Test report generation
 *
 * Features:
 * - Auto-create test directories
 * - Track all created files
 * - Clean up files >10MB automatically
 * - Generate HTML reports with embedded screenshots
 * - Log all operations for debugging
 *
 * Usage:
 *   const manager = new TestArtifactManager('/tmp/mcp-ui-aggressive-test');
 *   await manager.ensureTestDirectory();
 *   const htmlPath = await manager.saveHTML(content, 'test.html');
 *   const screenshotPath = await manager.captureScreenshot(url, 'screenshot.png');
 *   await manager.cleanupTestDirectory();
 */

import * as fs from 'fs';
import * as path from 'path';
import type { MCPTestClient } from './mcp-test-client.js';

// ============================================================================
// Types
// ============================================================================

export interface ArtifactFile {
  path: string;
  name: string;
  type: 'html' | 'screenshot' | 'snapshot' | 'log' | 'payload' | 'report' | 'other';
  size: number;
  created: Date;
}

export interface ArtifactManagerOptions {
  verbose?: boolean; // Enable debug logging
  autoCleanup?: boolean; // Auto-cleanup large files (default: true)
  cleanupThresholdMB?: number; // Cleanup threshold in MB (default: 10)
}

export interface ReportData {
  title: string;
  summary: Record<string, any>;
  sections: ReportSection[];
  artifacts?: ArtifactFile[];
  timestamp: Date;
}

export interface ReportSection {
  title: string;
  content: string;
  subsections?: ReportSection[];
}

// ============================================================================
// TestArtifactManager Class
// ============================================================================

export class TestArtifactManager {
  private baseDir: string;
  private artifacts: ArtifactFile[] = [];
  private logs: string[] = [];
  private options: Required<ArtifactManagerOptions>;

  constructor(baseDir: string, options: ArtifactManagerOptions = {}) {
    this.baseDir = baseDir;
    this.options = {
      verbose: options.verbose ?? false,
      autoCleanup: options.autoCleanup ?? true,
      cleanupThresholdMB: options.cleanupThresholdMB ?? 10,
    };

    this.log(`Artifact manager initialized at: ${baseDir}`);
  }

  // ============================================================================
  // Directory Management
  // ============================================================================

  /**
   * Ensure test directory exists
   */
  async ensureTestDirectory(): Promise<void> {
    this.log(`Ensuring test directory exists: ${this.baseDir}`);

    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
      this.log(`Created test directory: ${this.baseDir}`);
    } else {
      this.log(`Test directory already exists: ${this.baseDir}`);
    }
  }

  /**
   * Clean up test directory
   * @param removeAll If true, removes all files. If false, only removes large files
   */
  async cleanupTestDirectory(removeAll: boolean = false): Promise<void> {
    this.log(`Cleaning up test directory (removeAll: ${removeAll})...`);

    if (!fs.existsSync(this.baseDir)) {
      this.log('Test directory does not exist, nothing to clean');
      return;
    }

    if (removeAll) {
      // Remove entire directory
      fs.rmSync(this.baseDir, { recursive: true, force: true });
      this.log(`Removed test directory: ${this.baseDir}`);
      this.artifacts = [];
    } else {
      // Only remove large files
      await this.cleanupLargeFiles();
    }
  }

  /**
   * Get path to artifact file
   */
  getArtifactPath(filename: string): string {
    return path.join(this.baseDir, filename);
  }

  /**
   * Get base directory
   */
  getBaseDirectory(): string {
    return this.baseDir;
  }

  // ============================================================================
  // HTML Capture
  // ============================================================================

  /**
   * Save HTML content to file
   */
  async saveHTML(content: string, name: string): Promise<string> {
    await this.ensureTestDirectory();

    const filename = this.sanitizeFilename(name);
    const htmlPath = this.getArtifactPath(filename);

    this.log(`Saving HTML to: ${htmlPath} (${content.length} bytes)`);

    fs.writeFileSync(htmlPath, content, 'utf-8');

    this.trackArtifact({
      path: htmlPath,
      name: filename,
      type: 'html',
      size: content.length,
      created: new Date(),
    });

    this.log(`Saved HTML: ${htmlPath}`);
    return htmlPath;
  }

  /**
   * Save HTML from MCP resource
   */
  async saveHTMLFromResource(
    client: MCPTestClient,
    uri: string,
    name?: string
  ): Promise<string> {
    this.log(`Fetching HTML from resource: ${uri}`);

    const content = await client.readResource(uri);
    const filename = name || this.uriToFilename(uri) + '.html';

    return this.saveHTML(content, filename);
  }

  // ============================================================================
  // Screenshot Capture
  // ============================================================================

  /**
   * Capture screenshot of a page
   * Note: This returns the path where screenshot should be saved
   * The caller must use Chrome MCP tools to actually capture the screenshot
   */
  captureScreenshot(pageUrl: string, filename: string): string {
    const sanitized = this.sanitizeFilename(filename);
    const screenshotPath = this.getArtifactPath(sanitized);

    this.log(`Screenshot path prepared: ${screenshotPath}`);
    this.log(`Use Chrome MCP: mcp__chrome-devtools__take_screenshot({ filePath: "${screenshotPath}" })`);

    // Track as placeholder (actual file created by Chrome MCP)
    this.trackArtifact({
      path: screenshotPath,
      name: sanitized,
      type: 'screenshot',
      size: 0, // Unknown until captured
      created: new Date(),
    });

    return screenshotPath;
  }

  /**
   * Capture page snapshot
   * Note: This returns the path where snapshot should be saved
   * The caller must use Chrome MCP tools to actually capture the snapshot
   */
  captureSnapshot(pageUrl: string): string {
    const filename = this.urlToFilename(pageUrl) + '_snapshot.txt';
    const snapshotPath = this.getArtifactPath(filename);

    this.log(`Snapshot path prepared: ${snapshotPath}`);
    this.log(`Use Chrome MCP: mcp__chrome-devtools__take_snapshot()`);

    this.trackArtifact({
      path: snapshotPath,
      name: filename,
      type: 'snapshot',
      size: 0, // Unknown until captured
      created: new Date(),
    });

    return snapshotPath;
  }

  /**
   * Update artifact size after file is created (e.g., by Chrome MCP)
   */
  updateArtifactSize(filepath: string): void {
    if (fs.existsSync(filepath)) {
      const stats = fs.statSync(filepath);
      const artifact = this.artifacts.find(a => a.path === filepath);
      if (artifact) {
        artifact.size = stats.size;
        this.log(`Updated artifact size: ${filepath} (${stats.size} bytes)`);
      }
    }
  }

  // ============================================================================
  // Large File Management
  // ============================================================================

  /**
   * Create a large payload file for testing
   */
  async createLargePayload(sizeMB: number, filename: string): Promise<string> {
    await this.ensureTestDirectory();

    const sanitized = this.sanitizeFilename(filename);
    const payloadPath = this.getArtifactPath(sanitized);

    this.log(`Creating ${sizeMB}MB payload file: ${payloadPath}`);

    const sizeBytes = sizeMB * 1024 * 1024;
    const chunkSize = 1024 * 1024; // 1MB chunks
    const fd = fs.openSync(payloadPath, 'w');

    try {
      const chunk = Buffer.alloc(chunkSize, 'A');
      let written = 0;

      while (written < sizeBytes) {
        const remaining = sizeBytes - written;
        const toWrite = Math.min(chunkSize, remaining);
        fs.writeSync(fd, chunk, 0, toWrite);
        written += toWrite;

        if (this.options.verbose && written % (10 * 1024 * 1024) === 0) {
          this.log(`Written ${(written / (1024 * 1024)).toFixed(1)}MB...`);
        }
      }
    } finally {
      fs.closeSync(fd);
    }

    this.trackArtifact({
      path: payloadPath,
      name: sanitized,
      type: 'payload',
      size: sizeBytes,
      created: new Date(),
    });

    this.log(`Created payload: ${payloadPath} (${sizeMB}MB)`);
    return payloadPath;
  }

  /**
   * Clean up large files exceeding threshold
   */
  async cleanupLargeFiles(pattern?: string): Promise<void> {
    const thresholdBytes = this.options.cleanupThresholdMB * 1024 * 1024;

    this.log(
      `Cleaning up files larger than ${this.options.cleanupThresholdMB}MB${pattern ? ` matching: ${pattern}` : ''}...`
    );

    let removed = 0;
    const toRemove: ArtifactFile[] = [];

    for (const artifact of this.artifacts) {
      // Check if file matches pattern
      if (pattern && !artifact.name.includes(pattern)) {
        continue;
      }

      // Check if file exceeds threshold
      if (artifact.size > thresholdBytes) {
        toRemove.push(artifact);
      }
    }

    for (const artifact of toRemove) {
      if (fs.existsSync(artifact.path)) {
        fs.unlinkSync(artifact.path);
        removed++;
        this.log(`Removed large file: ${artifact.path} (${(artifact.size / (1024 * 1024)).toFixed(2)}MB)`);
      }

      // Remove from tracking
      const index = this.artifacts.indexOf(artifact);
      if (index > -1) {
        this.artifacts.splice(index, 1);
      }
    }

    this.log(`Cleaned up ${removed} large file(s)`);
  }

  // ============================================================================
  // Logging
  // ============================================================================

  /**
   * Log a message
   */
  log(message: string): void {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}`;

    this.logs.push(logEntry);

    if (this.options.verbose) {
      console.log(`[ArtifactManager] ${message}`);
    }
  }

  /**
   * Save logs to file
   */
  async saveLog(filename: string = 'test.log'): Promise<string> {
    await this.ensureTestDirectory();

    const sanitized = this.sanitizeFilename(filename);
    const logPath = this.getArtifactPath(sanitized);

    this.log(`Saving logs to: ${logPath}`);

    const logContent = this.logs.join('\n');
    fs.writeFileSync(logPath, logContent, 'utf-8');

    this.trackArtifact({
      path: logPath,
      name: sanitized,
      type: 'log',
      size: logContent.length,
      created: new Date(),
    });

    return logPath;
  }

  /**
   * Get all log entries
   */
  getLogs(): string[] {
    return [...this.logs];
  }

  /**
   * Clear log entries
   */
  clearLogs(): void {
    this.logs = [];
  }

  // ============================================================================
  // Reporting
  // ============================================================================

  /**
   * Generate test report
   */
  async generateReport(data: ReportData): Promise<string> {
    await this.ensureTestDirectory();

    this.log(`Generating test report: ${data.title}`);

    // Generate markdown report
    const markdownPath = await this.generateMarkdownReport(data);
    this.log(`Generated markdown report: ${markdownPath}`);

    // Generate HTML report
    const htmlPath = await this.generateHTMLReport(data);
    this.log(`Generated HTML report: ${htmlPath}`);

    return markdownPath;
  }

  /**
   * Generate markdown report
   */
  private async generateMarkdownReport(data: ReportData): Promise<string> {
    let md = `# ${data.title}\n\n`;
    md += `**Generated:** ${data.timestamp.toISOString()}\n\n`;
    md += `---\n\n`;

    // Summary section
    md += `## Summary\n\n`;
    for (const [key, value] of Object.entries(data.summary)) {
      md += `- **${key}:** ${value}\n`;
    }
    md += `\n`;

    // Report sections
    for (const section of data.sections) {
      md += this.formatMarkdownSection(section, 2);
    }

    // Artifacts section
    if (data.artifacts && data.artifacts.length > 0) {
      md += `## Artifacts\n\n`;
      for (const artifact of data.artifacts) {
        const sizeKB = (artifact.size / 1024).toFixed(2);
        md += `- **${artifact.name}** (${artifact.type}, ${sizeKB} KB)\n`;
        md += `  - Path: \`${artifact.path}\`\n`;
        md += `  - Created: ${artifact.created.toISOString()}\n`;
      }
      md += `\n`;
    }

    const reportPath = this.getArtifactPath('REPORT.md');
    fs.writeFileSync(reportPath, md, 'utf-8');

    this.trackArtifact({
      path: reportPath,
      name: 'REPORT.md',
      type: 'report',
      size: md.length,
      created: new Date(),
    });

    return reportPath;
  }

  /**
   * Format markdown section recursively
   */
  private formatMarkdownSection(section: ReportSection, level: number): string {
    let md = `${'#'.repeat(level)} ${section.title}\n\n`;
    md += `${section.content}\n\n`;

    if (section.subsections) {
      for (const subsection of section.subsections) {
        md += this.formatMarkdownSection(subsection, level + 1);
      }
    }

    return md;
  }

  /**
   * Generate HTML report
   */
  private async generateHTMLReport(data: ReportData): Promise<string> {
    let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      background: #f5f5f5;
    }
    .header {
      background: #2c3e50;
      color: white;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    .summary {
      background: white;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .section {
      background: white;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .artifact {
      background: #ecf0f1;
      padding: 10px;
      margin: 10px 0;
      border-radius: 4px;
      font-family: monospace;
    }
    h1, h2, h3 { margin-top: 0; }
    .timestamp { color: #7f8c8d; font-size: 0.9em; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${data.title}</h1>
    <p class="timestamp">Generated: ${data.timestamp.toISOString()}</p>
  </div>

  <div class="summary">
    <h2>Summary</h2>
`;

    for (const [key, value] of Object.entries(data.summary)) {
      html += `    <p><strong>${key}:</strong> ${value}</p>\n`;
    }

    html += `  </div>\n\n`;

    // Sections
    for (const section of data.sections) {
      html += this.formatHTMLSection(section);
    }

    // Artifacts
    if (data.artifacts && data.artifacts.length > 0) {
      html += `  <div class="section">
    <h2>Artifacts</h2>
`;
      for (const artifact of data.artifacts) {
        const sizeKB = (artifact.size / 1024).toFixed(2);
        html += `    <div class="artifact">
      <strong>${artifact.name}</strong> (${artifact.type}, ${sizeKB} KB)<br>
      Path: ${artifact.path}<br>
      Created: ${artifact.created.toISOString()}
    </div>
`;
      }
      html += `  </div>\n`;
    }

    html += `</body>
</html>`;

    const reportPath = this.getArtifactPath('REPORT.html');
    fs.writeFileSync(reportPath, html, 'utf-8');

    this.trackArtifact({
      path: reportPath,
      name: 'REPORT.html',
      type: 'report',
      size: html.length,
      created: new Date(),
    });

    return reportPath;
  }

  /**
   * Format HTML section recursively
   */
  private formatHTMLSection(section: ReportSection): string {
    let html = `  <div class="section">
    <h2>${section.title}</h2>
    <p>${section.content.replace(/\n/g, '<br>')}</p>
`;

    if (section.subsections) {
      for (const subsection of section.subsections) {
        html += `    <h3>${subsection.title}</h3>
    <p>${subsection.content.replace(/\n/g, '<br>')}</p>
`;
      }
    }

    html += `  </div>\n`;
    return html;
  }

  // ============================================================================
  // Artifact Tracking
  // ============================================================================

  /**
   * Track an artifact file
   */
  private trackArtifact(artifact: ArtifactFile): void {
    this.artifacts.push(artifact);
  }

  /**
   * Get all tracked artifacts
   */
  getArtifacts(type?: ArtifactFile['type']): ArtifactFile[] {
    if (type) {
      return this.artifacts.filter(a => a.type === type);
    }
    return [...this.artifacts];
  }

  /**
   * Get artifact statistics
   */
  getStats(): {
    totalFiles: number;
    totalSize: number;
    byType: Record<string, { count: number; size: number }>;
  } {
    const stats = {
      totalFiles: this.artifacts.length,
      totalSize: 0,
      byType: {} as Record<string, { count: number; size: number }>,
    };

    for (const artifact of this.artifacts) {
      stats.totalSize += artifact.size;

      if (!stats.byType[artifact.type]) {
        stats.byType[artifact.type] = { count: 0, size: 0 };
      }

      stats.byType[artifact.type].count++;
      stats.byType[artifact.type].size += artifact.size;
    }

    return stats;
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Sanitize filename to remove unsafe characters
   */
  private sanitizeFilename(filename: string): string {
    return filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  }

  /**
   * Convert URI to safe filename
   */
  private uriToFilename(uri: string): string {
    return uri.replace(/[^a-zA-Z0-9]/g, '_');
  }

  /**
   * Convert URL to safe filename
   */
  private urlToFilename(url: string): string {
    return url.replace(/[^a-zA-Z0-9]/g, '_');
  }
}
