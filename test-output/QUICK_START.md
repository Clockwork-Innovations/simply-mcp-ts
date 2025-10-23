# Quick Start: Type Generator

## Usage Example

```typescript
import { parseInterfaceFile } from '../src/api/interface/parser.js';
import { generateDeclarationFile, writeDeclarationFile } from '../src/api/interface/type-generator.js';

// 1. Parse an Interface API file
const parseResult = parseInterfaceFile('examples/interface-minimal.ts');

// 2. Generate .d.ts content
const dtsContent = generateDeclarationFile(parseResult, 'examples/interface-minimal.ts');

// 3. Write to disk
writeDeclarationFile('examples/interface-minimal.ts', dtsContent);

console.log('Generated: examples/interface-minimal.d.ts');
```

## What Gets Generated

**Input** (examples/interface-minimal.ts):
```typescript
interface GreetTool extends ITool {
  name: 'greet';
  description: 'Greet a person by name';
  params: { name: string; formal?: boolean };
  result: string;
}

export default class MinimalServerImpl {
  // User writes without annotations!
  greet(params) {
    const greeting = params.formal ? 'Good day' : 'Hello';
    return `${greeting}, ${params.name}!`;
  }
}
```

**Output** (examples/interface-minimal.d.ts):
```typescript
import type { GreetTool, AddTool, EchoTool } from './interface-minimal.js';

export default class MinimalServerImpl {
  greet(params: GreetTool['params']): Promise<GreetTool['result']>;
  add(params: AddTool['params']): Promise<AddTool['result']>;
  echo(params: EchoTool['params']): Promise<EchoTool['result']>;
}
```

## Benefits

1. **Zero Annotations**: No need to write `ToolHandler<T>` in implementation
2. **Full Type Safety**: TypeScript knows exact parameter and return types
3. **IDE Autocomplete**: Type `params.` to see all available fields
4. **Compile-time Checking**: Wrong types = instant error
5. **Refactor-Friendly**: Changes to interfaces automatically update types

## Run Tests

```bash
npm run test:unit -- type-generator
```

## API Reference

### `generateDeclarationFile(parseResult, sourceFilePath)`
Generates .d.ts content from parsed Interface API metadata.

**Parameters**:
- `parseResult`: Result from `parseInterfaceFile()`
- `sourceFilePath`: Path to source .ts file

**Returns**: String containing .d.ts content

### `getDeclarationFilePath(sourceFilePath)`
Converts source file path to declaration file path.

**Parameters**:
- `sourceFilePath`: Path to source file

**Returns**: Path for .d.ts file (e.g., `server.ts` → `server.d.ts`)

### `writeDeclarationFile(sourceFilePath, dtsContent)`
Writes declaration file to disk alongside source file.

**Parameters**:
- `sourceFilePath`: Path to source file
- `dtsContent`: Declaration content to write

**Throws**: Error if write fails (permissions, disk space, etc.)

## Integration Example

```typescript
// In your CLI or build tool:
import { parseInterfaceFile } from './src/api/interface/parser.js';
import { generateDeclarationFile, writeDeclarationFile } from './src/api/interface/type-generator.js';

export function generateTypesForFile(filePath: string): void {
  const parseResult = parseInterfaceFile(filePath);
  const dtsContent = generateDeclarationFile(parseResult, filePath);
  writeDeclarationFile(filePath, dtsContent);
  console.log(`✓ Generated types for ${filePath}`);
}
```

## Future Enhancements

Not implemented yet (out of scope for foundation layer):

- [ ] Caching based on file modification time
- [ ] Watch mode for auto-regeneration
- [ ] CLI integration (`--generate-types` flag)
- [ ] Support for prompts and resources
- [ ] Include JSDoc comments from interfaces
- [ ] Validation warnings for missing implementations
