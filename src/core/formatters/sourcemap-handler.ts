import { writeFile } from 'fs/promises';
import { join } from 'path';

export type SourceMapMode = 'inline' | 'external' | 'both';

export interface SourceMapOptions {
  bundlePath: string;
  sourceMapContent: string;
  mode: SourceMapMode;
}

/**
 * Handle source map generation
 */
export async function handleSourceMap(
  options: SourceMapOptions
): Promise<{ inline: boolean; external: string | null }> {
  const { bundlePath, sourceMapContent, mode } = options;

  let inlineSourceMap = false;
  let externalSourceMapPath: string | null = null;

  switch (mode) {
    case 'inline':
      inlineSourceMap = true;
      break;

    case 'external':
      externalSourceMapPath = await writeExternalSourceMap(bundlePath, sourceMapContent);
      break;

    case 'both':
      inlineSourceMap = true;
      externalSourceMapPath = await writeExternalSourceMap(bundlePath, sourceMapContent);
      break;
  }

  return { inline: inlineSourceMap, external: externalSourceMapPath };
}

/**
 * Write external source map
 */
async function writeExternalSourceMap(
  bundlePath: string,
  sourceMapContent: string
): Promise<string> {
  const sourceMapPath = `${bundlePath}.map`;
  await writeFile(sourceMapPath, sourceMapContent);
  return sourceMapPath;
}

/**
 * Inline source map into bundle
 */
export function inlineSourceMap(bundleCode: string, sourceMapContent: string): string {
  const base64SourceMap = Buffer.from(sourceMapContent).toString('base64');
  const sourceMappingURL = `//# sourceMappingURL=data:application/json;base64,${base64SourceMap}`;
  return `${bundleCode}\n${sourceMappingURL}`;
}
