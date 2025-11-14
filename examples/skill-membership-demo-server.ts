/**
 * Skill Membership Demo Server
 *
 * Demonstrates the skill membership feature (PL-1) which allows tools,
 * resources, and prompts to declare which skill(s) they belong to using
 * the `skill` field. This enables automatic grouping in auto-generated
 * skill documentation without manually listing every component.
 *
 * This demo shows:
 * - Tools with single skill membership
 * - Tools with multiple skill membership
 * - Resources with skill membership
 * - Prompts with skill membership
 * - Auto-generated skills that automatically include members
 *
 * Usage:
 * ```bash
 * # Compile and run
 * npm run cli -- run examples/skill-membership-demo-server.ts
 *
 * # Test with Claude CLI
 * cat > /tmp/test-mcp-config.json << 'EOF'
 * {
 *   "mcpServers": {
 *     "skill-membership-demo": {
 *       "command": "node",
 *       "args": ["dist/src/cli/index.js", "run", "examples/skill-membership-demo-server.ts"]
 *     }
 *   }
 * }
 * EOF
 *
 * # List all tools (shows all 6 database tools)
 * claude --print --model haiku \
 *   --mcp-config /tmp/test-mcp-config.json \
 *   --strict-mcp-config \
 *   --dangerously-skip-permissions \
 *   "List all available tools"
 *
 * # Get database skill (auto-includes all 3 database tools via membership)
 * claude --print --model haiku \
 *   --mcp-config /tmp/test-mcp-config.json \
 *   --strict-mcp-config \
 *   --dangerously-skip-permissions \
 *   "Get the database skill manual"
 *
 * # Get analytics skill (auto-includes tools, resources, and prompts)
 * claude --print --model haiku \
 *   --mcp-config /tmp/test-mcp-config.json \
 *   --strict-mcp-config \
 *   --dangerously-skip-permissions \
 *   "Get the analytics skill manual"
 * ```
 */

import {
  ITool,
  IResource,
  IPrompt,
  ISkill,
  ToolHelper,
  ResourceHelper,
  PromptHelper,
  SkillHelper,
} from '../src/index.js';

// ============================================================================
// DATABASE TOOLS (Auto-grouped via skill membership)
// ============================================================================

interface QueryTool extends ITool {
  name: 'db_query';
  description: 'Execute a SQL query against the database';
  params: { sql: string };
  result: { rows: any[] };
  skill: 'database'; // ← Declares membership in 'database' skill
}

interface InsertTool extends ITool {
  name: 'db_insert';
  description: 'Insert data into the database';
  params: { table: string; data: Record<string, any> };
  result: { id: number };
  skill: 'database'; // ← Declares membership in 'database' skill
}

interface UpdateTool extends ITool {
  name: 'db_update';
  description: 'Update records in the database';
  params: { table: string; id: number; data: Record<string, any> };
  result: { updated: boolean };
  skill: 'database'; // ← Declares membership in 'database' skill
}

// ============================================================================
// ANALYTICS TOOLS (Multiple skill membership)
// ============================================================================

interface GenerateReportTool extends ITool {
  name: 'generate_report';
  description: 'Generate an analytics report';
  params: { report_type: string; date_range: string };
  result: { report_url: string };
  skill: ['analytics', 'reporting']; // ← Member of MULTIPLE skills
}

interface CalculateMetricsTool extends ITool {
  name: 'calculate_metrics';
  description: 'Calculate performance metrics';
  params: { metric_name: string };
  result: { value: number; trend: string };
  skill: 'analytics'; // ← Declares membership in 'analytics' skill
}

interface ExportDataTool extends ITool {
  name: 'export_data';
  description: 'Export data in various formats';
  params: { format: 'csv' | 'json' | 'excel' };
  result: { download_url: string };
  skill: ['analytics', 'data_management']; // ← Multiple membership
}

// ============================================================================
// RESOURCES (With skill membership)
// ============================================================================

interface MetricsResource extends IResource {
  uri: 'analytics://metrics';
  name: 'Current Metrics';
  description: 'Real-time analytics metrics';
  mimeType: 'application/json';
  returns: { users: number; revenue: number; conversion: number };
  skill: 'analytics'; // ← Resource declares analytics membership
}

interface DatabaseSchemaResource extends IResource {
  uri: 'db://schema';
  name: 'Database Schema';
  description: 'Current database schema definition';
  mimeType: 'application/json';
  returns: { tables: string[]; version: string };
  skill: 'database'; // ← Resource declares database membership
}

// ============================================================================
// PROMPTS (With skill membership)
// ============================================================================

interface ReportAnalysisPrompt extends IPrompt {
  name: 'analyze_report';
  description: 'Analyze a generated report and provide insights';
  args: {
    report_url: { description: 'URL of the report to analyze' };
  };
  skill: 'analytics'; // ← Prompt declares analytics membership
}

interface QueryHelperPrompt extends IPrompt {
  name: 'sql_helper';
  description: 'Help construct safe SQL queries';
  args: {
    intent: { description: 'What you want to query' };
  };
  skill: 'database'; // ← Prompt declares database membership
}

// ============================================================================
// AUTO-GENERATED SKILLS (Will auto-include members)
// ============================================================================

interface DatabaseSkill extends ISkill {
  name: 'database';
  description: 'Database operations and SQL query capabilities';
  components: {
    // NOTE: We don't need to list tools/resources/prompts here!
    // They will be automatically included via skill membership
  };
}

interface AnalyticsSkill extends ISkill {
  name: 'analytics';
  description: 'Analytics and reporting capabilities';
  components: {
    // NOTE: generate_report, calculate_metrics, export_data tools will be
    // automatically included because they declare skill: 'analytics'
    // Same for the metrics resource and analyze_report prompt
  };
}

interface ReportingSkill extends ISkill {
  name: 'reporting';
  description: 'Report generation and management';
  components: {
    // NOTE: generate_report and export_data will be automatically included
    // because they have skill: ['analytics', 'reporting']
  };
}

// ============================================================================
// IMPLEMENTATIONS
// ============================================================================

const dbQuery: ToolHelper<QueryTool> = async (params) => {
  return {
    rows: [{ id: 1, name: 'Example' }, { id: 2, name: 'Demo' }]
  };
};

const dbInsert: ToolHelper<InsertTool> = async (params) => {
  return { id: 42 };
};

const dbUpdate: ToolHelper<UpdateTool> = async (params) => {
  return { updated: true };
};

const generateReport: ToolHelper<GenerateReportTool> = async (params) => {
  return { report_url: `https://example.com/reports/${Date.now()}` };
};

const calculateMetrics: ToolHelper<CalculateMetricsTool> = async (params) => {
  return { value: 95.5, trend: 'up' };
};

const exportData: ToolHelper<ExportDataTool> = async (params) => {
  return { download_url: `https://example.com/exports/data.${params.format}` };
};

const metricsResource: ResourceHelper<MetricsResource> = async () => {
  return {
    users: 1000,
    revenue: 50000,
    conversion: 0.025
  };
};

const schemaResource: ResourceHelper<DatabaseSchemaResource> = async () => {
  return {
    tables: ['users', 'orders', 'products'],
    version: '1.0.0'
  };
};

const analyzeReportPrompt: PromptHelper<ReportAnalysisPrompt> = (args) => {
  return `Analyze the report at ${args.report_url} and provide insights on:
- Key trends and patterns
- Anomalies or outliers
- Actionable recommendations`;
};

const sqlHelperPrompt: PromptHelper<QueryHelperPrompt> = (args) => {
  return `Help me construct a safe SQL query to ${args.intent}.
Please ensure the query:
- Uses parameterized queries to prevent SQL injection
- Includes appropriate WHERE clauses
- Has proper error handling`;
};

const databaseSkill: SkillHelper<DatabaseSkill> = null; // Auto-generated

const analyticsSkill: SkillHelper<AnalyticsSkill> = null; // Auto-generated

const reportingSkill: SkillHelper<ReportingSkill> = null; // Auto-generated

// ============================================================================
// EXPECTED BEHAVIOR
// ============================================================================

/**
 * When you query the 'database' skill, you should see:
 * - db_query, db_insert, db_update tools (via skill membership)
 * - db://schema resource (via skill membership)
 * - sql_helper prompt (via skill membership)
 *
 * When you query the 'analytics' skill, you should see:
 * - generate_report, calculate_metrics, export_data tools (via skill membership)
 * - analytics://metrics resource (via skill membership)
 * - analyze_report prompt (via skill membership)
 *
 * When you query the 'reporting' skill, you should see:
 * - generate_report, export_data tools (via multiple skill membership)
 *
 * This demonstrates how skill membership eliminates the need to manually
 * list every component in the skill's components field!
 */
