/**
 * Orphaned Hidden Items Rule
 *
 * Detects tools, resources, or prompts that have `hidden: true` but are not
 * referenced by any skill's `components` field. These orphaned hidden items
 * defeat the purpose of progressive disclosure.
 */

import type { ValidationContext, ValidationWarning, ReferenceMaps } from '../types.js';

/**
 * Check for hidden items not referenced by any skill
 * Time complexity: O(T + R + P) where T = tools, R = resources, P = prompts
 */
export function checkOrphanedHiddenItems(
  context: ValidationContext,
  referenceMaps: ReferenceMaps
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  if (context.config.rules?.orphanedHidden === 'off') {
    return warnings;
  }

  const severity = context.config.rules?.orphanedHidden === 'error' ? 'error' : 'warning';

  // Check tools
  for (const [toolName, tool] of context.tools) {
    // Skip if not hidden
    if (!tool.hidden) continue;

    // Skip if dynamic hidden (can't validate at compile time)
    if (tool.hiddenIsDynamic) continue;

    // Check if referenced by any skill
    const referencingSkills = referenceMaps.componentToSkills.get(`tool:${toolName}`);
    if (!referencingSkills || referencingSkills.size === 0) {
      warnings.push({
        rule: 'orphaned-hidden-tool',
        severity,
        message: `Tool '${toolName}' is hidden but not referenced by any skill. Hidden items should be discoverable through skills for progressive disclosure.`,
        suggestion:
          `1. Add to an existing skill's components:\n` +
          `   components: { tools: ['${toolName}', ...] }\n\n` +
          `2. Create a new skill to document this tool\n\n` +
          `3. If this tool should be public, remove hidden flag`,
        relatedItems: Array.from(context.skills.keys())
      });
    }
  }

  // Check resources
  for (const [uri, resource] of context.resources) {
    if (!resource.hidden || resource.hiddenIsDynamic) continue;

    const referencingSkills = referenceMaps.componentToSkills.get(`resource:${uri}`);
    if (!referencingSkills || referencingSkills.size === 0) {
      warnings.push({
        rule: 'orphaned-hidden-resource',
        severity,
        message: `Resource '${uri}' is hidden but not referenced by any skill. Hidden items should be discoverable through skills for progressive disclosure.`,
        suggestion: `Add to a skill's components or remove hidden flag`,
        relatedItems: Array.from(context.skills.keys())
      });
    }
  }

  // Check prompts
  for (const [promptName, prompt] of context.prompts) {
    if (!prompt.hidden || prompt.hiddenIsDynamic) continue;

    const referencingSkills = referenceMaps.componentToSkills.get(`prompt:${promptName}`);
    if (!referencingSkills || referencingSkills.size === 0) {
      warnings.push({
        rule: 'orphaned-hidden-prompt',
        severity,
        message: `Prompt '${promptName}' is hidden but not referenced by any skill. Hidden items should be discoverable through skills for progressive disclosure.`,
        suggestion: `Add to a skill's components or remove hidden flag`,
        relatedItems: Array.from(context.skills.keys())
      });
    }
  }

  return warnings;
}
