/**
 * Create Bundle command for SimplyMCP CLI
 * Creates package bundles from existing server files
 */

import type { CommandModule, ArgumentsCamelCase } from 'yargs';
import { mkdir, writeFile, readFile, copyFile } from 'node:fs/promises';
import { resolve, join, basename, extname } from 'node:path';
import { stat } from 'node:fs/promises';

interface CreateBundleArgs {
  from?: string;
  output?: string;
  name?: string;
  description?: string;
  author?: string;
  version?: string;
}

/**
 * Detect dependencies from import statements in source file
 */
async function detectDependencies(filePath: string): Promise<Record<string, string>> {
  try {
    const content = await readFile(filePath, 'utf-8');
    const dependencies: Record<string, string> = {};

    // Regex patterns to match import statements
    const importPatterns = [
      // import from 'package'
      /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g,
      // import('package')
      /import\(['"]([^'"]+)['"]\)/g,
      // require('package')
      /require\(['"]([^'"]+)['"]\)/g,
    ];

    for (const pattern of importPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const packageName = match[1];

        // Skip relative imports (start with . or /)
        if (packageName.startsWith('.') || packageName.startsWith('/')) {
          continue;
        }

        // Skip node: protocol imports
        if (packageName.startsWith('node:')) {
          continue;
        }

        // Extract package name (handle scoped packages like @scope/package)
        let pkgName: string;
        if (packageName.startsWith('@')) {
          // Scoped package: @scope/package or @scope/package/subpath
          const parts = packageName.split('/');
          pkgName = parts.length >= 2 ? `${parts[0]}/${parts[1]}` : packageName;
        } else {
          // Regular package: package or package/subpath
          pkgName = packageName.split('/')[0];
        }

        // Add to dependencies with latest version
        if (pkgName && !dependencies[pkgName]) {
          dependencies[pkgName] = 'latest';
        }
      }
    }

    // Always include simply-mcp
    if (!dependencies['simply-mcp']) {
      dependencies['simply-mcp'] = 'latest';
    }

    return dependencies;
  } catch (error) {
    console.warn(`Warning: Could not analyze dependencies: ${error instanceof Error ? error.message : String(error)}`);
    return { 'simply-mcp': 'latest' };
  }
}

/**
 * Generate package.json content
 */
function generatePackageJson(options: {
  name: string;
  version: string;
  description?: string;
  author?: string;
  dependencies: Record<string, string>;
}): string {
  const pkg = {
    name: options.name,
    version: options.version,
    description: options.description || 'MCP Server created with SimplyMCP',
    type: 'module' as const,
    main: './src/server.ts',
    bin: './src/server.ts',
    engines: {
      node: '>=20.0.0',
    },
    dependencies: options.dependencies,
    ...(options.author && { author: options.author }),
  };

  return JSON.stringify(pkg, null, 2) + '\n';
}

/**
 * Generate README.md content
 */
function generateReadme(options: {
  name: string;
  description?: string;
}): string {
  return `# ${options.name}

${options.description || 'MCP Server created with SimplyMCP'}

## Installation

\`\`\`bash
npm install
\`\`\`

## Usage

Run the server with SimplyMCP:

\`\`\`bash
npx simply-mcp run .
\`\`\`

Or with custom transport options:

\`\`\`bash
# HTTP transport
npx simply-mcp run . --http --port 3000

# STDIO transport (default)
npx simply-mcp run .
\`\`\`

## Development

This server was created using [SimplyMCP](https://github.com/Clockwork-Innovations/simply-mcp-ts),
a TypeScript framework for building Model Context Protocol (MCP) servers.

### Running with SimplyMCP CLI

The SimplyMCP CLI provides convenient commands for running and bundling your server:

\`\`\`bash
# Run the server
npx simply-mcp run .

# Bundle the server for distribution
npx simply-mcp bundle src/server.ts -o dist/bundle.js

# Watch mode for development
npx simply-mcp bundle src/server.ts -w
\`\`\`

## License

MIT
`;
}

/**
 * Generate .env.example content
 */
function generateEnvExample(): string {
  return `# Example environment variables for your MCP server
# Copy this file to .env and fill in your values

# API_KEY=your-api-key-here
# DATABASE_URL=your-database-url-here
`;
}

/**
 * Check if directory exists
 */
async function directoryExists(path: string): Promise<boolean> {
  try {
    const stats = await stat(path);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Check if file exists
 */
async function fileExists(path: string): Promise<boolean> {
  try {
    const stats = await stat(path);
    return stats.isFile();
  } catch {
    return false;
  }
}

/**
 * Create package bundle programmatically (used by bundle command with --format package)
 */
export async function createPackageBundleFromEntry(options: {
  from: string;
  output: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
}): Promise<void> {
  // Validate source file
  const sourcePath = resolve(process.cwd(), options.from);

  if (!(await fileExists(sourcePath))) {
    throw new Error(`Source file not found: ${options.from}`);
  }

  const ext = extname(sourcePath);
  if (ext !== '.ts' && ext !== '.js') {
    throw new Error(`Source file must be .ts or .js, got: ${ext}`);
  }

  // Validate output directory
  const outputPath = resolve(process.cwd(), options.output);

  if (await directoryExists(outputPath)) {
    throw new Error(`Output directory already exists: ${options.output}`);
  }

  console.log(`Source:  ${sourcePath}`);
  console.log(`Output:  ${outputPath}`);
  console.log(`Name:    ${options.name}`);
  console.log(`Version: ${options.version}\n`);

  // Detect dependencies
  console.log('Analyzing dependencies...');
  const dependencies = await detectDependencies(sourcePath);
  console.log(`Found ${Object.keys(dependencies).length} dependencies\n`);

  // Create output directory structure
  console.log('Creating directory structure...');
  await mkdir(outputPath, { recursive: true });
  await mkdir(join(outputPath, 'src'), { recursive: true });

  // Copy source file
  console.log('Copying source file...');
  const targetServerPath = join(outputPath, 'src', 'server.ts');
  await copyFile(sourcePath, targetServerPath);

  // Generate package.json
  console.log('Generating package.json...');
  const packageJson = generatePackageJson({
    name: options.name,
    version: options.version,
    description: options.description,
    author: options.author,
    dependencies,
  });
  await writeFile(join(outputPath, 'package.json'), packageJson);

  // Generate README.md
  console.log('Generating README.md...');
  const readme = generateReadme({
    name: options.name,
    description: options.description,
  });
  await writeFile(join(outputPath, 'README.md'), readme);

  // Generate .env.example
  console.log('Generating .env.example...');
  const envExample = generateEnvExample();
  await writeFile(join(outputPath, '.env.example'), envExample);

  // Success!
  console.log('\n✓ Package bundle created successfully!\n');
  console.log('Bundle structure:');
  console.log(`  ${options.output}/`);
  console.log(`  ├── package.json`);
  console.log(`  ├── README.md`);
  console.log(`  ├── .env.example`);
  console.log(`  └── src/`);
  console.log(`      └── server.ts\n`);

  console.log('Next steps:');
  console.log(`  1. cd ${options.output}`);
  console.log(`  2. npm install`);
  console.log(`  3. npx simply-mcp run .\n`);
}

/**
 * Create Bundle command definition
 */
export const createBundleCommand: CommandModule<{}, CreateBundleArgs> = {
  command: 'create-bundle',
  describe: 'Create a package bundle from an existing server file',

  builder: (yargs) => {
    return yargs
      .option('from', {
        describe: 'Source server file (.ts or .js)',
        type: 'string',
        demandOption: true,
      })
      .option('output', {
        describe: 'Output bundle directory',
        type: 'string',
        demandOption: true,
      })
      .option('name', {
        describe: 'Bundle name (default: filename)',
        type: 'string',
      })
      .option('description', {
        describe: 'Bundle description',
        type: 'string',
      })
      .option('author', {
        describe: 'Author name',
        type: 'string',
      })
      .option('version', {
        describe: 'Initial version',
        type: 'string',
        default: '1.0.0',
      })
      .example('$0 create-bundle --from server.ts --output ./my-server', 'Create bundle from server.ts')
      .example('$0 create-bundle --from server.ts --output ./my-server --name my-mcp-server', 'Create bundle with custom name')
      .example('$0 create-bundle --from server.ts --output ./my-server --author "John Doe"', 'Create bundle with author');
  },

  handler: async (argv: ArgumentsCamelCase<CreateBundleArgs>) => {
    try {
      // Validate source file
      const sourcePath = resolve(process.cwd(), argv.from!);

      if (!(await fileExists(sourcePath))) {
        console.error(`Error: Source file not found: ${argv.from}`);
        process.exit(1);
      }

      const ext = extname(sourcePath);
      if (ext !== '.ts' && ext !== '.js') {
        console.error(`Error: Source file must be .ts or .js, got: ${ext}`);
        process.exit(1);
      }

      // Determine bundle name
      const sourceFilename = basename(sourcePath, ext);
      const bundleName = argv.name || sourceFilename;

      // Validate output directory
      const outputPath = resolve(process.cwd(), argv.output!);

      if (await directoryExists(outputPath)) {
        console.error(`Error: Output directory already exists: ${argv.output}`);
        console.error('Please choose a different output directory or remove the existing one.');
        process.exit(1);
      }

      console.log('SimplyMCP Bundle Creator');
      console.log('========================\n');
      console.log(`Source:  ${sourcePath}`);
      console.log(`Output:  ${outputPath}`);
      console.log(`Name:    ${bundleName}`);
      console.log(`Version: ${argv.version}\n`);

      // Detect dependencies
      console.log('Analyzing dependencies...');
      const dependencies = await detectDependencies(sourcePath);
      console.log(`Found ${Object.keys(dependencies).length} dependencies\n`);

      // Create output directory structure
      console.log('Creating directory structure...');
      await mkdir(outputPath, { recursive: true });
      await mkdir(join(outputPath, 'src'), { recursive: true });

      // Copy source file
      console.log('Copying source file...');
      const targetServerPath = join(outputPath, 'src', 'server.ts');
      await copyFile(sourcePath, targetServerPath);

      // Generate package.json
      console.log('Generating package.json...');
      const packageJson = generatePackageJson({
        name: bundleName,
        version: argv.version!,
        description: argv.description,
        author: argv.author,
        dependencies,
      });
      await writeFile(join(outputPath, 'package.json'), packageJson);

      // Generate README.md
      console.log('Generating README.md...');
      const readme = generateReadme({
        name: bundleName,
        description: argv.description,
      });
      await writeFile(join(outputPath, 'README.md'), readme);

      // Generate .env.example
      console.log('Generating .env.example...');
      const envExample = generateEnvExample();
      await writeFile(join(outputPath, '.env.example'), envExample);

      // Success!
      console.log('\n✓ Bundle created successfully!\n');
      console.log('Bundle structure:');
      console.log(`  ${argv.output}/`);
      console.log(`  ├── package.json`);
      console.log(`  ├── README.md`);
      console.log(`  ├── .env.example`);
      console.log(`  └── src/`);
      console.log(`      └── server.ts\n`);

      console.log('Next steps:');
      console.log(`  1. cd ${argv.output}`);
      console.log(`  2. npm install`);
      console.log(`  3. npx simply-mcp run .\n`);

      console.log('Usage example:');
      console.log(`  npx simply-mcp run ${argv.output}\n`);
    } catch (error) {
      console.error('\n✗ Error creating bundle:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  },
};
