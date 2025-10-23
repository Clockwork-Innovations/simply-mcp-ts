# IParam Error Guide

This guide shows all the helpful error messages you'll see if you make common mistakes with the IParam system.

## Error 1: Missing Type Field

**What triggers it:** Defining an IParam interface without the required `type` field.

**Error Message:**
```
❌ IParam Error in interface 'NameParam':

Interface extends IParam but is missing the required 'type' field.

❌ INCORRECT (missing type field):
  interface NameParam extends IParam {
    description: 'Some description';
    minLength: 1;  // Has constraints but no type field
  }

✅ CORRECT (with type field):
  interface NameParam extends IParam {
    type: 'string';  // ✅ Required type field
    description: 'Some description';
    minLength: 1;
  }

💡 Tip: All IParam interfaces must specify a literal 'type' field.
   Valid types: 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object' | 'null'
```

---

## Error 2: Inline Object Literal in Array Items

**What triggers it:** Using an inline object literal for `items` instead of a separate interface.

**Error Message:**
```
❌ IParam Error in interface 'TagsParam':

The 'items' property uses an inline object literal, which won't parse correctly.

❌ INCORRECT (inline object literal):
  interface TagsParam extends IParam {
    type: 'array';
    items: { type: 'string'; description: '...' };  // ❌ Inline literal
  }

✅ CORRECT (separate interface):
  interface TagsParamItem extends IParam {
    type: 'string';
    description: '...';
  }

  interface TagsParam extends IParam {
    type: 'array';
    items: TagsParamItem;  // ✅ Reference to interface
  }

💡 Tip: Always define nested IParam structures as separate interfaces.
```

---

## Error 3: Inline Object Literal in Object Properties

**What triggers it:** Using an inline object literal for object properties instead of separate interfaces.

**Error Message:**
```
❌ IParam Error in interface 'UserParam':

Property 'name' in 'properties' uses an inline object literal, which won't parse correctly.

❌ INCORRECT (inline object literal):
  interface UserParam extends IParam {
    type: 'object';
    properties: {
      name: { type: 'string'; description: '...' };  // ❌ Inline literal
    };
  }

✅ CORRECT (separate interface):
  interface UserParamNameParam extends IParam {
    type: 'string';
    description: '...';
  }

  interface UserParam extends IParam {
    type: 'object';
    properties: {
      name: UserParamNameParam;  // ✅ Reference
    };
  }

💡 Tip: Always define nested IParam structures as separate interfaces.
```

---

## Error 4: Array Without Items Property

**What triggers it:** Defining an IParam with type 'array' without the required `items` property.

**Error Message:**
```
❌ IParam Error in interface 'TagsParam':

Array type is missing the required 'items' property.

❌ INCORRECT (missing items):
  interface TagsParam extends IParam {
    type: 'array';
    description: 'Array of items';
    // ❌ Missing items property
  }

✅ CORRECT (with items):
  interface TagsParamItem extends IParam {
    type: 'string';
    description: 'Single item';
  }

  interface TagsParam extends IParam {
    type: 'array';
    description: 'Array of items';
    items: TagsParamItem;  // ✅ Required for arrays
  }

💡 Tip: Array IParam requires an 'items' property to define the array element schema.
```

---

## Error 5: Object Without Properties Field

**What triggers it:** Defining an IParam with type 'object' without the required `properties` field.

**Error Message:**
```
❌ IParam Error in interface 'UserParam':

Object type is missing the required 'properties' field.

❌ INCORRECT (missing properties):
  interface UserParam extends IParam {
    type: 'object';
    description: 'User data';
    // ❌ Missing properties field
  }

✅ CORRECT (with properties):
  interface NameParam extends IParam {
    type: 'string';
    description: 'User name';
  }

  interface UserParam extends IParam {
    type: 'object';
    description: 'User data';
    properties: {
      name: NameParam;  // ✅ Define object properties
    };
  }

💡 Tip: Object IParam requires a 'properties' field to define the object schema.
```

---

## Quick Rules to Avoid Errors

1. **Always add the `type` field** - Every IParam interface needs `type: 'string' | 'number' | ...`
2. **Use separate interfaces for nested structures** - Never use inline `{ type: '...' }` literals
3. **Arrays need `items`** - IParam with type 'array' requires an `items` property
4. **Objects need `properties`** - IParam with type 'object' requires a `properties` field
5. **Follow naming conventions** - Use `ParamNameItem` for array items, `ParamNamePropName` for object properties

---

## Testing Error Messages

You can use the `test-iparam-errors.ts` file to see these error messages in action. Just uncomment each error case one at a time and run:

```bash
npx simply-mcp run test-iparam-errors.ts
```

The framework will show you exactly what's wrong and how to fix it!
