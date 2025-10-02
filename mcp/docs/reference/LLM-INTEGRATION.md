# LLM Self-Healing Error Messages

## Overview

The MCP framework now provides **LLM-optimized error messages** designed to enable autonomous error correction. When a tool call fails validation, the LLM receives comprehensive information to fix the error without human intervention.

## Before vs After

### ❌ Before (Not LLM-Friendly)

```
Validation Error:
age: Number must be at least 18
email: Invalid email format
```

**Problem**: LLM doesn't know:
- What the full schema is
- What values are allowed
- How to fix the specific issues
- What a valid request looks like

### ✅ After (LLM-Friendly)

```
❌ Tool 'create-user' received invalid arguments. 3 validation error(s) found.

## Issues Found:

1. **username**: String must be at least 3 characters
   - Received: "ab"
   - Expected: string
   - Fix: Provide a string with at least 3 characters and at most 20 characters and matching pattern ^[a-zA-Z0-9_]+$.

2. **email**: Invalid email format
   - Received: "not-an-email"
   - Expected: valid value
   - Fix: Provide a string in email format.

3. **age**: Number must be at least 18
   - Received: 15
   - Expected: minimum 18
   - Fix: Provide a integer >= 18 and <= 120.

## Tool Schema:

**Description**: Create a new user with comprehensive validation

**Required fields**: username, email, age, role

**Properties**:
- **username** (string): Username (3-20 chars, alphanumeric + underscore)
  Constraints: Min length: 3, Max length: 20, Pattern: ^[a-zA-Z0-9_]+$
  Examples: "example"
- **email** (string): User email address
  Constraints: Format: email
  Examples: "user@example.com"
- **age** (integer): Age (18-120)
  Constraints: Minimum: 18, Maximum: 120
  Examples: 69
- **role** (string): User role
  Constraints: Must be one of: "admin", "moderator", "user", "guest"
  Examples: "admin"
- **tags** (array): User tags (1-5 unique tags)
  Constraints: Min items: 1, Max items: 5, Items must be unique
  Examples: [["example"]]

## Suggestions:

1. Check that numeric values and string lengths are within the allowed range
2. Use only allowed enum values (see the schema for valid options)
3. Review the validExample below for a correctly formatted request

## Valid Example:

```json
{
  "username": "example",
  "email": "user@example.com",
  "age": 69,
  "role": "admin",
  "tags": ["example"]
}
```
```

**Result**: LLM can now:
✅ See exactly what went wrong
✅ Understand the full schema
✅ Get actionable fix instructions
✅ Copy a working example
✅ Self-correct and retry

---

## Error Response Structure

```typescript
{
  error: {
    type: 'validation',
    summary: 'Tool XYZ received invalid arguments. N validation error(s) found.',

    // Detailed issues with fixes
    issues: [
      {
        field: 'age',
        problem: 'Number must be at least 18',
        received: 15,
        expected: 'minimum 18',
        fix: 'Provide a integer >= 18 and <= 120.'
      }
    ],

    // Complete schema documentation
    schema: {
      description: 'Tool description',
      properties: {
        age: {
          type: 'integer',
          description: 'Age in years',
          constraints: ['Minimum: 18', 'Maximum: 120'],
          examples: [69]
        }
      },
      required: ['age'],
      examples: [{ age: 25 }]
    },

    // Actionable suggestions
    suggestions: [
      'Add missing required fields: email, username',
      'Check that numeric values are within the allowed range',
      'Review the validExample below'
    ],

    // Complete working example
    validExample: {
      age: 25,
      email: 'user@example.com',
      username: 'john_doe'
    }
  }
}
```

---

## Features

### 1. Field-Level Details

For each error, the LLM sees:
- **Field name**: Which property is wrong
- **Problem**: What the validation error is
- **Received**: What value was actually sent
- **Expected**: What type/format is expected
- **Fix**: Specific instruction on how to correct it

### 2. Complete Schema Documentation

The LLM receives:
- **Description**: What the tool does
- **Required fields**: Which fields are mandatory
- **All properties**: Full documentation of each field
- **Constraints**: All validation rules (min/max, patterns, formats, etc.)
- **Examples**: Valid example values for each field

### 3. Smart Fix Instructions

Dynamically generated based on the constraint type:

| Constraint | Fix Instruction |
|------------|----------------|
| `minLength: 3` | "Provide a string with at least 3 characters" |
| `minimum: 18, maximum: 120` | "Provide a integer >= 18 and <= 120" |
| `format: email` | "Provide a string in email format" |
| `enum: [a, b, c]` | "Use one of these values: 'a', 'b', 'c'" |
| `multipleOf: 5` | "Provide a integer multiple of 5" |
| `uniqueItems: true` | "Provide an array of string with all items must be unique" |

### 4. Categorized Suggestions

Intelligent suggestions based on error types:
- Missing required fields
- Type errors
- Format errors
- Range errors
- Enum errors
- General guidance

### 5. Valid Example

A complete, working example that:
- Includes all required fields
- Uses valid values within constraints
- Demonstrates proper formatting
- Can be used as a template

---

## Self-Healing Workflow

```
1. LLM calls tool with arguments
           ↓
2. Validation fails
           ↓
3. LLM receives enhanced error message
           ↓
4. LLM analyzes:
   - What went wrong (issues)
   - What's expected (schema)
   - How to fix (fix instructions)
   - What works (valid example)
           ↓
5. LLM corrects arguments automatically
           ↓
6. LLM retries tool call
           ↓
7. ✅ Success!
```

---

## Examples

### Example 1: Type Error

**Bad Request:**
```json
{
  "temperature": "hot",
  "unit": "celsius"
}
```

**LLM-Friendly Error:**
```
❌ Tool 'set-temperature' received invalid arguments. 1 validation error(s) found.

## Issues Found:

1. **temperature**: Expected number, received string
   - Received: "hot"
   - Expected: number
   - Fix: Provide a number > -273.15 and <= 1000.

## Valid Example:
```json
{
  "temperature": 363.425,
  "unit": "celsius"
}
```

**LLM Self-Correction:**
```json
{
  "temperature": 25.5,
  "unit": "celsius"
}
```

---

### Example 2: Enum Error

**Bad Request:**
```json
{
  "role": "superadmin"
}
```

**LLM-Friendly Error:**
```
❌ Tool 'create-user' received invalid arguments. 1 validation error(s) found.

## Issues Found:

1. **role**: Invalid enum value
   - Received: "superadmin"
   - Expected: 'admin' | 'moderator' | 'user' | 'guest'
   - Fix: Use one of these values: "admin", "moderator", "user", "guest"

## Suggestions:
1. Use only allowed enum values (see the schema for valid options)
```

**LLM Self-Correction:**
```json
{
  "role": "admin"
}
```

---

### Example 3: Multiple Errors

**Bad Request:**
```json
{
  "username": "a",
  "email": "invalid",
  "age": 5
}
```

**LLM-Friendly Error:**
```
❌ Tool 'create-user' received invalid arguments. 3 validation error(s) found.

## Issues Found:

1. **username**: String must be at least 3 characters
   - Received: "a"
   - Expected: string
   - Fix: Provide a string with at least 3 characters and at most 20 characters.

2. **email**: Invalid email format
   - Received: "invalid"
   - Expected: valid value
   - Fix: Provide a string in email format.

3. **age**: Number must be at least 18
   - Received: 5
   - Expected: minimum 18
   - Fix: Provide a integer >= 18 and <= 120.

## Valid Example:
```json
{
  "username": "john_doe",
  "email": "user@example.com",
  "age": 25,
  "role": "user"
}
```

**LLM Self-Correction:**
```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "age": 25
}
```

---

## Testing

Test the LLM-friendly errors:

```bash
# Run the test script
bash mcp/test-llm-errors.sh

# Or manually test
curl -X POST http://localhost:3005/mcp \
  -H "Content-Type: application/json" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "create-user",
      "arguments": {
        "username": "ab",
        "email": "not-an-email"
      }
    }
  }'
```

---

## Benefits

### For LLMs
✅ **Autonomous error correction** - No human intervention needed
✅ **Clear guidance** - Know exactly what to fix
✅ **Quick resolution** - Get it right on retry
✅ **Learning** - Understand the schema better

### For Developers
✅ **Better UX** - LLM agents work more reliably
✅ **Less debugging** - Errors are self-explanatory
✅ **Faster development** - Clear error messages help development
✅ **Production-ready** - LLMs can handle edge cases

### For Users
✅ **Seamless experience** - Errors fixed automatically
✅ **Fewer failures** - LLM self-corrects
✅ **Faster responses** - Less back-and-forth
✅ **Reliable tools** - Works right the first (or second) time

---

## Configuration

LLM-friendly errors are **enabled by default** in `configurableServer.ts`. No configuration needed!

To customize error messages, edit:
- `mcp/validation/LLMFriendlyErrors.ts` - Error formatting
- `mcp/configurableServer.ts` - Integration point

---

## Summary

Your MCP framework now provides **enterprise-grade LLM self-healing** with:

1. ✅ Detailed error diagnostics
2. ✅ Complete schema documentation
3. ✅ Actionable fix instructions
4. ✅ Valid examples
5. ✅ Intelligent suggestions
6. ✅ Zero configuration

**Result**: LLM agents can autonomously fix validation errors and retry, dramatically improving reliability and user experience! 🚀
