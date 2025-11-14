/**
 * Warning Formatter
 *
 * Formats validation warnings for console output with colors and grouping.
 */

import type { ValidationWarning } from './types.js';
import chalk from 'chalk';

/**
 * Get human-readable rule name from rule ID
 */
function getRuleName(rule: string): string {
  const names: Record<string, string> = {
    'orphaned-hidden-tool': 'Orphaned Hidden Tool',
    'orphaned-hidden-resource': 'Orphaned Hidden Resource',
    'orphaned-hidden-prompt': 'Orphaned Hidden Prompt',
    'invalid-tool-reference': 'Invalid Tool Reference',
    'invalid-resource-reference': 'Invalid Resource Reference',
    'invalid-prompt-reference': 'Invalid Prompt Reference',
    'non-hidden-component': 'Non-Hidden Component',
    'empty-skill-components': 'Empty Skill Components'
  };
  return names[rule] || rule;
}

/**
 * Get related items label from rule ID
 */
function getRelatedItemsLabel(rule: string): string {
  if (rule.includes('tool')) return 'tools';
  if (rule.includes('resource')) return 'resources';
  if (rule.includes('prompt')) return 'prompts';
  if (rule.includes('skill')) return 'skills';
  return 'items';
}

/**
 * Indent text by specified number of spaces
 */
function indentText(text: string, spaces: number): string {
  const indent = ' '.repeat(spaces);
  return text.split('\n').map(line => indent + line).join('\n');
}

/**
 * Format a single warning
 */
function formatWarning(warning: ValidationWarning): string {
  const icon = warning.severity === 'error' ? '❌' : '⚠️';
  const color = warning.severity === 'error' ? chalk.red : chalk.yellow;
  const label = warning.severity === 'error' ? 'ERROR' : 'WARNING';

  let output = '';

  // Header
  output += color.bold(`${icon}  ${label}: ${getRuleName(warning.rule)}\n\n`);

  // Message
  output += chalk.white(warning.message) + '\n\n';

  // Location (if available)
  if (warning.file) {
    const location = warning.line
      ? `${warning.file}:${warning.line}`
      : warning.file;
    output += chalk.gray(`Location: ${location}\n\n`);
  }

  // Suggestion (if available)
  if (warning.suggestion) {
    output += chalk.cyan('Suggested fixes:\n');
    output += chalk.white(indentText(warning.suggestion, 2)) + '\n\n';
  }

  // Related items (if available)
  if (warning.relatedItems && warning.relatedItems.length > 0) {
    output += chalk.gray(`Available ${getRelatedItemsLabel(warning.rule)}:\n`);
    for (const item of warning.relatedItems.slice(0, 10)) {
      output += chalk.gray(`  • ${item}\n`);
    }
    if (warning.relatedItems.length > 10) {
      output += chalk.gray(`  ... and ${warning.relatedItems.length - 10} more\n`);
    }
    output += '\n';
  }

  return output;
}

/**
 * Group warnings by rule
 */
function groupByRule(warnings: ValidationWarning[]): Map<string, ValidationWarning[]> {
  const grouped = new Map<string, ValidationWarning[]>();

  for (const warning of warnings) {
    if (!grouped.has(warning.rule)) {
      grouped.set(warning.rule, []);
    }
    grouped.get(warning.rule)!.push(warning);
  }

  return grouped;
}

/**
 * Format summary line
 */
function formatSummary(warnings: ValidationWarning[]): string {
  const errorCount = warnings.filter(w => w.severity === 'error').length;
  const warningCount = warnings.filter(w => w.severity === 'warning').length;

  let summary = '\n' + chalk.bold('Summary: ');

  if (errorCount > 0) {
    summary += chalk.red(`${errorCount} error${errorCount > 1 ? 's' : ''}`);
  }

  if (warningCount > 0) {
    if (errorCount > 0) summary += ', ';
    summary += chalk.yellow(`${warningCount} warning${warningCount > 1 ? 's' : ''}`);
  }

  summary += '\n\n';

  return summary;
}

/**
 * Format multiple warnings with grouping and summary
 */
export function formatWarnings(warnings: ValidationWarning[]): string {
  if (warnings.length === 0) {
    return chalk.green('✓ No skill validation warnings\n');
  }

  let output = '';

  // Group by rule
  const grouped = groupByRule(warnings);

  // Format each group
  for (const [rule, ruleWarnings] of grouped) {
    output += chalk.bold(`\n${'='.repeat(70)}\n`);
    output += chalk.bold(`${getRuleName(rule)} (${ruleWarnings.length})\n`);
    output += chalk.bold(`${'='.repeat(70)}\n\n`);

    for (const warning of ruleWarnings) {
      output += formatWarning(warning);
      output += chalk.gray('─'.repeat(70)) + '\n\n';
    }
  }

  // Summary
  output += formatSummary(warnings);

  return output;
}
