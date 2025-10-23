# IParam Quick Reference Guide

Quick reference for the new IParam system in simply-mcp v3.2+

## Basic Usage Pattern

```typescript
import type { ITool, IServer, IParam } from 'simply-mcp';

// 1. Define your parameter interfaces
interface EmailParam extends IParam {
  type: 'string';
  description: 'Email address';
  format: 'email';
  required: true;
}

// 2. Use in tool definition
interface MyTool extends ITool {
  name: 'my_tool';
  description: 'My tool description';
  params: {
    email: EmailParam;
  };
  result: { success: boolean };
}

// 3. Implement in server class
export default class MyServer implements IServer {
  myTool: MyTool = async (params) => {
    // params.email is fully typed!
    return { success: true };
  };
}
```

## All IParam Types

### String Parameters
```typescript
interface MyStringParam extends IParam {
  type: 'string';
  description: 'Description here';
  required: true; // or false

  // Optional constraints:
  minLength?: number;
  maxLength?: number;
  pattern?: string; // regex
  format?: 'email' | 'url' | 'uuid' | 'date-time' | 'uri' | 'ipv4' | 'ipv6';
  enum?: string[]; // Note: Use TS unions instead
}
```

### Number Parameters
```typescript
interface MyNumberParam extends IParam {
  type: 'number'; // or 'integer'
  description: 'Description here';
  required: true;

  // Optional constraints:
  min?: number;
  max?: number;
  exclusiveMin?: number;
  exclusiveMax?: number;
  multipleOf?: number;
}
```

### Boolean Parameters
```typescript
interface MyBooleanParam extends IParam {
  type: 'boolean';
  description: 'Description here';
  required: true;
}
```

### Array Parameters
```typescript
// Step 1: Define item type
interface ItemParam extends IParam {
  type: 'string';
  description: 'Item description';
}

// Step 2: Define array
interface MyArrayParam extends IParam {
  type: 'array';
  description: 'Array description';
  items: ItemParam; // Reference the interface!
  required: true;

  // Optional constraints:
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
}
```

### Object Parameters
```typescript
// Step 1: Define property types
interface PropAParam extends IParam {
  type: 'string';
  description: 'Property A';
}

interface PropBParam extends IParam {
  type: 'number';
  description: 'Property B';
}

// Step 2: Define object
interface MyObjectParam extends IParam {
  type: 'object';
  description: 'Object description';
  properties: {
    propA: PropAParam;
    propB: PropBParam;
  };
  requiredProperties: ['propA']; // Optional: array of required props
  required: true;

  // Optional:
  additionalProperties?: boolean;
}
```

## Common Patterns

### Email Validation
```typescript
interface EmailParam extends IParam {
  type: 'string';
  description: 'Email address';
  format: 'email';
  required: true;
}
```

### URL Validation
```typescript
interface UrlParam extends IParam {
  type: 'string';
  description: 'Website URL';
  format: 'url';
  required: true;
}
```

### Username (alphanumeric)
```typescript
interface UsernameParam extends IParam {
  type: 'string';
  description: 'Username';
  pattern: '^[a-zA-Z0-9]+$';
  minLength: 3;
  maxLength: 20;
  required: true;
}
```

### Age (integer 0-150)
```typescript
interface AgeParam extends IParam {
  type: 'integer';
  description: 'Age in years';
  min: 0;
  max: 150;
  required: true;
}
```

### Price (positive number)
```typescript
interface PriceParam extends IParam {
  type: 'number';
  description: 'Price in dollars';
  exclusiveMin: 0;
  required: true;
}
```

### String Array with Validation
```typescript
interface TagItemParam extends IParam {
  type: 'string';
  description: 'A tag';
  minLength: 1;
  maxLength: 50;
}

interface TagsParam extends IParam {
  type: 'array';
  description: 'User tags';
  items: TagItemParam;
  minItems: 1;
  maxItems: 10;
  required: true;
}
```

### Nested Object (Address)
```typescript
interface StreetParam extends IParam {
  type: 'string';
  description: 'Street address';
  minLength: 1;
}

interface CityParam extends IParam {
  type: 'string';
  description: 'City';
  minLength: 1;
}

interface AddressParam extends IParam {
  type: 'object';
  description: 'Mailing address';
  properties: {
    street: StreetParam;
    city: CityParam;
  };
  requiredProperties: ['street', 'city'];
  required: true;
}
```

## Mixed Usage

You can freely mix IParam types with regular TypeScript types:

```typescript
interface MyTool extends ITool {
  name: 'my_tool';
  description: 'Tool with mixed params';
  params: {
    // IParam types for validation
    email: EmailParam;
    age: AgeParam;
    
    // Regular TypeScript types
    name: string;
    role: 'admin' | 'user' | 'guest';
    active?: boolean;
    metadata?: {
      created: string;
      updated: string;
    };
  };
  result: { success: boolean };
}
```

## Do's and Don'ts

### ✅ DO

1. **Define nested structures as separate interfaces**
   ```typescript
   interface ItemParam extends IParam {
     type: 'string';
     ...
   }
   interface ArrayParam extends IParam {
     type: 'array';
     items: ItemParam; // ✅ Reference
   }
   ```

2. **Use explicit type fields**
   ```typescript
   type: 'string' // ✅ Explicit
   ```

3. **Mix with regular TypeScript types**
   ```typescript
   params: {
     email: EmailParam, // IParam
     name: string       // Regular TS
   }
   ```

4. **Use TypeScript unions for enums**
   ```typescript
   status: 'active' | 'inactive' | 'pending'
   ```

### ❌ DON'T

1. **Don't use inline object literals**
   ```typescript
   items: { type: 'string' } // ❌ Inline
   ```

2. **Don't forget the type field**
   ```typescript
   interface MyParam extends IParam {
     // ❌ Missing: type: 'string';
     description: 'My param';
   }
   ```

3. **Don't use IParam.enum (use TS unions instead)**
   ```typescript
   // ❌ enum: ['a', 'b', 'c']
   // ✅ Use: type Status = 'a' | 'b' | 'c'
   ```

## Testing Your IParam Definitions

Run the test file to verify your definitions work:

```bash
node test-new-iparam-correct.mjs
```

This will show the generated JSON schemas and verify all constraints are properly extracted.

## Benefits

1. **Type Safety** - Full TypeScript checking
2. **Self-Documenting** - Descriptions in the type
3. **Better LLM Accuracy** - Rich metadata in JSON Schema
4. **IDE Support** - Autocomplete and inline docs
5. **Validation** - Automatic Zod schema generation

## More Examples

See the test files for complete working examples:
- `test-new-iparam-correct.mjs` - Best practices
- `test-new-iparam.mjs` - Exploratory (shows limitations)
- `TEST-NEW-IPARAM-README.md` - Full documentation
