# MCP Class Wrapper Wizard - User Guide

**Version:** 2.5.0
**Date:** 2025-10-10

---

## Overview

The **MCP Class Wrapper Wizard** is an interactive tool that transforms existing TypeScript classes into MCP servers by adding decorators. It provides a guided, conversational workflow where an AI assistant (like Claude) helps you:

1. Analyze your existing class
2. Configure server metadata
3. Select which methods to expose as MCP tools
4. Generate a decorated version of your class

**Key Features:**
- Zero modifications to your original file
- 100% implementation preservation
- Automatic type inference
- Interactive LLM-guided workflow
- Generates `{YourClass}.mcp.ts` files

---

## Quick Start

### Step 1: Launch the Wizard

```bash
npx simply-mcp create
```

This starts an interactive wizard server in STDIO mode, ready to connect with Claude Code CLI or other MCP clients.

### Step 2: Start the Conversation

Connect your MCP client and say:

```
Transform my TypeScript class into an MCP server
```

Or directly call the tool:

```
start_wizard
```

### Step 3: Follow the Interactive Workflow

The wizard guides you through 6 steps:

1. **start_wizard** - Initialize the wizard
2. **load_file** - Provide your TypeScript class file path
3. **confirm_server_metadata** - Review and confirm server name/version
4. **add_tool_decorator** - Select methods to expose (repeat as needed)
5. **preview_annotations** - Review the decorated code
6. **finish_and_write** - Save the `{YourClass}.mcp.ts` file

---

## Complete Example

### Original Class

**File:** `src/WeatherService.ts`

```typescript
export class WeatherService {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Get current weather conditions for a city
   * @param city City name
   * @param country Optional country code
   */
  async getCurrentWeather(city: string, country?: string): Promise<any> {
    const url = `https://api.weather.com/v1/current?city=${city}`;
    const response = await fetch(url);
    return response.json();
  }

  /**
   * Get weather forecast for specified days
   * @param city City name
   * @param days Number of days (default: 7)
   */
  async getForecast(city: string, days: number = 7): Promise<any> {
    const url = `https://api.weather.com/v1/forecast?city=${city}&days=${days}`;
    const response = await fetch(url);
    return response.json();
  }

  private async makeRequest(url: string): Promise<any> {
    // Private helper - won't be exposed
    return fetch(url).then(r => r.json());
  }
}
```

### Interactive Wizard Session

```
User: Transform my TypeScript class into an MCP server