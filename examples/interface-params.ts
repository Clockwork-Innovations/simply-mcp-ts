/**
 * Parameter Schema Examples - Phase 2 Features
 *
 * Demonstrates advanced parameter types supported by Simply MCP:
 * - Nested objects
 * - Typed arrays (T[] and Array<T>)
 * - Union types as enums
 * - JSDoc descriptions
 * - Optional properties
 * - Complex nested structures
 *
 * All these patterns work with automatic schema generation during bundling,
 * providing strict type validation at runtime.
 */

import type { ITool, IServer, ToolHelper } from 'simply-mcp';

// ============================================================================
// Server Configuration
// ============================================================================

const server: IServer = {
  name: 'parameter-examples',
  version: '1.0.0',
  description: 'Demonstrates Phase 2 parameter schema features',
};

// ============================================================================
// Example 1: Nested Objects
// ============================================================================

interface CreateUserTool extends ITool {
  name: 'create_user';
  description: 'Create a new user with nested address information';
  params: {
    /** User's full name */
    name: string;
    /** User's email address */
    email: string;
    /** User's age in years */
    age?: number; // Optional field
    /** User's address information */
    address: {
      street: string;
      city: string;
      state: string;
      /** Postal/ZIP code */
      zipCode?: string; // Optional nested field
      /** Geographic coordinates */
      coordinates?: {
        latitude: number;
        longitude: number;
      };
    };
  };
}

const create_user: ToolHelper<CreateUserTool> = async (params) => {
  const { name, email, age, address } = params;

  return {
    content: [
      {
        type: 'text' as const,
        text: `Created user: ${name} (${email})
Age: ${age || 'Not specified'}
Address: ${address.street}, ${address.city}, ${address.state} ${address.zipCode || ''}
${address.coordinates ? `Location: ${address.coordinates.latitude}, ${address.coordinates.longitude}` : ''}`,
      },
    ],
  };
};

// ============================================================================
// Example 2: Typed Arrays
// ============================================================================

interface ProcessItemsTool extends ITool {
  name: 'process_items';
  description: 'Process a collection of items with various array types';
  params: {
    /** List of item names to process */
    tags: string[];
    /** Priority scores for each item (0-100) */
    priorities?: number[];
    /** Detailed item information */
    items: Array<{
      /** Unique item identifier */
      id: string;
      /** Item value */
      value: number;
      /** Optional item metadata */
      metadata?: {
        category: string;
        tags: string[];
      };
    }>;
  };
}

const process_items: ToolHelper<ProcessItemsTool> = async (params) => {
  const { tags, priorities, items } = params;

  const itemsText = items
    .map((item, i) => {
      const priority = priorities?.[i] ?? 'N/A';
      const category = item.metadata?.category ?? 'uncategorized';
      return `  - ${item.id}: $${item.value} (priority: ${priority}, category: ${category})`;
    })
    .join('\n');

  return {
    content: [
      {
        type: 'text' as const,
        text: `Processing ${items.length} items
Tags: ${tags.join(', ')}
Items:
${itemsText}`,
      },
    ],
  };
};

// ============================================================================
// Example 3: Union Types as Enums
// ============================================================================

interface SetStatusTool extends ITool {
  name: 'set_status';
  description: 'Set user status with predefined values';
  params: {
    /** User identifier */
    userId: string;
    /** Status value - must be one of: active, inactive, pending, suspended */
    status: 'active' | 'inactive' | 'pending' | 'suspended';
    /** Priority level */
    priority?: 'low' | 'medium' | 'high' | 'critical';
  };
}

const set_status: ToolHelper<SetStatusTool> = async (params) => {
  const { userId, status, priority } = params;

  return {
    content: [
      {
        type: 'text' as const,
        text: `User ${userId} status updated to: ${status}${priority ? ` (priority: ${priority})` : ''}`,
      },
    ],
  };
};

// ============================================================================
// Example 4: Complex Nested Structures
// ============================================================================

interface CreateProjectTool extends ITool {
  name: 'create_project';
  description: 'Create a project with complex nested configuration';
  params: {
    /** Project name */
    name: string;
    /** Project description */
    description?: string;
    /** Project team members */
    team: Array<{
      /** Member's full name */
      name: string;
      /** Member's role */
      role: 'developer' | 'designer' | 'manager' | 'qa';
      /** Member's email address */
      email: string;
      /** Skills */
      skills?: string[];
    }>;
    /** Project configuration */
    config: {
      /** Deployment environment */
      environment: 'development' | 'staging' | 'production';
      /** Feature flags */
      features: {
        /** Enable authentication */
        auth: boolean;
        /** Enable real-time updates */
        realtime: boolean;
        /** Analytics configuration */
        analytics?: {
          enabled: boolean;
          providers: string[];
          samplingRate?: number;
        };
      };
      /** Resource limits */
      limits?: {
        maxUsers: number;
        maxStorage: number; // In GB
        maxRequests: number; // Per hour
      };
    };
  };
}

const create_project: ToolHelper<CreateProjectTool> = async (params) => {
  const { name, description, team, config } = params;

  const teamList = team
    .map((member) => {
      const skills = member.skills ? ` (${member.skills.join(', ')})` : '';
      return `  - ${member.name} (${member.role})${skills}`;
    })
    .join('\n');

  const features = Object.entries(config.features)
    .filter(([_, enabled]) => enabled !== false)
    .map(([feature]) => feature)
    .join(', ');

  const limits = config.limits
    ? `
Limits:
  - Max Users: ${config.limits.maxUsers}
  - Max Storage: ${config.limits.maxStorage} GB
  - Max Requests: ${config.limits.maxRequests}/hour`
    : '';

  return {
    content: [
      {
        type: 'text' as const,
        text: `Project Created: ${name}
${description ? `Description: ${description}` : ''}
Environment: ${config.environment}
Team (${team.length} members):
${teamList}
Features: ${features}${limits}`,
      },
    ],
  };
};

// ============================================================================
// Example 5: JSDoc Descriptions Throughout
// ============================================================================

interface AnalyzeTool extends ITool {
  name: 'analyze_data';
  description: 'Analyze data with comprehensive JSDoc documentation';
  params: {
    /**
     * Data source configuration
     * @example { type: 'database', connection: 'postgresql://...' }
     */
    source: {
      /** Source type: database, file, or API */
      type: 'database' | 'file' | 'api';
      /** Connection string or file path */
      connection: string;
      /** Authentication credentials */
      auth?: {
        /** Username for authentication */
        username: string;
        /** Password for authentication */
        password: string;
      };
    };
    /**
     * Analysis parameters
     */
    analysis: {
      /** Columns to analyze */
      columns: string[];
      /** Statistical measures to compute */
      measures: Array<'mean' | 'median' | 'mode' | 'stddev' | 'variance'>;
      /** Number of rows to sample (default: all) */
      sampleSize?: number;
      /** Whether to exclude null values */
      excludeNulls?: boolean;
    };
    /**
     * Output format configuration
     */
    output?: {
      /** Output format */
      format: 'json' | 'csv' | 'markdown';
      /** Include visualization charts */
      includeCharts?: boolean;
    };
  };
}

const analyze_data: ToolHelper<AnalyzeTool> = async (params) => {
  const { source, analysis, output } = params;

  return {
    content: [
      {
        type: 'text' as const,
        text: `Data Analysis
Source: ${source.type} (${source.connection})
Columns: ${analysis.columns.join(', ')}
Measures: ${analysis.measures.join(', ')}
Sample Size: ${analysis.sampleSize ?? 'all rows'}
Exclude Nulls: ${analysis.excludeNulls ?? false}
Output Format: ${output?.format ?? 'json'}
Include Charts: ${output?.includeCharts ?? false}`,
      },
    ],
  };
};

// ============================================================================
// Export Server
// ============================================================================

export { server, create_user, process_items, set_status, create_project, analyze_data };
