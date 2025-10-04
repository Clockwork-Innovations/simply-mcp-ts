# MCP Tool Validation Guide

Complete guide to all validation constraints available in the MCP framework.

## Table of Contents

1. [String Validation](#string-validation)
2. [Number Validation](#number-validation)
3. [Array Validation](#array-validation)
4. [Object Validation](#object-validation)
5. [Enum Validation](#enum-validation)
6. [Format Validation](#format-validation)
7. [Advanced Validation](#advanced-validation)
8. [Real-World Examples](#real-world-examples)

---

## String Validation

### Length Constraints

```json
{
  "username": {
    "type": "string",
    "minLength": 3,
    "maxLength": 20,
    "description": "Username between 3-20 characters"
  }
}
```

### Pattern Matching (Regex)

```json
{
  "zipCode": {
    "type": "string",
    "pattern": "^\\d{5}(-\\d{4})?$",
    "description": "US ZIP code (12345 or 12345-6789)"
  },
  "username": {
    "type": "string",
    "pattern": "^[a-zA-Z0-9_]+$",
    "description": "Alphanumeric with underscores only"
  },
  "hexColor": {
    "type": "string",
    "pattern": "^#[0-9A-Fa-f]{6}$",
    "description": "Hex color code"
  }
}
```

### Format Validation

Built-in formats with automatic validation:

```json
{
  "email": {
    "type": "string",
    "format": "email",
    "description": "Valid email address"
  },
  "website": {
    "type": "string",
    "format": "url",
    "description": "Valid URL"
  },
  "id": {
    "type": "string",
    "format": "uuid",
    "description": "UUID v4"
  },
  "timestamp": {
    "type": "string",
    "format": "date-time",
    "description": "ISO 8601 datetime"
  },
  "birthDate": {
    "type": "string",
    "format": "date",
    "description": "Date in YYYY-MM-DD format"
  },
  "appointmentTime": {
    "type": "string",
    "format": "time",
    "description": "Time in HH:MM:SS format"
  }
}
```

---

## Number Validation

### Range Constraints (Inclusive)

```json
{
  "age": {
    "type": "integer",
    "minimum": 0,
    "maximum": 120,
    "description": "Age between 0-120"
  },
  "price": {
    "type": "number",
    "minimum": 0,
    "description": "Non-negative price"
  }
}
```

### Range Constraints (Exclusive)

```json
{
  "temperature": {
    "type": "number",
    "exclusiveMinimum": -273.15,
    "maximum": 1000,
    "description": "Must be > -273.15 (absolute zero) and <= 1000"
  },
  "probability": {
    "type": "number",
    "exclusiveMinimum": 0,
    "exclusiveMaximum": 1,
    "description": "Between 0 and 1 (exclusive)"
  }
}
```

### Multiple Of

```json
{
  "price": {
    "type": "number",
    "multipleOf": 0.01,
    "description": "Price with cent precision"
  },
  "discount": {
    "type": "integer",
    "minimum": 0,
    "maximum": 100,
    "multipleOf": 5,
    "description": "Discount in 5% increments (0, 5, 10, ..., 100)"
  }
}
```

---

## Array Validation

### Array Length

```json
{
  "tags": {
    "type": "array",
    "items": { "type": "string" },
    "minItems": 1,
    "maxItems": 5,
    "description": "1-5 tags"
  }
}
```

### Unique Items

```json
{
  "categories": {
    "type": "array",
    "items": { "type": "string" },
    "uniqueItems": true,
    "description": "No duplicate categories allowed"
  }
}
```

### Typed Arrays

```json
{
  "scores": {
    "type": "array",
    "items": {
      "type": "integer",
      "minimum": 0,
      "maximum": 100
    },
    "minItems": 3,
    "description": "At least 3 scores (0-100)"
  },
  "users": {
    "type": "array",
    "items": {
      "type": "object",
      "properties": {
        "name": { "type": "string" },
        "age": { "type": "integer" }
      },
      "required": ["name"]
    },
    "description": "Array of user objects"
  }
}
```

---

## Object Validation

### Required Properties

```json
{
  "type": "object",
  "properties": {
    "name": { "type": "string" },
    "email": { "type": "string", "format": "email" },
    "age": { "type": "integer" }
  },
  "required": ["name", "email"]
}
```

### Additional Properties

```json
{
  "type": "object",
  "properties": {
    "name": { "type": "string" }
  },
  "additionalProperties": false,
  "description": "Only 'name' property allowed, reject unknown properties"
}
```

---

## Enum Validation

### String Enums

```json
{
  "status": {
    "type": "string",
    "enum": ["pending", "active", "inactive", "archived"],
    "description": "User status"
  },
  "role": {
    "type": "string",
    "enum": ["admin", "moderator", "user", "guest"],
    "enumNames": ["Administrator", "Moderator", "Regular User", "Guest"],
    "description": "User role (enumNames for display)"
  }
}
```

### Number Enums

```json
{
  "priority": {
    "type": "integer",
    "enum": [1, 2, 3, 4, 5],
    "description": "Priority level (1=lowest, 5=highest)"
  },
  "rating": {
    "type": "number",
    "enum": [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5],
    "description": "Rating in 0.5 increments"
  }
}
```

---

## Format Validation

Supported formats with automatic validation:

| Format | Description | Example |
|--------|-------------|---------|
| `email` | Email address | `user@example.com` |
| `url`, `uri` | Valid URL | `https://example.com` |
| `uuid` | UUID v4 | `123e4567-e89b-12d3-a456-426614174000` |
| `date-time` | ISO 8601 datetime | `2024-01-01T12:00:00Z` |
| `date` | Date (YYYY-MM-DD) | `2024-01-01` |
| `time` | Time (HH:MM:SS) | `12:30:45` |
| `hostname` | DNS hostname | `example.com` |
| `ipv4` | IPv4 address | `192.168.1.1` |
| `ipv6` | IPv6 address | `2001:0db8::1` |

---

## Advanced Validation

### Union Types

Allow multiple types:

```json
{
  "value": {
    "type": ["string", "number"],
    "description": "Can be string OR number"
  },
  "id": {
    "type": ["string", "integer"],
    "description": "String or integer ID"
  }
}
```

### Const (Exact Value)

```json
{
  "version": {
    "const": "1.0.0",
    "description": "Must be exactly '1.0.0'"
  }
}
```

### OneOf (Exclusive Choice)

```json
{
  "payment": {
    "oneOf": [
      {
        "type": "object",
        "properties": {
          "type": { "const": "credit_card" },
          "cardNumber": { "type": "string" }
        },
        "required": ["type", "cardNumber"]
      },
      {
        "type": "object",
        "properties": {
          "type": { "const": "paypal" },
          "email": { "type": "string", "format": "email" }
        },
        "required": ["type", "email"]
      }
    ]
  }
}
```

### AnyOf (At Least One)

```json
{
  "contact": {
    "anyOf": [
      { "required": ["email"] },
      { "required": ["phone"] }
    ],
    "properties": {
      "email": { "type": "string", "format": "email" },
      "phone": { "type": "string" }
    },
    "description": "Must have email OR phone (or both)"
  }
}
```

### AllOf (Intersection)

```json
{
  "admin": {
    "allOf": [
      {
        "type": "object",
        "properties": {
          "name": { "type": "string" }
        }
      },
      {
        "type": "object",
        "properties": {
          "adminLevel": { "type": "integer", "minimum": 1 }
        }
      }
    ]
  }
}
```

---

## Real-World Examples

### 1. User Registration

```json
{
  "name": "register-user",
  "inputSchema": {
    "type": "object",
    "properties": {
      "username": {
        "type": "string",
        "minLength": 3,
        "maxLength": 20,
        "pattern": "^[a-zA-Z0-9_]+$"
      },
      "email": {
        "type": "string",
        "format": "email"
      },
      "password": {
        "type": "string",
        "minLength": 8,
        "pattern": "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)",
        "description": "Min 8 chars, must contain lowercase, uppercase, and digit"
      },
      "age": {
        "type": "integer",
        "minimum": 13,
        "maximum": 120
      },
      "country": {
        "type": "string",
        "pattern": "^[A-Z]{2}$",
        "description": "ISO 3166-1 alpha-2 country code"
      }
    },
    "required": ["username", "email", "password", "age"]
  }
}
```

### 2. E-commerce Product

```json
{
  "name": "create-product",
  "inputSchema": {
    "type": "object",
    "properties": {
      "name": {
        "type": "string",
        "minLength": 1,
        "maxLength": 100
      },
      "price": {
        "type": "number",
        "minimum": 0,
        "multipleOf": 0.01
      },
      "sku": {
        "type": "string",
        "pattern": "^[A-Z0-9]{8,12}$"
      },
      "category": {
        "type": "string",
        "enum": ["electronics", "clothing", "books", "food", "other"]
      },
      "tags": {
        "type": "array",
        "items": { "type": "string", "minLength": 1 },
        "minItems": 1,
        "maxItems": 10,
        "uniqueItems": true
      },
      "inStock": {
        "type": "boolean"
      },
      "quantity": {
        "type": "integer",
        "minimum": 0
      }
    },
    "required": ["name", "price", "sku", "category"]
  }
}
```

### 3. API Configuration

```json
{
  "name": "configure-api",
  "inputSchema": {
    "type": "object",
    "properties": {
      "apiKey": {
        "type": "string",
        "format": "uuid"
      },
      "endpoint": {
        "type": "string",
        "format": "url"
      },
      "timeout": {
        "type": "integer",
        "minimum": 1000,
        "maximum": 60000,
        "multipleOf": 1000,
        "description": "Timeout in milliseconds (1-60 seconds)"
      },
      "retries": {
        "type": "integer",
        "minimum": 0,
        "maximum": 5
      },
      "rateLimitPerMinute": {
        "type": "integer",
        "minimum": 1,
        "maximum": 1000
      },
      "headers": {
        "type": "object",
        "additionalProperties": { "type": "string" }
      }
    },
    "required": ["apiKey", "endpoint"]
  }
}
```

### 4. Scheduling System

```json
{
  "name": "schedule-task",
  "inputSchema": {
    "type": "object",
    "properties": {
      "taskName": {
        "type": "string",
        "minLength": 1,
        "maxLength": 100
      },
      "startDate": {
        "type": "string",
        "format": "date"
      },
      "startTime": {
        "type": "string",
        "format": "time"
      },
      "recurrence": {
        "type": "string",
        "enum": ["once", "daily", "weekly", "monthly", "yearly"]
      },
      "priority": {
        "type": "integer",
        "enum": [1, 2, 3, 4, 5]
      },
      "assignees": {
        "type": "array",
        "items": {
          "type": "string",
          "format": "email"
        },
        "minItems": 1,
        "maxItems": 10,
        "uniqueItems": true
      }
    },
    "required": ["taskName", "startDate", "startTime"]
  }
}
```

---

## Validation Error Messages

When validation fails, you get detailed error messages:

```
Validation Error:
username: String must be at least 3 characters
email: Invalid email format
age: Number must be at least 18
role: Invalid enum value. Expected 'admin' | 'moderator' | 'user' | 'guest', received 'superadmin'
tags: Array must contain at least 1 items
tags: Array items must be unique
```

---

## Testing Your Validation

Use the provided example config:

```bash
# Start server with validation examples
npx tsx mcp/configurableServer.ts mcp/config-validation-examples.json

# Test with curl
curl -X POST http://localhost:3005/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": { "name": "test", "version": "1.0.0" }
    }
  }'
```

**See also:**
- [API-EXAMPLES.md](./API-EXAMPLES.md) - Complete client examples (curl, TypeScript, Python)
- [TESTING.md](./TESTING.md) - Testing guide and test suite documentation

---

## Summary

✅ **All JSON Schema 7 validation features are supported**
✅ **Automatic Zod conversion with caching**
✅ **Clear, descriptive error messages**
✅ **No code changes needed - just update config**
✅ **Type-safe with full TypeScript support**

Your validation infrastructure is **production-ready** and supports all standard validation patterns!

---

# Quick Reference

## String Constraints

```json
{
  "type": "string",
  "minLength": 3,          // Min characters
  "maxLength": 20,         // Max characters
  "pattern": "^[A-Z]+$",   // Regex pattern
  "format": "email",       // Built-in format
  "enum": ["a", "b", "c"]  // Allowed values
}
```

**Formats**: `email`, `url`, `uuid`, `date-time`, `date`, `time`, `hostname`, `ipv4`, `ipv6`

---

## Number Constraints

```json
{
  "type": "number",        // or "integer"
  "minimum": 0,            // Inclusive min (>=)
  "maximum": 100,          // Inclusive max (<=)
  "exclusiveMinimum": 0,   // Exclusive min (>)
  "exclusiveMaximum": 100, // Exclusive max (<)
  "multipleOf": 5,         // Must be multiple of
  "enum": [1, 2, 3]        // Allowed values
}
```

---

## Array Constraints

```json
{
  "type": "array",
  "items": { "type": "string" },  // Item type
  "minItems": 1,                  // Min length
  "maxItems": 10,                 // Max length
  "uniqueItems": true             // No duplicates
}
```

---

## Object Constraints

```json
{
  "type": "object",
  "properties": {
    "name": { "type": "string" }
  },
  "required": ["name"],              // Required props
  "additionalProperties": false,     // Reject unknown props
  "minProperties": 1,                // Min number of props
  "maxProperties": 10                // Max number of props
}
```

---

## Common Patterns

### Email
```json
{ "type": "string", "format": "email" }
```

### URL
```json
{ "type": "string", "format": "url" }
```

### UUID
```json
{ "type": "string", "format": "uuid" }
```

### Date (YYYY-MM-DD)
```json
{ "type": "string", "format": "date" }
```

### Age
```json
{ "type": "integer", "minimum": 0, "maximum": 120 }
```

### Price (cents)
```json
{ "type": "number", "minimum": 0, "multipleOf": 0.01 }
```

### Phone (E.164)
```json
{ "type": "string", "pattern": "^\\+?[1-9]\\d{1,14}$" }
```

### Username
```json
{
  "type": "string",
  "minLength": 3,
  "maxLength": 20,
  "pattern": "^[a-zA-Z0-9_]+$"
}
```

### Password (strong)
```json
{
  "type": "string",
  "minLength": 8,
  "pattern": "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])"
}
```

### ZIP Code (US)
```json
{ "type": "string", "pattern": "^\\d{5}(-\\d{4})?$" }
```

### Hex Color
```json
{ "type": "string", "pattern": "^#[0-9A-Fa-f]{6}$" }
```

### Country Code (ISO 3166-1 alpha-2)
```json
{ "type": "string", "pattern": "^[A-Z]{2}$" }
```

---

## Advanced

### Union Type (string OR number)
```json
{ "type": ["string", "number"] }
```

### Exact Value
```json
{ "const": "1.0.0" }
```

### One Of (exclusive)
```json
{
  "oneOf": [
    { "type": "string" },
    { "type": "number" }
  ]
}
```

### Any Of (inclusive)
```json
{
  "anyOf": [
    { "required": ["email"] },
    { "required": ["phone"] }
  ]
}
```

### All Of (intersection)
```json
{
  "allOf": [
    { "properties": { "name": { "type": "string" } } },
    { "properties": { "age": { "type": "integer" } } }
  ]
}
```

---

## Quick Example

```json
{
  "name": "my-tool",
  "inputSchema": {
    "type": "object",
    "properties": {
      "email": {
        "type": "string",
        "format": "email"
      },
      "age": {
        "type": "integer",
        "minimum": 18,
        "maximum": 120
      },
      "tags": {
        "type": "array",
        "items": { "type": "string" },
        "minItems": 1,
        "maxItems": 5,
        "uniqueItems": true
      }
    },
    "required": ["email", "age"]
  }
}
```
