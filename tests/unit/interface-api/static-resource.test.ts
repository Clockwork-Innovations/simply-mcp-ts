import path from 'path';
import { fileURLToPath } from 'url';
import { describe, expect, test } from '@jest/globals';
import { loadInterfaceServer } from '../../../src/server/adapter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Interface API static resources', () => {
  const fixturePath = path.resolve(__dirname, '../../fixtures/interface-static-resource.ts');

  test('inlines typed constants as static data', async () => {
    const server = await loadInterfaceServer({ filePath: fixturePath });
    const resources = server.listResources();
    const chartResource = resources.find((resource) => resource.uri === 'pokemon://type-chart');

    expect(chartResource).toBeDefined();

    const contents = await server.readResource('pokemon://type-chart');
    expect(contents?.contents).toBeDefined();

    const textPayload = contents?.contents?.find((item: any) => 'text' in item);
    expect(textPayload).toBeDefined();

    const parsed = JSON.parse((textPayload as { text: string }).text);
    expect(parsed.electric?.[0]).toBe('water');
  });
});
