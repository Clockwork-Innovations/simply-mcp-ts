/**
 * Integration Tests: Mutual Exclusivity
 *
 * Tests compiler validation of mutual exclusivity between returns and components fields.
 * Validates that compile errors are clear and actionable.
 */

import { compileServerFromCode } from '../../src/index.js';

describe('Skill Mutual Exclusivity - Compiler Validation', () => {
  it('should fail compilation with both returns and components', async () => {
    const code = `
      import { ISkill, SkillHelper } from 'simply-mcp';

      interface BadSkill extends ISkill {
        name: 'bad_skill';
        description: 'Skill with both fields';
        skill: string;
        tools: ['tool1'];
      }

      export default class BadServer {
        badSkill: SkillHelper<BadSkill> = () => '';
      }
    `;

    const result = await compileServerFromCode(code, { name: 'bad', version: '1.0.0', silent: true });
    expect(result.parsed.validationErrors).toBeDefined();
    expect(result.parsed.validationErrors.length).toBeGreaterThan(0);
    expect(result.parsed.validationErrors[0]).toContain('both');
  });

  it('should provide clear error message for mutual exclusivity violation', async () => {
    const code = `
      import { ISkill, SkillHelper } from 'simply-mcp';

      interface ConflictSkill extends ISkill {
        name: 'conflict';
        description: 'Conflicting fields';
        skill: string;
        tools: ['t1'];
      }

      export default class ConflictServer {
        conflict: SkillHelper<ConflictSkill> = () => '';
      }
    `;

    const result = await compileServerFromCode(code, { name: 'conflict', version: '1.0.0', silent: true });
    expect(result.parsed.validationErrors).toBeDefined();
    expect(result.parsed.validationErrors.length).toBeGreaterThan(0);
    const errorMsg = result.parsed.validationErrors[0];
    expect(errorMsg).toContain('both');
    expect(errorMsg).toContain('skill');
  });

  it('should fail compilation with neither returns nor components', async () => {
    const code = `
      import { ISkill, SkillHelper } from 'simply-mcp';

      interface IncompleteSkill extends ISkill {
        name: 'incomplete';
        description: 'Missing both fields';
      }

      export default class IncompleteServer {
        incomplete: SkillHelper<IncompleteSkill> = () => '';
      }
    `;

    const result = await compileServerFromCode(code, { name: 'incomplete', version: '1.0.0', silent: true });
    expect(result.parsed.validationErrors).toBeDefined();
    expect(result.parsed.validationErrors.length).toBeGreaterThan(0);
    expect(result.parsed.validationErrors[0]).toContain('must have either');
  });

  it('should provide clear error message for missing both fields', async () => {
    const code = `
      import { ISkill, SkillHelper } from 'simply-mcp';

      interface EmptySkill extends ISkill {
        name: 'empty';
        description: 'No content fields';
      }

      export default class EmptyServer {
        empty: SkillHelper<EmptySkill> = () => '';
      }
    `;

    const result = await compileServerFromCode(code, { name: 'empty', version: '1.0.0', silent: true });
    expect(result.parsed.validationErrors).toBeDefined();
    expect(result.parsed.validationErrors.length).toBeGreaterThan(0);
    const errorMsg = result.parsed.validationErrors[0];
    expect(errorMsg).toContain('must have either');
    expect(errorMsg).toContain('skill');
  });

  it('should allow exactly one of returns or components', async () => {
    const manualCode = `
      import { ISkill, SkillHelper } from 'simply-mcp';

      interface ManualSkill extends ISkill {
        name: 'manual';
        description: 'Manual only';
        skill: string;
      }

      export default class ManualServer {
        manual: SkillHelper<ManualSkill> = () => '# Manual';
      }
    `;

    const autoGenCode = `
      import { ITool, ISkill, ToolHelper, SkillHelper } from 'simply-mcp';
      import { z } from 'zod';

      interface TestTool extends ITool {
        name: 'test';
        description: 'Test';
        params: {};
        result: string;
      }

      interface AutoGenSkill extends ISkill {
        name: 'autogen';
        description: 'Auto-gen only';
        tools: ['test'];
      }

      export default class AutoGenServer {
        test: ToolHelper<TestTool> = async () => 'ok';
        autogen: SkillHelper<AutoGenSkill> = () => '';
      }
    `;

    // Both should compile successfully
    const manualResult = await compileServerFromCode(manualCode, {
      name: 'manual',
      version: '1.0.0',
      silent: true,
    });
    expect(manualResult.parsed.skills).toHaveLength(1);

    const autoGenResult = await compileServerFromCode(autoGenCode, {
      name: 'autogen',
      version: '1.0.0',
      silent: true,
    });
    expect(autoGenResult.parsed.skills).toHaveLength(1);
  });

  it('should detect violation early in compilation pipeline', async () => {
    const code = `
      import { ISkill, SkillHelper } from 'simply-mcp';

      interface ViolationSkill extends ISkill {
        name: 'violation';
        description: 'Violation test';
        skill: string;
        tools: ['t'];
      }

      export default class ViolationServer {
        violation: SkillHelper<ViolationSkill> = () => '';
      }
    `;

    const startTime = Date.now();
    const result = await compileServerFromCode(code, { name: 'test', version: '1.0.0', silent: true });
    const duration = Date.now() - startTime;
    // Should compile fast (within 1 second)
    expect(duration).toBeLessThan(1000);
    expect(result.parsed.validationErrors).toBeDefined();
    expect(result.parsed.validationErrors.length).toBeGreaterThan(0);
  });

  it('should handle violation in multiple skills independently', async () => {
    const code = `
      import { ITool, ISkill, ToolHelper, SkillHelper } from 'simply-mcp';
      import { z } from 'zod';

      interface TestTool extends ITool {
        name: 'test';
        description: 'Test';
        params: {};
        result: string;
      }

      // Valid skill
      interface GoodSkill extends ISkill {
        name: 'good_skill';
        description: 'Good skill';
        skill: string;
      }

      // Invalid skill
      interface BadSkill extends ISkill {
        name: 'bad_skill';
        description: 'Bad skill';
        skill: string;
        tools: ['test'];
      }

      export default class MixedServer {
        test: ToolHelper<TestTool> = async () => 'ok';
        goodSkill: SkillHelper<GoodSkill> = () => '# Good';
        badSkill: SkillHelper<BadSkill> = () => '';
      }
    `;

    const result = await compileServerFromCode(code, { name: 'mixed', version: '1.0.0', silent: true });
    // Error should mention bad_skill specifically
    expect(result.parsed.validationErrors).toBeDefined();
    expect(result.parsed.validationErrors.length).toBeGreaterThan(0);
    const errorMsg = result.parsed.validationErrors[0];
    expect(errorMsg).toContain('BadSkill');
    expect(errorMsg).toContain('both');
  });
});
