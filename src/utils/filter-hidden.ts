import type { HiddenEvaluationContext } from '../types/hidden.js';
import { evaluateHidden, type HiddenEvaluationOptions } from './hidden-evaluator.js';

/**
 * Filter out hidden items from a list
 *
 * Generic helper used by all list handlers (tools, resources, prompts, skills).
 * Evaluates hidden predicates and filters items in one pass.
 *
 * @param items List of items to filter
 * @param definitions Map of item definitions (by name or uri)
 * @param getHiddenContext Function to build evaluation context
 * @param options Evaluation options
 * @returns Filtered list with only visible items
 */
export async function filterHiddenItems<
  TItem extends { name?: string; uri?: string },
  TDef extends { definition?: { hidden?: any }; hidden?: any }
>(
  items: TItem[],
  definitions: Map<string, TDef>,
  getHiddenContext: () => HiddenEvaluationContext,
  options?: HiddenEvaluationOptions
): Promise<TItem[]> {
  // Fast path: if no items, return empty array
  if (items.length === 0) {
    return [];
  }

  // Build context once for all evaluations
  const context = getHiddenContext();

  // Evaluate all hidden predicates in parallel
  const evaluations = await Promise.all(
    items.map(async (item) => {
      // Get key (uri for resources, name for tools/prompts/skills)
      // Resources are keyed by URI, tools/prompts/skills are keyed by name
      const key = item.uri || item.name;
      if (!key) return { item, isHidden: false };

      const definition = definitions.get(key);
      // Get hidden from either definition.hidden or definition.definition.hidden
      const hidden = definition?.definition?.hidden ?? definition?.hidden;
      const isHidden = await evaluateHidden(
        hidden,
        context,
        options,
        key
      );
      return { item, isHidden };
    })
  );

  // Filter out hidden items
  return evaluations.filter((e) => !e.isHidden).map((e) => e.item);
}
