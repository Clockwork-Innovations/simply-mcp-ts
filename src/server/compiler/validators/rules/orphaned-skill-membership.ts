/**
 * Orphaned Skill Membership Rule
 *
 * Detects tools, resources, or prompts that have a `skill` field
 * referencing non-existent skills. This helps catch typos and
 * ensures skill membership declarations are valid.
 */

import type { ValidationContext, ValidationWarning } from '../types.js';

/**
 * Check for components with skill field referencing non-existent skills
 * Time complexity: O(T + R + P) where T = tools, R = resources, P = prompts
 */
export function checkOrphanedSkillMembership(
  context: ValidationContext
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  if (context.config.rules?.orphanedSkillMembership === 'off') {
    return warnings;
  }

  const severity = context.config.rules?.orphanedSkillMembership === 'error' ? 'error' : 'warning';
  const availableSkills = Array.from(context.skills.keys());

  // Check tools
  for (const [toolName, tool] of context.tools) {
    const membership = tool.skill;
    if (!membership) continue;

    const skillsToCheck = Array.isArray(membership) ? membership : [membership];

    for (const skillName of skillsToCheck) {
      if (!context.skills.has(skillName)) {
        warnings.push({
          rule: 'orphaned-skill-membership',
          severity,
          message: `Tool '${toolName}' declares membership in skill '${skillName}' which doesn't exist.`,
          suggestion: availableSkills.length > 0
            ? `Available skills: ${availableSkills.join(', ')}`
            : 'No skills are defined in this server.',
          relatedItems: availableSkills
        });
      }
    }
  }

  // Check resources
  for (const [uri, resource] of context.resources) {
    const membership = resource.skill;
    if (!membership) continue;

    const skillsToCheck = Array.isArray(membership) ? membership : [membership];

    for (const skillName of skillsToCheck) {
      if (!context.skills.has(skillName)) {
        warnings.push({
          rule: 'orphaned-skill-membership',
          severity,
          message: `Resource '${uri}' declares membership in skill '${skillName}' which doesn't exist.`,
          suggestion: availableSkills.length > 0
            ? `Available skills: ${availableSkills.join(', ')}`
            : 'No skills are defined in this server.',
          relatedItems: availableSkills
        });
      }
    }
  }

  // Check prompts
  for (const [promptName, prompt] of context.prompts) {
    const membership = prompt.skill;
    if (!membership) continue;

    const skillsToCheck = Array.isArray(membership) ? membership : [membership];

    for (const skillName of skillsToCheck) {
      if (!context.skills.has(skillName)) {
        warnings.push({
          rule: 'orphaned-skill-membership',
          severity,
          message: `Prompt '${promptName}' declares membership in skill '${skillName}' which doesn't exist.`,
          suggestion: availableSkills.length > 0
            ? `Available skills: ${availableSkills.join(', ')}`
            : 'No skills are defined in this server.',
          relatedItems: availableSkills
        });
      }
    }
  }

  return warnings;
}
