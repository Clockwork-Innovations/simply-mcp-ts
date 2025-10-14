/**
 * Integration tests for wizard tools - complete workflow
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  startWizardTool,
  loadFileTool,
  confirmMetadataTool,
  addToolDecoratorTool,
  previewTool,
  finishTool,
} from '../tools.js';
import { writeFileSync, unlinkSync, mkdtempSync, existsSync, rmdirSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// Helper to parse tool results
function parseToolResult(result: any): any {
  const resultStr = typeof result === 'string' ? result : JSON.stringify(result);
  return JSON.parse(resultStr);
}

describe('Wizard Tools Integration', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'mcp-wizard-test-'));
  });

  afterEach(() => {
    // Clean up temp files
    try {
      const files = readdirSync(tempDir);
      for (const file of files) {
        unlinkSync(join(tempDir, file));
      }
      rmdirSync(tempDir);
    } catch (e) {
      // Ignore cleanup errors
    }

    // Note: State is managed per-session, so each test gets a clean state
    // when undefined sessionId is passed to tools
  });

  describe('Complete Wizard Workflow', () => {
    it('should transform a class end-to-end', async () => {
      // Create test fixture
      const testFilePath = join(tempDir, 'SimpleClass.ts');
      const testCode = `export class SimpleClass {
  greet(name: string): string {
    return 'Hello, ' + name + '!';
  }

  farewell(name: string): string {
    return 'Goodbye, ' + name + '!';
  }
}`;
      writeFileSync(testFilePath, testCode);

      // 1. start_wizard
      const startResult = await startWizardTool.execute({}, undefined);
      const startData = parseToolResult(startResult);
      expect(startData.success).toBe(true);
      expect(startData.message).toContain('Welcome');
      expect(startData.data.wizard_started).toBe(true);

      // 2. load_file
      const loadResult = await loadFileTool.execute({ file_path: testFilePath }, undefined);
      const loadData = parseToolResult(loadResult);
      expect(loadData.success).toBe(true);
      expect(loadData.file_info.class_name).toBe('SimpleClass');
      expect(loadData.file_info.methods).toHaveLength(2);
      expect(loadData.suggested_metadata.name).toBe('simple-class');
      expect(loadData.suggested_metadata.version).toBe('1.0.0');

      // 3. confirm_server_metadata
      const metadataResult = await confirmMetadataTool.execute(
        {
          name: 'simple-class',
          version: '1.0.0',
        },
        undefined
      );
      const metadataData = parseToolResult(metadataResult);
      expect(metadataData.success).toBe(true);
      expect(metadataData.metadata.name).toBe('simple-class');

      // 4. add_tool_decorator (for first method)
      const decorator1Result = await addToolDecoratorTool.execute(
        {
          method_name: 'greet',
          description: 'Greet a user by name',
        },
        undefined
      );
      const decorator1Data = parseToolResult(decorator1Result);
      expect(decorator1Data.success).toBe(true);
      expect(decorator1Data.method).toBe('greet');

      // 5. add_tool_decorator (for second method)
      const decorator2Result = await addToolDecoratorTool.execute(
        {
          method_name: 'farewell',
          description: 'Say goodbye to a user',
        },
        undefined
      );
      const decorator2Data = parseToolResult(decorator2Result);
      expect(decorator2Data.success).toBe(true);
      expect(decorator2Data.method).toBe('farewell');

      // 6. preview_annotations
      const previewResult = await previewTool.execute({}, undefined);
      const previewData = parseToolResult(previewResult);

      expect(previewData.success).toBe(true);
      expect(previewData.preview).toContain('@MCPServer');
      expect(previewData.preview).toContain('@tool');
      expect(previewData.preview).toContain('Greet a user by name');
      expect(previewData.preview).toContain('Say goodbye to a user');

      // Check changes_summary fields (may have different structure)
      expect(previewData.changes_summary).toBeDefined();
      expect(previewData.changes_summary.preservationRate || previewData.changes_summary.preservation_rate).toBe('100%');

      // 7. finish_and_write
      const finishResult = await finishTool.execute({}, undefined);
      const finishData = parseToolResult(finishResult);
      expect(finishData.success).toBe(true);
      expect(finishData.files.output).toContain('.mcp.ts');

      // 8. Verify generated file exists
      const outputPath = finishData.files.output;
      expect(existsSync(outputPath)).toBe(true);

      // 9. Verify original file unchanged
      const originalContent = readFileSync(testFilePath, 'utf-8');
      expect(originalContent).not.toContain('@MCPServer');
      expect(originalContent).not.toContain('@tool');

      // 10. Verify generated file has decorators
      const generatedContent = readFileSync(outputPath, 'utf-8');
      expect(generatedContent).toContain('@MCPServer');
      expect(generatedContent).toContain('@tool');
      expect(generatedContent).toContain("import { MCPServer, tool } from 'simply-mcp'");
    });

    it('should handle errors gracefully', async () => {
      // Try to load file before starting wizard (file doesn't exist so should fail)
      const loadResult = await loadFileTool.execute({ file_path: './nonexistent-test.ts' }, undefined);
      const loadData = parseToolResult(loadResult);
      expect(loadData.success).toBe(false);
      // File check happens first, then wizard check
      expect(loadData.error).toBeDefined();
    });

    it('should validate workflow order', async () => {
      // Start wizard
      await startWizardTool.execute({}, undefined);

      // Try to confirm metadata before loading file
      const metadataResult = await confirmMetadataTool.execute(
        { name: 'test', version: '1.0.0' },
        undefined
      );
      const metadataData = parseToolResult(metadataResult);
      expect(metadataData.success).toBe(false);
      expect(metadataData.error).toContain('No file has been loaded');
    });

    it('should handle invalid file paths', async () => {
      await startWizardTool.execute({}, undefined);

      const loadResult = await loadFileTool.execute(
        { file_path: '/non/existent/file.ts' },
        undefined
      );
      const loadData = parseToolResult(loadResult);
      expect(loadData.success).toBe(false);
      expect(loadData.error).toContain('File not found');
    });

    it('should validate server name format', async () => {
      // Create test file
      const testFilePath = join(tempDir, 'Test.ts');
      writeFileSync(
        testFilePath,
        `export class Test {
  test(): void {}
}`
      );

      await startWizardTool.execute({}, undefined);
      await loadFileTool.execute({ file_path: testFilePath }, undefined);

      // Try invalid server name
      const metadataResult = await confirmMetadataTool.execute(
        { name: 'Invalid_Name', version: '1.0.0' },
        undefined
      );
      const metadataData = parseToolResult(metadataResult);
      expect(metadataData.success).toBe(false);
      expect(metadataData.error).toContain('kebab-case');
    });

    it('should validate version format', async () => {
      // Create test file
      const testFilePath = join(tempDir, 'Test.ts');
      writeFileSync(
        testFilePath,
        `export class Test {
  test(): void {}
}`
      );

      await startWizardTool.execute({}, undefined);
      await loadFileTool.execute({ file_path: testFilePath }, undefined);

      // Try invalid version
      const metadataResult = await confirmMetadataTool.execute(
        { name: 'test', version: '1.0' },
        undefined
      );
      const metadataData = parseToolResult(metadataResult);
      expect(metadataData.success).toBe(false);
      expect(metadataData.error).toContain('semver');
    });

    it('should prevent duplicate method decorators', async () => {
      // Create test file
      const testFilePath = join(tempDir, 'Test.ts');
      writeFileSync(
        testFilePath,
        `export class Test {
  test(): void {}
}`
      );

      await startWizardTool.execute({}, undefined);
      await loadFileTool.execute({ file_path: testFilePath }, undefined);
      await confirmMetadataTool.execute({ name: 'test', version: '1.0.0' }, undefined);

      // Add decorator
      const result1 = await addToolDecoratorTool.execute(
        { method_name: 'test', description: 'Test method description' },
        undefined
      );
      const data1 = parseToolResult(result1);
      expect(data1.success).toBe(true);

      // Try to add again
      const result2 = await addToolDecoratorTool.execute(
        { method_name: 'test', description: 'Different description' },
        undefined
      );
      const data2 = parseToolResult(result2);
      expect(data2.success).toBe(false);
      expect(data2.error).toContain('already has a decorator');
    });

    it('should validate method names exist', async () => {
      // Create test file
      const testFilePath = join(tempDir, 'Test.ts');
      writeFileSync(
        testFilePath,
        `export class Test {
  test(): void {}
}`
      );

      await startWizardTool.execute({}, undefined);
      await loadFileTool.execute({ file_path: testFilePath }, undefined);
      await confirmMetadataTool.execute({ name: 'test', version: '1.0.0' }, undefined);

      // Try to decorate non-existent method
      const result = await addToolDecoratorTool.execute(
        { method_name: 'nonExistent', description: 'Test description' },
        undefined
      );
      const data = parseToolResult(result);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Method not found');
    });

    it('should require minimum description length', async () => {
      // Create test file
      const testFilePath = join(tempDir, 'Test.ts');
      writeFileSync(
        testFilePath,
        `export class Test {
  test(): void {}
}`
      );

      await startWizardTool.execute({}, undefined);
      await loadFileTool.execute({ file_path: testFilePath }, undefined);
      await confirmMetadataTool.execute({ name: 'test', version: '1.0.0' }, undefined);

      // Try short description
      const result = await addToolDecoratorTool.execute(
        { method_name: 'test', description: 'Short' },
        undefined
      );
      const data = parseToolResult(result);
      expect(data.success).toBe(false);
      expect(data.error).toContain('too short');
    });

    it('should handle custom output path', async () => {
      // Create test file
      const testFilePath = join(tempDir, 'Test.ts');
      writeFileSync(
        testFilePath,
        `export class Test {
  test(): void {}
}`
      );

      await startWizardTool.execute({}, undefined);
      await loadFileTool.execute({ file_path: testFilePath }, undefined);
      await confirmMetadataTool.execute({ name: 'test', version: '1.0.0' }, undefined);
      await addToolDecoratorTool.execute(
        { method_name: 'test', description: 'Test method description' },
        undefined
      );

      const customPath = join(tempDir, 'custom-output.ts');
      const result = await finishTool.execute({ output_path: customPath }, undefined);
      const data = parseToolResult(result);

      expect(data.success).toBe(true);
      expect(data.files.output).toBe(customPath);
      expect(existsSync(customPath)).toBe(true);
    });
  });
});
