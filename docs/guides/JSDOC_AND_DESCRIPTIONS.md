# JSDoc and Descriptions in Simply MCP

> **Complete guide to documenting your MCP tools with JSDoc, descriptions, and parameter annotations**

## Table of Contents

- [Overview](#overview)
- [How Simply MCP Uses JSDoc](#how-simply-mcp-uses-jsdoc)
- [JSDoc Tag Reference](#jsdoc-tag-reference)
- [API Comparison](#api-comparison)
- [JSDoc to MCP Schema Mapping](#jsdoc-to-mcp-schema-mapping)
- [Best Practices](#best-practices)
- [Common Mistakes](#common-mistakes)
- [Complete Examples](#complete-examples)
- [Future Considerations](#future-considerations)
- [Troubleshooting](#troubleshooting)

---

## Overview

### What This Guide Covers

This guide explains how Simply MCP extracts documentation from your code and transforms it into MCP tool schemas. You'll learn:

- How JSDoc comments become tool descriptions
- Which JSDoc tags work (and which don't)
- How parameter descriptions are visible to AI agents
- Best practices for writing effective documentation
- Differences between API styles (Decorator, Functional, Interface)

### Why Documentation Matters

**Parameter descriptions are critical** - they're visible to AI agents when selecting tools. Well-documented tools help AI agents:
- Choose the right tool for the task
- Provide correct arguments
- Understand constraints and formats
- Handle edge cases appropriately

**Example:**
```typescript
// ❌ Poor documentation
add(a: number, b: number): number

// ✅ Good documentation - AI knows exactly what to do
/**
 * Calculate the sum of two numbers
 * @param a - First number to add (any real number)
 * @param b - Second number to add (any real number)
 * @returns The arithmetic sum of a and b
 */
add(a: number, b: number): number
```

---

## How Simply MCP Uses JSDoc

### Extraction Process

Simply MCP automatically extracts JSDoc comments from your code during server initialization:

```
┌─────────────────────────────────┐
│   Your TypeScript Code          │
│   with JSDoc Comments            │
└──────────┬──────────────────────┘
           │
           ▼
┌─────────────────────────────────┐
│   Simply MCP Parser              │
│   - Reads function source        │
│   - Extracts JSDoc comments      │
│   - Parses tags (@param, etc.)   │
└──────────┬──────────────────────┘
           │
           ▼
┌─────────────────────────────────┐
│   MCP Tool Schema                │
│   - Tool description             │
│   - Parameter descriptions       │
│   - Validation rules             │
└─────────────────────────────────┘
```

### What Gets Extracted

Simply MCP extracts these JSDoc elements:

| JSDoc Element | Extracted? | Used in Schema? | Purpose |
|---------------|------------|-----------------|---------|
| **Root comment** | ✅ Yes | ✅ Yes | Tool description |
| **@param tags** | ✅ Yes | ✅ Yes | Parameter descriptions |
| **@returns tag** | ✅ Yes | ❌ No | Documentation only |
| **@example tags** | ✅ Yes | ❌ No | Documentation only |
| **@throws tags** | ✅ Yes | ❌ No | Documentation only |
| **@description tag** | ❌ Not needed | N/A | Use root comment instead |

### Example Extraction

**Your Code:**
```typescript
/**
 * Calculate the area of a rectangle
 *
 * This tool multiplies width by height to get area.
 *
 * @param width - Width in meters (must be positive)
 * @param height - Height in meters (must be positive)
 * @returns Area in square meters
 * @example
 * calculateArea(10, 5) // Returns 50
 */
@tool()
calculateArea(width: number, height: number): number {
  return width * height;
}
```

**Generated Schema:**
```json
{
  "name": "calculate_area",
  "description": "Calculate the area of a rectangle\n\nThis tool multiplies width by height to get area.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "width": {
        "type": "number",
        "description": "Width in meters (must be positive)"
      },
      "height": {
        "type": "number",
        "description": "Height in meters (must be positive)"
      }
    },
    "required": ["width", "height"]
  }
}
```

**Note:** `@returns`, `@example`, and `@throws` are extracted but **not included** in the MCP schema because the MCP specification doesn't currently support `outputSchema` for tools.

---

## JSDoc Tag Reference

### Root Comment (Tool Description)

**Usage:** The first paragraph of the JSDoc comment becomes the tool description.

```typescript
/**
 * This is the tool description.
 * It can span multiple lines and paragraphs.
 *
 * Additional paragraphs are also included.
 */
@tool()
myTool() { }
```

**Do NOT use `@description` tag:**
```typescript
// ❌ Wrong - @description tag is not needed
/**
 * @description This is the tool description
 */
@tool()
myTool() { }

// ✅ Correct - Use root comment
/**
 * This is the tool description
 */
@tool()
myTool() { }
```

### @param Tag (Parameter Descriptions)

**Usage:** Documents function parameters. These become parameter descriptions in the MCP schema.

**Syntax:**
```typescript
@param parameterName - Description of the parameter
```

**Example:**
```typescript
/**
 * Send an email message
 *
 * @param to - Recipient email address
 * @param subject - Email subject line
 * @param body - Email message body (supports HTML)
 * @param cc - Optional CC recipients (comma-separated)
 */
@tool()
sendEmail(to: string, subject: string, body: string, cc?: string) { }
```

**Important Notes:**
- ✅ **DO** include constraints and formats in descriptions
- ✅ **DO** explain what values are valid
- ✅ **DO** mention optional parameters
- ❌ **DON'T** include type information (TypeScript handles this)
- ❌ **DON'T** use `{type}` syntax (it's extracted but not used)

**Advanced Examples:**
```typescript
/**
 * Create a new user account
 *
 * @param username - Username (3-20 characters, alphanumeric only)
 * @param email - Email address (must be valid format)
 * @param age - User's age (must be 13 or older)
 * @param role - User role: 'admin', 'user', or 'guest'
 */
@tool()
createUser(username: string, email: string, age: number, role: string) { }
```

### @returns Tag (Return Value)

**Usage:** Documents the return value. Extracted but **NOT used** in MCP schema.

```typescript
/**
 * Add two numbers
 *
 * @param a - First number
 * @param b - Second number
 * @returns The sum of a and b
 */
@tool()
add(a: number, b: number): number {
  return a + b;
}
```

**Why it's not in the schema:**
The MCP specification doesn't currently have an `outputSchema` field for tools. Return descriptions are extracted for documentation purposes and may be used in the future if MCP adds output schema support.

**Still include it:**
```typescript
// ✅ Good - still include @returns for documentation
/**
 * Fetch user data from database
 *
 * @param userId - User ID to fetch
 * @returns User object with id, name, and email
 */
@tool()
getUser(userId: string) { }
```

### @example Tag (Usage Examples)

**Usage:** Provides usage examples. Extracted but not included in MCP schema.

```typescript
/**
 * Format a date string
 *
 * @param date - Date to format
 * @param format - Format string ('ISO', 'US', 'EU')
 * @returns Formatted date string
 *
 * @example
 * formatDate('2024-01-15', 'US')
 * // Returns: "01/15/2024"
 *
 * @example
 * formatDate('2024-01-15', 'EU')
 * // Returns: "15/01/2024"
 */
@tool()
formatDate(date: string, format: string): string { }
```

**Best for:**
- Complex tools with multiple use cases
- Tools with specific input formats
- Demonstrating edge cases

### @throws Tag (Error Conditions)

**Usage:** Documents errors that may be thrown. Extracted but not included in MCP schema.

```typescript
/**
 * Divide two numbers
 *
 * @param a - Dividend
 * @param b - Divisor
 * @returns Quotient
 *
 * @throws {Error} If divisor is zero
 * @throws {TypeError} If arguments are not numbers
 */
@tool()
divide(a: number, b: number): number {
  if (b === 0) throw new Error('Division by zero');
  return a / b;
}
```

**Use @throws for:**
- Validation errors
- Business logic errors
- External service failures

---

## API Comparison

### Decorator API (JSDoc)

Uses JSDoc comments for all documentation.

```typescript
import { MCPServer, tool } from 'simply-mcp';

@MCPServer()
export default class Calculator {
  /**
   * Add two numbers together
   *
   * @param a - First number to add
   * @param b - Second number to add
   * @returns Sum of a and b
   */
  @tool()
  add(a: number, b: number): number {
    return a + b;
  }
}
```

**Generated Schema:**
```json
{
  "name": "add",
  "description": "Add two numbers together",
  "inputSchema": {
    "type": "object",
    "properties": {
      "a": {
        "type": "number",
        "description": "First number to add"
      },
      "b": {
        "type": "number",
        "description": "Second number to add"
      }
    }
  }
}
```

### Functional API (Zod .describe())

Uses Zod's `.describe()` method for parameter descriptions.

```typescript
import { BuildMCPServer } from 'simply-mcp';
import { z } from 'zod';

const server = new BuildMCPServer({
  name: 'calculator',
  version: '1.0.0'
});

server.addTool({
  name: 'add',
  description: 'Add two numbers together',  // Tool description
  parameters: z.object({
    a: z.number()
      .describe('First number to add'),  // Parameter description
    b: z.number()
      .describe('Second number to add')
  }),
  execute: async (args) => args.a + args.b
});
```

**Generated Schema:**
```json
{
  "name": "add",
  "description": "Add two numbers together",
  "inputSchema": {
    "type": "object",
    "properties": {
      "a": {
        "type": "number",
        "description": "First number to add"
      },
      "b": {
        "type": "number",
        "description": "Second number to add"
      }
    }
  }
}
```

### Interface API (JSDoc on Properties)

Uses JSDoc comments on interface properties.

```typescript
import type { ITool, IServer } from 'simply-mcp';

interface AddTool extends ITool {
  name: 'add';
  description: 'Add two numbers together';
  params: {
    /** First number to add */
    a: number;
    /** Second number to add */
    b: number;
  };
  result: number;
}

interface Calculator extends IServer {
  name: 'calculator';
  version: '1.0.0';
}

export default class CalculatorImpl implements Calculator {
  add: AddTool = async (params) => params.a + params.b;
}
```

**Generated Schema:**
```json
{
  "name": "add",
  "description": "Add two numbers together",
  "inputSchema": {
    "type": "object",
    "properties": {
      "a": {
        "type": "number",
        "description": "First number to add"
      },
      "b": {
        "type": "number",
        "description": "Second number to add"
      }
    }
  }
}
```

### Comparison Table

| Feature | Decorator API | Functional API | Interface API |
|---------|--------------|----------------|---------------|
| **Tool description** | JSDoc root comment | `description` field | `description` property |
| **Parameter descriptions** | `@param` tags | Zod `.describe()` | JSDoc on properties |
| **Validation tags** | Limited support | Full Zod support | JSDoc tags |
| **Documentation style** | JSDoc-centric | Zod-centric | Type-centric |
| **Best for** | Class-based code | Programmatic control | Type-first development |

**All three APIs produce identical MCP schemas** - choose based on your coding style preference!

---

## JSDoc to MCP Schema Mapping

### Visual Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                TypeScript Method with JSDoc                  │
│                                                              │
│  /**                                                         │
│   * Calculate tip amount and total bill    ◄────────┐       │
│   *                                                  │       │
│   * This tool helps calculate restaurant tips       │       │
│   *                                                  │       │
│   * @param billAmount - Bill before tip (dollars) ◄─┼───┐   │
│   * @param tipPercentage - Tip % (0-100)  ◄─────────┼───┼─┐ │
│   * @returns Formatted string with tip and total ◄──┼───┼─│ │
│   *                                                  │   │ │ │
│   * @example                                         │   │ │ │
│   * calculateTip(50, 20)                             │   │ │ │
│   * // Returns: "Tip: $10.00, Total: $60.00"        │   │ │ │
│   */                                                 │   │ │ │
│  @tool()                                             │   │ │ │
│  calculateTip(billAmount: number, tipPercentage: number) {  │
│    const tip = billAmount * (tipPercentage / 100);  │   │ │ │
│    return `Tip: $${tip.toFixed(2)}, Total: $${...}`; │   │ │ │
│  }                                                   │   │ │ │
└──────────────────────────────────────────────────────┼───┼─┼─┘
                                                       │   │ │
                      ┌────────────────────────────────┘   │ │
                      │        ┌───────────────────────────┘ │
                      │        │        ┌────────────────────┘
                      ▼        ▼        ▼
┌─────────────────────────────────────────────────────────────┐
│                    MCP Tool Schema (JSON)                    │
│                                                              │
│  {                                                           │
│    "name": "calculate_tip",                                 │
│    "description": "Calculate tip amount and total bill\n\n  │
│                    This tool helps calculate restaurant tips",│
│    "inputSchema": {                                         │
│      "type": "object",                                      │
│      "properties": {                                        │
│        "billAmount": {                                      │
│          "type": "number",                                  │
│          "description": "Bill before tip (dollars)"   ◄─────┤
│        },                                                   │
│        "tipPercentage": {                                   │
│          "type": "number",                                  │
│          "description": "Tip % (0-100)"  ◄──────────────────┤
│        }                                                    │
│      },                                                     │
│      "required": ["billAmount", "tipPercentage"]            │
│    }                                                        │
│  }                                                          │
│                                                             │
│  NOTE: @returns, @example, @throws are extracted           │
│        but NOT included in schema (MCP spec limitation)    │
└─────────────────────────────────────────────────────────────┘
```

### Mapping Rules

**1. Tool Description:**
- **Source:** Root JSDoc comment (all text before first `@` tag)
- **Target:** `tool.description` field in MCP schema
- **Formatting:** Multiple paragraphs joined with `\n\n`

**2. Parameter Descriptions:**
- **Source:** `@param paramName - description` tags
- **Target:** `inputSchema.properties[paramName].description`
- **Visibility:** Shown to AI agents when selecting tools

**3. Return Value:**
- **Source:** `@returns description` tag
- **Target:** Currently **NOT USED** (extracted but not in schema)
- **Reason:** MCP spec doesn't have `outputSchema` for tools yet

**4. Examples and Errors:**
- **Source:** `@example` and `@throws` tags
- **Target:** Currently **NOT USED** (extracted but not in schema)
- **Purpose:** Documentation and future use

### Type Information

TypeScript types are used for validation, **not JSDoc type annotations**:

```typescript
// ❌ Wrong - JSDoc type ignored
/**
 * @param {number} age - User's age
 */
@tool()
setAge(age: string) { }  // TypeScript type (string) is used

// ✅ Correct - TypeScript type is source of truth
/**
 * @param age - User's age
 */
@tool()
setAge(age: number) { }  // TypeScript number type is used
```

---

## Best Practices

### 1. Write Clear, Concise Descriptions

**Tool descriptions:**
```typescript
// ❌ Too vague
/** Does stuff with numbers */
@tool()
process(x: number) { }

// ✅ Clear and specific
/** Calculate the factorial of a positive integer */
@tool()
factorial(n: number) { }
```

**Parameter descriptions:**
```typescript
// ❌ Just repeating the name
/** @param username - The username */

// ✅ Adds valuable context
/** @param username - Username (3-20 chars, alphanumeric only) */
```

### 2. Always Document Parameters

Parameter descriptions are **visible to AI agents** - they're critical!

```typescript
// ❌ No parameter descriptions
/**
 * Create a user account
 */
@tool()
createUser(username: string, email: string, role: string) { }

// ✅ Well-documented parameters
/**
 * Create a user account
 *
 * @param username - Username (3-20 characters, alphanumeric and underscore only)
 * @param email - Email address (must be valid email format)
 * @param role - User role: 'admin', 'editor', 'viewer'
 */
@tool()
createUser(username: string, email: string, role: string) { }
```

### 3. Include Constraints and Formats

Help AI agents provide correct values:

```typescript
/**
 * Schedule a meeting
 *
 * @param date - Meeting date (ISO 8601 format: YYYY-MM-DD)
 * @param time - Meeting time (24-hour format: HH:MM)
 * @param duration - Duration in minutes (15, 30, 45, or 60)
 * @param attendees - Attendee emails (comma-separated)
 */
@tool()
scheduleMeeting(
  date: string,
  time: string,
  duration: number,
  attendees: string
) { }
```

### 4. Use Examples for Complex Tools

```typescript
/**
 * Search files with advanced filters
 *
 * @param query - Search query (supports wildcards: *, ?)
 * @param path - Search path (use / for root)
 * @param extensions - File extensions (e.g., "ts,js,json")
 * @param maxResults - Maximum results (1-100, default: 10)
 *
 * @example
 * searchFiles("*.ts", "/src", "ts", 20)
 * // Finds up to 20 TypeScript files in /src
 *
 * @example
 * searchFiles("test*", "/", "ts,js", 50)
 * // Finds test files in all directories
 */
@tool()
searchFiles(
  query: string,
  path: string,
  extensions: string,
  maxResults: number = 10
) { }
```

### 5. Document Error Conditions

```typescript
/**
 * Divide two numbers
 *
 * @param a - Dividend (numerator)
 * @param b - Divisor (denominator, cannot be zero)
 * @returns Quotient
 *
 * @throws {Error} If divisor is zero
 */
@tool()
divide(a: number, b: number): number {
  if (b === 0) throw new Error('Division by zero');
  return a / b;
}
```

### 6. Keep Descriptions Scannable

AI agents process many tool descriptions quickly. Make yours easy to scan:

```typescript
// ❌ Wall of text
/**
 * This tool allows you to send an email message to one or more recipients
 * by providing the recipient email address, a subject line for the email,
 * the body content of the email message, and optionally a list of CC recipients
 */
@tool()
sendEmail(to: string, subject: string, body: string, cc?: string) { }

// ✅ Structured and scannable
/**
 * Send an email message
 *
 * Delivers email to specified recipients with subject and body content.
 * Supports optional CC recipients.
 *
 * @param to - Recipient email address
 * @param subject - Email subject line
 * @param body - Email message body (supports HTML)
 * @param cc - Optional CC recipients (comma-separated emails)
 */
@tool()
sendEmail(to: string, subject: string, body: string, cc?: string) { }
```

### 7. Use Consistent Formatting

Pick a style and stick with it:

```typescript
// Option A: Brief descriptions
/** @param name - User's full name */

// Option B: Detailed descriptions
/** @param name - User's full name (first and last, 2-50 characters) */

// Choose one style and use it consistently across your server
```

---

## Common Mistakes

### 1. Using @description Tag

```typescript
// ❌ Wrong - @description tag is not needed
/**
 * @description Add two numbers
 */
@tool()
add(a: number, b: number) { }

// ✅ Correct - Use root comment
/**
 * Add two numbers
 */
@tool()
add(a: number, b: number) { }
```

### 2. Missing Parameter Descriptions

```typescript
// ❌ Missing parameter docs
/**
 * Create a new user
 */
@tool()
createUser(username: string, email: string) { }

// ✅ Document all parameters
/**
 * Create a new user
 *
 * @param username - Username (3-20 chars)
 * @param email - Email address
 */
@tool()
createUser(username: string, email: string) { }
```

### 3. Expecting @returns in Schema

```typescript
// ⚠️ Common misconception
/**
 * Get user by ID
 *
 * @param userId - User ID
 * @returns User object with id, name, email  ← NOT in schema!
 */
@tool()
getUser(userId: string) { }
```

**Reality:** `@returns` is extracted but **not included in MCP tool schema** because MCP spec doesn't support `outputSchema` yet.

**Still include it** for documentation purposes!

### 4. Using JSDoc Type Syntax

```typescript
// ❌ JSDoc type annotations are ignored
/**
 * @param {number} age - User's age
 */
@tool()
setAge(age: string) { }  // TypeScript type wins

// ✅ Correct - rely on TypeScript types
/**
 * @param age - User's age
 */
@tool()
setAge(age: number) { }  // Type from TypeScript
```

### 5. Incomplete Constraint Information

```typescript
// ❌ Vague constraints
/** @param age - User's age (must be valid) */

// ✅ Specific constraints
/** @param age - User's age (13-120, must be integer) */
```

### 6. Duplicating Type Information

```typescript
// ❌ Redundant type information
/** @param count - The count parameter (number) */

// ✅ Add value beyond the type
/** @param count - Number of items to fetch (1-100) */
```

### 7. Inconsistent Naming

```typescript
// ❌ Mismatch between @param and parameter
/**
 * @param userName - User name  ← Wrong name
 */
@tool()
greet(username: string) { }  // ← Actual parameter

// ✅ Names must match exactly
/**
 * @param username - User name
 */
@tool()
greet(username: string) { }
```

---

## Complete Examples

### Example 1: Simple Tool

**Code:**
```typescript
import { MCPServer, tool } from 'simply-mcp';

@MCPServer()
export default class Calculator {
  /**
   * Add two numbers
   *
   * @param a - First number
   * @param b - Second number
   * @returns Sum of a and b
   */
  @tool()
  add(a: number, b: number): number {
    return a + b;
  }
}
```

**Generated Schema:**
```json
{
  "name": "add",
  "description": "Add two numbers",
  "inputSchema": {
    "type": "object",
    "properties": {
      "a": {
        "type": "number",
        "description": "First number"
      },
      "b": {
        "type": "number",
        "description": "Second number"
      }
    },
    "required": ["a", "b"]
  }
}
```

### Example 2: Complex Tool with Validation

**Code:**
```typescript
/**
 * Create a new user account
 *
 * Creates a user in the system with the specified credentials
 * and role. Username must be unique.
 *
 * @param username - Username (3-20 chars, alphanumeric and underscore only)
 * @param email - Email address (must be valid email format)
 * @param password - Password (minimum 8 characters, must include letter and number)
 * @param role - User role: 'admin', 'editor', or 'viewer'
 * @param fullName - User's full name (optional)
 * @returns User object with ID and creation timestamp
 *
 * @example
 * createUser('john_doe', 'john@example.com', 'pass123', 'editor', 'John Doe')
 * // Returns: { id: 'usr_123', username: 'john_doe', createdAt: '2024-01-15T10:30:00Z' }
 *
 * @throws {Error} If username is already taken
 * @throws {Error} If email format is invalid
 * @throws {Error} If password doesn't meet requirements
 */
@tool()
createUser(
  username: string,
  email: string,
  password: string,
  role: string,
  fullName?: string
): object {
  // Implementation...
  return {
    id: 'usr_123',
    username,
    email,
    role,
    fullName,
    createdAt: new Date().toISOString()
  };
}
```

**Generated Schema:**
```json
{
  "name": "create_user",
  "description": "Create a new user account\n\nCreates a user in the system with the specified credentials and role. Username must be unique.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "username": {
        "type": "string",
        "description": "Username (3-20 chars, alphanumeric and underscore only)"
      },
      "email": {
        "type": "string",
        "description": "Email address (must be valid email format)"
      },
      "password": {
        "type": "string",
        "description": "Password (minimum 8 characters, must include letter and number)"
      },
      "role": {
        "type": "string",
        "description": "User role: 'admin', 'editor', or 'viewer'"
      },
      "fullName": {
        "type": "string",
        "description": "User's full name (optional)"
      }
    },
    "required": ["username", "email", "password", "role"]
  }
}
```

### Example 3: Functional API Equivalent

**Code:**
```typescript
import { BuildMCPServer } from 'simply-mcp';
import { z } from 'zod';

const server = new BuildMCPServer({
  name: 'user-manager',
  version: '1.0.0'
});

server.addTool({
  name: 'create_user',
  description: 'Create a new user account\n\nCreates a user in the system with the specified credentials and role. Username must be unique.',
  parameters: z.object({
    username: z.string()
      .min(3)
      .max(20)
      .regex(/^[a-zA-Z0-9_]+$/)
      .describe('Username (3-20 chars, alphanumeric and underscore only)'),

    email: z.string()
      .email()
      .describe('Email address (must be valid email format)'),

    password: z.string()
      .min(8)
      .describe('Password (minimum 8 characters, must include letter and number)'),

    role: z.enum(['admin', 'editor', 'viewer'])
      .describe("User role: 'admin', 'editor', or 'viewer'"),

    fullName: z.string()
      .optional()
      .describe("User's full name (optional)")
  }),
  execute: async (args) => {
    // Implementation...
    return {
      id: 'usr_123',
      username: args.username,
      email: args.email,
      role: args.role,
      fullName: args.fullName,
      createdAt: new Date().toISOString()
    };
  }
});
```

**Generated Schema:** (Identical to Decorator API example above)

### Example 4: Interface API Equivalent

**Code:**
```typescript
import type { ITool, IServer } from 'simply-mcp';

interface CreateUserTool extends ITool {
  name: 'create_user';
  description: 'Create a new user account\n\nCreates a user in the system with the specified credentials and role. Username must be unique.';
  params: {
    /**
     * Username (3-20 chars, alphanumeric and underscore only)
     * @minLength 3
     * @maxLength 20
     * @pattern ^[a-zA-Z0-9_]+$
     */
    username: string;

    /**
     * Email address (must be valid email format)
     * @format email
     */
    email: string;

    /**
     * Password (minimum 8 characters, must include letter and number)
     * @minLength 8
     */
    password: string;

    /**
     * User role: 'admin', 'editor', or 'viewer'
     */
    role: 'admin' | 'editor' | 'viewer';

    /**
     * User's full name (optional)
     */
    fullName?: string;
  };
  result: {
    id: string;
    username: string;
    email: string;
    role: string;
    fullName?: string;
    createdAt: string;
  };
}

interface UserManager extends IServer {
  name: 'user-manager';
  version: '1.0.0';
}

export default class UserManagerImpl implements UserManager {
  createUser: CreateUserTool = async (params) => {
    // Implementation...
    return {
      id: 'usr_123',
      username: params.username,
      email: params.email,
      role: params.role,
      fullName: params.fullName,
      createdAt: new Date().toISOString()
    };
  };
}
```

**Generated Schema:** (Identical to Decorator and Functional API examples)

---

## Future Considerations

### Output Schema Support

Currently, `@returns` is extracted but **not used** in MCP tool schemas because the MCP specification doesn't have an `outputSchema` field.

**If MCP adds output schema support in the future:**

```typescript
/**
 * Get user by ID
 *
 * @param userId - User ID
 * @returns User object with id, name, and email
 */
@tool()
getUser(userId: string) { }
```

**Could generate:**
```json
{
  "name": "get_user",
  "description": "Get user by ID",
  "inputSchema": { /* ... */ },
  "outputSchema": {  // ← Future addition
    "type": "object",
    "description": "User object with id, name, and email",
    "properties": {
      "id": { "type": "string" },
      "name": { "type": "string" },
      "email": { "type": "string" }
    }
  }
}
```

### Enhanced Metadata

Future versions of Simply MCP could extract additional JSDoc tags:

- `@deprecated` - Mark tools as deprecated
- `@since` - Version when tool was added
- `@see` - Links to related tools
- `@category` - Tool categorization

### Type Inference Improvements

Current limitations that may be improved:
- Literal union types (`'a' | 'b' | 'c'`) → Better enum detection
- Complex object types → Detailed nested schemas
- Generic types → Type parameter resolution

---

## Troubleshooting

### JSDoc Not Being Extracted

**Problem:** JSDoc comments are ignored, tool has no description.

**Solution 1:** Check JSDoc syntax
```typescript
// ❌ Wrong - single-line comment
// This is the tool description
@tool()
myTool() { }

// ✅ Correct - JSDoc block comment
/**
 * This is the tool description
 */
@tool()
myTool() { }
```

**Solution 2:** Place JSDoc directly above method
```typescript
// ❌ Wrong - separated by decorator
@tool()
/**
 * Description
 */
myMethod() { }

// ✅ Correct - JSDoc above decorator
/**
 * Description
 */
@tool()
myMethod() { }
```

### Parameter Descriptions Not Showing

**Problem:** Parameter descriptions are missing in schema.

**Solution 1:** Check parameter name match
```typescript
// ❌ Wrong - name mismatch
/**
 * @param userName - The user's name  ← Wrong
 */
@tool()
greet(username: string) { }  // ← Actual parameter name

// ✅ Correct - names match exactly
/**
 * @param username - The user's name
 */
@tool()
greet(username: string) { }
```

**Solution 2:** Use correct syntax
```typescript
// ❌ Wrong - missing dash separator
/**
 * @param name Description here
 */

// ✅ Correct - include dash
/**
 * @param name - Description here
 */
```

### Tool Description is Empty

**Problem:** Tool has no description in schema.

**Solution 1:** Add root comment
```typescript
// ❌ No description
@tool()
myTool() { }

// ✅ Add JSDoc comment
/**
 * This is the tool description
 */
@tool()
myTool() { }
```

**Solution 2:** Don't use @description tag
```typescript
// ❌ Wrong - @description not supported
/**
 * @description My tool description
 */
@tool()
myTool() { }

// ✅ Correct - use root comment
/**
 * My tool description
 */
@tool()
myTool() { }
```

### Functional API: Descriptions Not Working

**Problem:** Using JSDoc with Functional API doesn't work.

**Solution:** Use Zod `.describe()` instead
```typescript
// ❌ Wrong - JSDoc doesn't work with Functional API
server.addTool({
  name: 'greet',
  // JSDoc is ignored here!
  parameters: z.object({
    name: z.string()  // No description
  }),
  execute: async (args) => `Hello, ${args.name}!`
});

// ✅ Correct - Use Zod .describe()
server.addTool({
  name: 'greet',
  description: 'Greet a user',  // Tool description
  parameters: z.object({
    name: z.string()
      .describe('Name of person to greet')  // Parameter description
  }),
  execute: async (args) => `Hello, ${args.name}!`
});
```

### Validation Not Working

**Problem:** JSDoc validation tags like `@min` don't work.

**Solution:** Use appropriate API
```typescript
// ❌ Decorator API has limited validation
/**
 * @param age - User's age
 * @min 13  ← Not supported in Decorator API
 */
@tool()
setAge(age: number) { }

// ✅ Option 1: Use Functional API with Zod
server.addTool({
  name: 'set_age',
  parameters: z.object({
    age: z.number()
      .min(13)
      .max(120)
      .describe('User\'s age (13-120)')
  }),
  execute: async (args) => { /* ... */ }
});

// ✅ Option 2: Use Interface API with validation tags
interface SetAgeTool extends ITool {
  name: 'set_age';
  params: {
    /**
     * User's age (13-120)
     * @minimum 13
     * @maximum 120
     */
    age: number;
  };
  result: void;
}
```

---

## Summary

### Key Takeaways

1. **Root comment = Tool description** (no `@description` tag needed)
2. **`@param` tags = Parameter descriptions** (visible to AI agents)
3. **`@returns` is extracted but NOT in schema** (MCP spec limitation)
4. **Three APIs, one result** (Decorator/JSDoc, Functional/Zod, Interface/JSDoc)
5. **Parameter descriptions matter** (AI agents use them for tool selection)

### Quick Reference

**Decorator API:**
```typescript
/**
 * Tool description
 * @param x - Parameter description
 * @returns Return description (not in schema)
 */
@tool()
myTool(x: string) { }
```

**Functional API:**
```typescript
server.addTool({
  description: 'Tool description',
  parameters: z.object({
    x: z.string().describe('Parameter description')
  }),
  execute: async (args) => { /* ... */ }
});
```

**Interface API:**
```typescript
interface MyTool extends ITool {
  description: 'Tool description';
  params: {
    /** Parameter description */
    x: string;
  };
}
```

### Learn More

- [Decorator API Guide](./DECORATOR_API_GUIDE.md) - Full Decorator API documentation
- [Functional API Guide](./FUNCTIONAL_API_GUIDE.md) - Complete Functional API reference
- [Interface API Guide](./INTERFACE_API_GUIDE.md) - Interface API patterns
- [Main README](../../README.md) - Framework overview

---

**Questions or feedback?** Open an issue on [GitHub](https://github.com/Clockwork-Innovations/simply-mcp-ts/issues)!
