# Calculator MCP Server

A minimal example of a SimpleMCP package bundle with basic arithmetic operations.

## Features

- Add two numbers
- Subtract two numbers
- Multiply two numbers
- Divide two numbers (with zero-division check)

## Installation

```bash
npm install
```

## Usage

### Run with SimpleMCP

```bash
# Default: STDIO transport
npx simply-mcp run .

# HTTP transport
npx simply-mcp run . --http --port 3000

# Verbose output
npx simply-mcp run . --verbose
```

### Quick Test

```bash
# Validate server
npx simply-mcp run . --dry-run
```

## Tools

### add

Add two numbers together.

**Example:**
```json
{
  "a": 5,
  "b": 3
}
```

**Result:** `8`

### subtract

Subtract second number from first.

**Example:**
```json
{
  "a": 10,
  "b": 4
}
```

**Result:** `6`

### multiply

Multiply two numbers.

**Example:**
```json
{
  "a": 6,
  "b": 7
}
```

**Result:** `42`

### divide

Divide first number by second.

**Example:**
```json
{
  "a": 20,
  "b": 4
}
```

**Result:** `5`

**Zero division:**
```json
{
  "a": 10,
  "b": 0
}
```

**Result:** `Error: Division by zero is undefined`

## About

This is a minimal example package bundle created with SimpleMCP. It demonstrates:

- Minimal package structure
- Basic tool definitions
- Simple parameter validation
- Error handling (division by zero)

For more examples:
- [Weather Bundle](../weather-bundle/) - More comprehensive example
- [SimpleMCP Documentation](https://github.com/Clockwork-Innovations/simply-mcp-ts)

## License

MIT
