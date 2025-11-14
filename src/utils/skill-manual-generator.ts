/**
 * Skill Manual Generator
 *
 * Generates LLM-friendly markdown documentation from skill component references.
 * This is the core auto-generation system for FT-2.
 */

import type { BuildMCPServer } from '../server/builder-server.js';

/**
 * Manual generation result
 */
export interface GeneratedManual {
  content: string;
  warnings: string[];
  stats: {
    toolsFound: number;
    toolsMissing: number;
    resourcesFound: number;
    resourcesMissing: number;
    promptsFound: number;
    promptsMissing: number;
  };
}

/**
 * Generate markdown manual from component references
 *
 * @param skillName - Name of the skill (for header)
 * @param skillDescription - Description of the skill
 * @param components - Component references (flat arrays or nested object)
 * @param server - BuildMCPServer instance for component lookup
 * @returns Generated markdown content
 */
export async function generateSkillManual(
  skillName: string,
  skillDescription: string,
  components: { tools?: string[]; resources?: string[]; prompts?: string[] },
  server: BuildMCPServer
): Promise<GeneratedManual> {
  const warnings: string[] = [];
  const stats = {
    toolsFound: 0,
    toolsMissing: 0,
    resourcesFound: 0,
    resourcesMissing: 0,
    promptsFound: 0,
    promptsMissing: 0,
  };

  // Build manual sections
  const sections: string[] = [];

  // Header
  sections.push(`# ${toTitleCase(skillName)} Skill`);
  sections.push('');
  sections.push(skillDescription);
  sections.push('');
  sections.push('> **Note**: This manual is auto-generated from component definitions.');
  sections.push('');

  // Tools section
  // Collect tools from explicit components + skill membership
  const explicitTools = components.tools || [];
  const membershipTools = findToolsByMembership(skillName, server);
  const allTools = deduplicateByName([...explicitTools, ...membershipTools]);

  if (allTools.length > 0) {
    const toolDocs = await generateToolsSection(allTools, server, stats, warnings);
    sections.push('## Available Tools');
    sections.push('');
    sections.push(toolDocs);
    sections.push('');
  }

  // Resources section
  // Collect resources from explicit components + skill membership
  const explicitResources = components.resources || [];
  const membershipResources = findResourcesByMembership(skillName, server);
  const allResources = deduplicateByName([...explicitResources, ...membershipResources]);

  if (allResources.length > 0) {
    const resourceDocs = await generateResourcesSection(allResources, server, stats, warnings);
    sections.push('## Available Resources');
    sections.push('');
    sections.push(resourceDocs);
    sections.push('');
  }

  // Prompts section
  // Collect prompts from explicit components + skill membership
  const explicitPrompts = components.prompts || [];
  const membershipPrompts = findPromptsByMembership(skillName, server);
  const allPrompts = deduplicateByName([...explicitPrompts, ...membershipPrompts]);

  if (allPrompts.length > 0) {
    const promptDocs = await generatePromptsSection(allPrompts, server, stats, warnings);
    sections.push('## Available Prompts');
    sections.push('');
    sections.push(promptDocs);
    sections.push('');
  }

  // Warnings section (if any)
  if (warnings.length > 0) {
    sections.push('## Warnings');
    sections.push('');
    sections.push('The following components were referenced but not found:');
    sections.push('');
    warnings.forEach(w => sections.push(`- ${w}`));
    sections.push('');
  }

  return {
    content: sections.join('\n'),
    warnings,
    stats,
  };
}

/**
 * Generate tools documentation section
 */
async function generateToolsSection(
  toolNames: string[],
  server: BuildMCPServer,
  stats: any,
  warnings: string[]
): Promise<string> {
  const docs: string[] = [];

  for (const toolName of toolNames) {
    const tool = server.tools.get(toolName);

    if (!tool) {
      stats.toolsMissing++;
      warnings.push(`Tool not found: ${toolName}`);
      docs.push(`### ${toolName}`);
      docs.push('');
      docs.push('⚠️ **Warning**: This tool is not registered with the server.');
      docs.push('');
      continue;
    }

    stats.toolsFound++;

    // Tool header
    docs.push(`### ${tool.definition.name}`);
    docs.push('');
    docs.push(`**Description:** ${tool.definition.description}`);
    docs.push('');

    // Parameters
    if (tool.jsonSchema) {
      docs.push('**Parameters:**');
      docs.push('');
      docs.push('```typescript');
      docs.push(formatJsonSchemaAsTypeScript(tool.jsonSchema));
      docs.push('```');
      docs.push('');

      // Parameter descriptions
      const schema = tool.jsonSchema;
      if (schema.properties) {
        docs.push('| Parameter | Type | Required | Description |');
        docs.push('|-----------|------|----------|-------------|');

        const required = schema.required || [];
        for (const [name, prop] of Object.entries(schema.properties)) {
          const propSchema = prop as any;
          const type = propSchema.type || 'any';
          const isRequired = required.includes(name);
          const desc = propSchema.description || '-';
          docs.push(`| \`${name}\` | ${type} | ${isRequired ? '✓' : '-'} | ${desc} |`);
        }
        docs.push('');
      }
    }

    // Usage example
    docs.push('**Example:**');
    docs.push('');
    docs.push('```typescript');
    docs.push(`// Call the tool`);
    docs.push(`await callTool("${tool.definition.name}", {`);
    if (tool.jsonSchema?.properties) {
      const props = Object.keys(tool.jsonSchema.properties);
      props.forEach((prop, idx) => {
        const comma = idx < props.length - 1 ? ',' : '';
        docs.push(`  ${prop}: value${comma}`);
      });
    }
    docs.push(`});`);
    docs.push('```');
    docs.push('');
  }

  return docs.join('\n');
}

/**
 * Generate resources documentation section
 */
async function generateResourcesSection(
  resourceUris: string[],
  server: BuildMCPServer,
  stats: any,
  warnings: string[]
): Promise<string> {
  const docs: string[] = [];

  for (const uri of resourceUris) {
    const resource = server.resources.get(uri);

    if (!resource) {
      stats.resourcesMissing++;
      warnings.push(`Resource not found: ${uri}`);
      docs.push(`### ${uri}`);
      docs.push('');
      docs.push('⚠️ **Warning**: This resource is not registered with the server.');
      docs.push('');
      continue;
    }

    stats.resourcesFound++;

    // Resource header
    docs.push(`### ${resource.uri}`);
    docs.push('');
    docs.push(`**Name:** ${resource.name}`);
    docs.push('');
    docs.push(`**Description:** ${resource.description}`);
    docs.push('');
    docs.push(`**MIME Type:** \`${resource.mimeType}\``);
    docs.push('');

    // Subscribable flag
    if (resource.subscribable) {
      docs.push('**Subscribable:** Yes (supports real-time updates)');
      docs.push('');
    }

    // Usage example
    docs.push('**Example:**');
    docs.push('');
    docs.push('```typescript');
    docs.push(`// Read the resource`);
    docs.push(`const content = await readResource("${resource.uri}");`);
    docs.push('```');
    docs.push('');
  }

  return docs.join('\n');
}

/**
 * Generate prompts documentation section
 */
async function generatePromptsSection(
  promptNames: string[],
  server: BuildMCPServer,
  stats: any,
  warnings: string[]
): Promise<string> {
  const docs: string[] = [];

  for (const promptName of promptNames) {
    const prompt = server.prompts.get(promptName);

    if (!prompt) {
      stats.promptsMissing++;
      warnings.push(`Prompt not found: ${promptName}`);
      docs.push(`### ${promptName}`);
      docs.push('');
      docs.push('⚠️ **Warning**: This prompt is not registered with the server.');
      docs.push('');
      continue;
    }

    stats.promptsFound++;

    // Prompt header
    docs.push(`### ${prompt.name}`);
    docs.push('');
    docs.push(`**Description:** ${prompt.description}`);
    docs.push('');

    // Arguments
    if (prompt.arguments && prompt.arguments.length > 0) {
      docs.push('**Arguments:**');
      docs.push('');
      docs.push('| Argument | Required | Description |');
      docs.push('|----------|----------|-------------|');

      for (const arg of prompt.arguments) {
        docs.push(`| \`${arg.name}\` | ${arg.required ? '✓' : '-'} | ${arg.description} |`);
      }
      docs.push('');
    } else {
      docs.push('**Arguments:** None');
      docs.push('');
    }

    // Usage example
    docs.push('**Example:**');
    docs.push('');
    docs.push('```typescript');
    docs.push(`// Get the prompt`);
    docs.push(`const prompt = await getPrompt("${prompt.name}", {`);
    if (prompt.arguments && prompt.arguments.length > 0) {
      prompt.arguments.forEach((arg, idx) => {
        const comma = idx < prompt.arguments!.length - 1 ? ',' : '';
        docs.push(`  ${arg.name}: value${comma}`);
      });
    }
    docs.push(`});`);
    docs.push('```');
    docs.push('');
  }

  return docs.join('\n');
}

/**
 * Helper: Format JSON Schema as TypeScript type
 */
function formatJsonSchemaAsTypeScript(schema: any): string {
  if (!schema.properties) {
    return 'any';
  }

  const lines: string[] = ['{'];
  const props = Object.entries(schema.properties);
  const required = schema.required || [];

  props.forEach(([name, prop], idx) => {
    const propSchema = prop as any;
    const type = propSchema.type || 'any';
    const isRequired = required.includes(name);
    const optional = isRequired ? '' : '?';
    const comma = idx < props.length - 1 ? ',' : '';

    if (propSchema.description) {
      lines.push(`  /** ${propSchema.description} */`);
    }
    lines.push(`  ${name}${optional}: ${type}${comma}`);
  });

  lines.push('}');
  return lines.join('\n');
}

/**
 * Helper: Convert snake_case to Title Case
 */
function toTitleCase(snakeCase: string): string {
  return snakeCase
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Helper: Find tools that declare membership in the given skill
 */
function findToolsByMembership(skillName: string, server: BuildMCPServer): string[] {
  const toolNames: string[] = [];

  for (const [name, tool] of server.tools.entries()) {
    const membership = tool.definition.skill;
    if (!membership) continue;

    // Check if skill matches (either single string or array)
    const matches = Array.isArray(membership)
      ? membership.includes(skillName)
      : membership === skillName;

    if (matches) {
      toolNames.push(name);
    }
  }

  return toolNames;
}

/**
 * Helper: Find resources that declare membership in the given skill
 */
function findResourcesByMembership(skillName: string, server: BuildMCPServer): string[] {
  const resourceUris: string[] = [];

  for (const [uri, resource] of server.resources.entries()) {
    const membership = resource.skill;
    if (!membership) continue;

    // Check if skill matches (either single string or array)
    const matches = Array.isArray(membership)
      ? membership.includes(skillName)
      : membership === skillName;

    if (matches) {
      resourceUris.push(uri);
    }
  }

  return resourceUris;
}

/**
 * Helper: Find prompts that declare membership in the given skill
 */
function findPromptsByMembership(skillName: string, server: BuildMCPServer): string[] {
  const promptNames: string[] = [];

  for (const [name, prompt] of server.prompts.entries()) {
    const membership = prompt.skill;
    if (!membership) continue;

    // Check if skill matches (either single string or array)
    const matches = Array.isArray(membership)
      ? membership.includes(skillName)
      : membership === skillName;

    if (matches) {
      promptNames.push(name);
    }
  }

  return promptNames;
}

/**
 * Helper: Deduplicate array of strings (preserving order, keeping first occurrence)
 */
function deduplicateByName(names: string[]): string[] {
  return [...new Set(names)];
}
