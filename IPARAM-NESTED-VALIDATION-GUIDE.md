# IParam Nested Validation Guide

This guide explains how Simply-MCP handles **nested validation** for complex data structures using the unified IParam interface.

## Table of Contents

1. [Overview](#overview)
2. [How Nested Validation Works](#how-nested-validation-works)
3. [Supported Nesting Patterns](#supported-nesting-patterns)
4. [Best Practices](#best-practices)
5. [Testing](#testing)

---

## Overview

The IParam system supports **recursive schema generation**, allowing you to validate deeply nested data structures with full type safety and constraint validation at every level.

### Key Features

- ✅ **Nested Objects** - Objects containing other objects (unlimited depth)
- ✅ **Arrays of Objects** - Arrays where each item is a validated object
- ✅ **Objects with Arrays** - Objects containing validated arrays
- ✅ **Arrays of Arrays** - Multi-dimensional arrays with validation
- ✅ **Mixed Nesting** - Combinations of all the above
- ✅ **Validation at Every Level** - Constraints apply recursively

---

## How Nested Validation Works

The schema generator in `src/api/interface/schema-generator.ts` processes IParam interfaces **recursively**:

### For Arrays (lines 657-681)

1. Extracts the `items` property from the IParam interface
2. Recursively calls `typeNodeToZodSchema()` on the items type
3. Applies array-level constraints (`minItems`, `maxItems`, `uniqueItems`)
4. Returns a fully validated Zod array schema

### For Objects (lines 684-715)

1. Extracts the `properties` field from the IParam interface
2. **Recursively processes each property** (line 689)
3. Applies object-level constraints (`additionalProperties`, `requiredProperties`)
4. Returns a fully validated Zod object schema

### Error Detection (lines 248-310)

The system detects **inline object literals** (a common mistake) and throws helpful error messages:

```
❌ IParam Error in interface 'BadTagsParam':

The 'items' property uses an inline object literal, which won't parse correctly.

❌ INCORRECT (inline object literal):
  interface BadTagsParam extends IParam {
    type: 'array';
    items: { type: 'string'; description: '...' };  // ❌ Inline literal
  }

✅ CORRECT (separate interface):
  interface BadTagsParamItem extends IParam {
    type: 'string';
    description: '...';
  }

  interface BadTagsParam extends IParam {
    type: 'array';
    items: BadTagsParamItem;  // ✅ Reference to interface
  }
```

---

## Supported Nesting Patterns

### 1. Nested Objects (2 Levels)

```typescript
import type { ITool, IParam, IServer } from 'simply-mcp';

// Level 2: Street component
interface StreetParam extends IParam {
  type: 'string';
  description: 'Street address';
  minLength: 1;
  maxLength: 200;
}

// Level 2: City component
interface CityParam extends IParam {
  type: 'string';
  description: 'City name';
  minLength: 1;
  maxLength: 100;
}

// Level 1: Address object
interface AddressParam extends IParam {
  type: 'object';
  description: 'Mailing address';
  properties: {
    street: StreetParam;
    city: CityParam;
  };
  requiredProperties: ['street', 'city'];
}

interface CreateUserTool extends ITool {
  name: 'create_user';
  description: 'Create user with address';
  params: {
    name: string;
    address: AddressParam;
  };
  result: { userId: string };
}
```

**Validation Example:**

```typescript
// ✅ Valid - all constraints satisfied
await server.executeTool('create_user', {
  name: 'Alice',
  address: {
    street: '123 Main St',
    city: 'New York',
  },
});

// ❌ Invalid - street violates minLength: 1
await server.executeTool('create_user', {
  name: 'Bob',
  address: {
    street: '', // Too short!
    city: 'Boston',
  },
});
```

---

### 2. Nested Objects (3 Levels)

You can nest as deeply as needed:

```typescript
// Level 3: Coordinates
interface LatParam extends IParam {
  type: 'number';
  description: 'Latitude';
  min: -90;
  max: 90;
}

interface LonParam extends IParam {
  type: 'number';
  description: 'Longitude';
  min: -180;
  max: 180;
}

interface CoordinatesParam extends IParam {
  type: 'object';
  description: 'GPS coordinates';
  properties: {
    lat: LatParam;
    lon: LonParam;
  };
  requiredProperties: ['lat', 'lon'];
}

// Level 2: Address with coordinates
interface AddressParam extends IParam {
  type: 'object';
  description: 'Address with GPS';
  properties: {
    street: StreetParam;
    coordinates: CoordinatesParam;
  };
  requiredProperties: ['street', 'coordinates'];
}
```

**Validation Example:**

```typescript
// ✅ Valid
await server.executeTool('create_user', {
  name: 'Alice',
  address: {
    street: '123 Main St',
    coordinates: {
      lat: 40.7128,
      lon: -74.006,
    },
  },
});

// ❌ Invalid - lat exceeds max: 90
await server.executeTool('create_user', {
  name: 'Bob',
  address: {
    street: '456 Elm St',
    coordinates: {
      lat: 100, // Out of range!
      lon: -74.006,
    },
  },
});
```

---

### 3. Arrays of Objects

Each array item is validated as an object:

```typescript
// Object schema for array items
interface TagNameParam extends IParam {
  type: 'string';
  description: 'Tag name';
  minLength: 1;
  maxLength: 50;
}

interface TagColorParam extends IParam {
  type: 'string';
  description: 'Tag color (hex)';
  pattern: '^#[0-9A-Fa-f]{6}$';
}

interface TagItemParam extends IParam {
  type: 'object';
  description: 'A single tag with metadata';
  properties: {
    name: TagNameParam;
    color: TagColorParam;
  };
  requiredProperties: ['name', 'color'];
}

// Array of objects
interface TagsParam extends IParam {
  type: 'array';
  description: 'List of tags';
  items: TagItemParam;
  minItems: 1;
  maxItems: 10;
}
```

**Validation Example:**

```typescript
// ✅ Valid
await server.executeTool('tag_user', {
  userId: 'user-123',
  tags: [
    { name: 'developer', color: '#FF5733' },
    { name: 'designer', color: '#33FF57' },
  ],
});

// ❌ Invalid - color doesn't match hex pattern
await server.executeTool('tag_user', {
  userId: 'user-456',
  tags: [
    { name: 'admin', color: 'red' }, // Invalid pattern!
  ],
});

// ❌ Invalid - tag name exceeds maxLength
await server.executeTool('tag_user', {
  userId: 'user-789',
  tags: [
    { name: 'a'.repeat(51), color: '#ABCDEF' }, // Too long!
  ],
});
```

---

### 4. Objects Containing Arrays

Objects can have array properties:

```typescript
// Array of phone numbers
interface PhoneItemParam extends IParam {
  type: 'string';
  description: 'Phone number';
  pattern: '^\\+?[0-9]{10,15}$';
}

interface PhonesParam extends IParam {
  type: 'array';
  description: 'Phone numbers';
  items: PhoneItemParam;
  minItems: 1;
  maxItems: 5;
}

// Array of emails
interface EmailItemParam extends IParam {
  type: 'string';
  description: 'Email address';
  format: 'email';
}

interface EmailsParam extends IParam {
  type: 'array';
  description: 'Email addresses';
  items: EmailItemParam;
  minItems: 1;
}

// Object containing multiple arrays
interface ContactInfoParam extends IParam {
  type: 'object';
  description: 'Contact information';
  properties: {
    phones: PhonesParam;
    emails: EmailsParam;
  };
  requiredProperties: ['phones', 'emails'];
}
```

**Validation Example:**

```typescript
// ✅ Valid
await server.executeTool('update_contact', {
  userId: 'user-123',
  contact: {
    phones: ['+15551234567', '+15559876543'],
    emails: ['alice@example.com', 'alice.work@example.com'],
  },
});

// ❌ Invalid - phone pattern mismatch
await server.executeTool('update_contact', {
  userId: 'user-456',
  contact: {
    phones: ['invalid-phone'], // Doesn't match regex!
    emails: ['bob@example.com'],
  },
});

// ❌ Invalid - email format violation
await server.executeTool('update_contact', {
  userId: 'user-789',
  contact: {
    phones: ['+15551234567'],
    emails: ['not-an-email'], // Invalid email format!
  },
});
```

---

### 5. Arrays of Arrays

Multi-dimensional arrays:

```typescript
// Inner array element
interface NumberItemParam extends IParam {
  type: 'integer';
  description: 'A number';
  min: 0;
  max: 100;
}

// Inner array
interface NumberArrayParam extends IParam {
  type: 'array';
  description: 'Array of numbers';
  items: NumberItemParam;
  minItems: 1;
  maxItems: 5;
}

// Outer array (array of arrays)
interface MatrixParam extends IParam {
  type: 'array';
  description: 'Matrix (array of arrays)';
  items: NumberArrayParam;
  minItems: 1;
  maxItems: 3;
}
```

**Validation Example:**

```typescript
// ✅ Valid
await server.executeTool('process_matrix', {
  matrix: [
    [1, 2, 3],
    [4, 5, 6],
  ],
});

// ❌ Invalid - inner value exceeds max: 100
await server.executeTool('process_matrix', {
  matrix: [[1, 2, 101]], // Out of range!
});

// ❌ Invalid - inner array exceeds maxItems: 5
await server.executeTool('process_matrix', {
  matrix: [[1, 2, 3, 4, 5, 6]], // Too many items!
});

// ❌ Invalid - outer array exceeds maxItems: 3
await server.executeTool('process_matrix', {
  matrix: [
    [1],
    [2],
    [3],
    [4], // Too many rows!
  ],
});
```

---

### 6. Mixed Nesting (Object → Array → Object)

Complex real-world scenarios:

```typescript
// Level 3: Product details
interface ProductNameParam extends IParam {
  type: 'string';
  description: 'Product name';
  minLength: 1;
  maxLength: 100;
}

interface ProductPriceParam extends IParam {
  type: 'number';
  description: 'Product price';
  exclusiveMin: 0; // Must be greater than 0
}

interface ProductParam extends IParam {
  type: 'object';
  description: 'Product in order';
  properties: {
    name: ProductNameParam;
    price: ProductPriceParam;
  };
  requiredProperties: ['name', 'price'];
}

// Level 2: Array of products
interface ProductsParam extends IParam {
  type: 'array';
  description: 'Products in order';
  items: ProductParam;
  minItems: 1;
  maxItems: 50;
}

// Level 1: Order object
interface OrderParam extends IParam {
  type: 'object';
  description: 'Customer order';
  properties: {
    products: ProductsParam;
  };
  requiredProperties: ['products'];
}
```

**Validation Example:**

```typescript
// ✅ Valid
await server.executeTool('create_order', {
  customerId: 'cust-456',
  order: {
    products: [
      { name: 'Widget A', price: 19.99 },
      { name: 'Widget B', price: 29.99 },
    ],
  },
});

// ❌ Invalid - price must be > 0 (exclusiveMin)
await server.executeTool('create_order', {
  customerId: 'cust-789',
  order: {
    products: [{ name: 'Free Item', price: 0 }], // Price must be > 0!
  },
});

// ❌ Invalid - product name exceeds maxLength
await server.executeTool('create_order', {
  customerId: 'cust-999',
  order: {
    products: [{ name: 'x'.repeat(101), price: 9.99 }], // Name too long!
  },
});
```

---

## Best Practices

### 1. Always Use Separate Interfaces

❌ **INCORRECT** - Inline object literals won't parse:

```typescript
interface BadTagsParam extends IParam {
  type: 'array';
  items: { type: 'string'; description: 'A tag' }; // ❌ Inline literal
}
```

✅ **CORRECT** - Define nested structures as separate interfaces:

```typescript
interface TagItemParam extends IParam {
  type: 'string';
  description: 'A tag';
}

interface TagsParam extends IParam {
  type: 'array';
  items: TagItemParam; // ✅ Reference to interface
}
```

### 2. Use Descriptive Interface Names

Follow naming conventions:

- **Array items**: `{ParentName}Item` (e.g., `TagsParamItem`)
- **Object properties**: `{ParentName}{PropName}Param` (e.g., `UserEmailParam`)

### 3. Apply Constraints at the Right Level

```typescript
// Constraint on individual items
interface PhoneItemParam extends IParam {
  type: 'string';
  pattern: '^\\+?[0-9]{10,15}$'; // ✅ Item-level constraint
}

// Constraint on the array itself
interface PhonesParam extends IParam {
  type: 'array';
  items: PhoneItemParam;
  minItems: 1; // ✅ Array-level constraint
  maxItems: 5; // ✅ Array-level constraint
}
```

### 4. Use `requiredProperties` for Objects

Always specify which object properties are required:

```typescript
interface AddressParam extends IParam {
  type: 'object';
  properties: {
    street: StreetParam;
    city: CityParam;
    zipCode: ZipParam; // Optional
  };
  requiredProperties: ['street', 'city']; // ✅ Explicit requirements
}
```

### 5. Leverage All Constraint Types

Take advantage of IParam's rich constraint system:

- **Strings**: `minLength`, `maxLength`, `pattern`, `format`, `enum`
- **Numbers**: `min`, `max`, `exclusiveMin`, `exclusiveMax`, `multipleOf`
- **Arrays**: `minItems`, `maxItems`, `uniqueItems`
- **Objects**: `requiredProperties`, `additionalProperties`

---

## Testing

### Running the Test Suite

```bash
# Run comprehensive nested validation tests
node test-iparam-nested.mjs
```

### Test Coverage

The test suite (`test-iparam-nested.mjs`) covers:

1. ✅ Nested objects (2 levels) - valid data
2. ✅ Nested objects (2 levels) - validation errors
3. ✅ Nested objects (3 levels) - deep nesting
4. ✅ Arrays of objects - item validation
5. ✅ Objects containing arrays - array property validation
6. ✅ Arrays of arrays - multi-dimensional validation
7. ✅ Error detection - inline literal warnings

### Expected Output

```
================================================================================
IPARAM NESTED VALIDATION TEST SUITE
================================================================================

✅ Nested objects (2 levels) - valid data
✅ Nested objects (2 levels) - validation error on nested field
✅ Nested objects (3 levels) - deeply nested validation
✅ Arrays of objects - validation on array items
✅ Objects containing arrays - nested array validation
✅ Arrays of arrays - nested array validation
✅ Error detection - inline array items logs warning

================================================================================
TEST RESULTS
================================================================================
✅ Passed: 7
❌ Failed: 0
📊 Total:  7

🎉 ALL TESTS PASSED!
```

---

## Summary

The IParam system provides **comprehensive nested validation** through:

1. **Recursive schema generation** - Handles unlimited nesting depth
2. **Full constraint validation** - Applies at every level
3. **Helpful error messages** - Guides developers to correct usage
4. **Type safety** - Full TypeScript support throughout
5. **Flexible patterns** - Supports all common nesting scenarios

For more information, see:

- [IParam Quick Reference](IPARAM-QUICK-REFERENCE.md)
- [IParam Error Guide](IPARAM-ERROR-GUIDE.md)
- [Interface API Reference](docs/guides/INTERFACE_API_REFERENCE.md)
