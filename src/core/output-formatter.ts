/**
 * Output formatting for different bundle formats
 * Handles standalone, executable, and other output formats
 */

import { writeFile, mkdir, chmod, copyFile } from 'fs/promises';
import { dirname, basename, join } from 'path';
import { BundleOptions, ResolvedDependencies } from './bundle-types.js';
import * as esbuild from 'esbuild';

/**
 * Format output based on bundle format
 *
 * @param options - Bundle options
 * @param buildResult - esbuild build result
 * @param deps - Resolved dependencies
 */
export async function formatOutput(
  options: BundleOptions,
  buildResult: esbuild.BuildResult,
  deps: ResolvedDependencies
): Promise<void> {
  const format = options.format || 'single-file';

  switch (format) {
    case 'single-file':
      // Already handled by esbuild - nothing to do
      break;

    case 'standalone':
      await formatStandalone(options, buildResult, deps);
      break;

    case 'esm':
    case 'cjs':
      // Already handled by esbuild format option - nothing to do
      break;

    default:
      throw new Error(`Unknown bundle format: ${format}`);
  }
}

/**
 * Format output as standalone distribution
 * Creates a directory with bundle + minimal package.json + README
 */
async function formatStandalone(
  options: BundleOptions,
  buildResult: esbuild.BuildResult,
  deps: ResolvedDependencies
): Promise<void> {
  // 1. Determine output directory
  const outputDir = dirname(options.output);
  await mkdir(outputDir, { recursive: true });

  // 2. Generate minimal package.json
  const bundleFilename = basename(options.output);
  const packageJson = {
    name: basename(outputDir),
    version: '1.0.0',
    type: options.format === 'esm' ? 'module' : 'commonjs',
    main: bundleFilename,
    description: 'SimplyMCP server bundle',
    engines: {
      node: '>=18.0.0',
    },
  };

  await writeFile(
    join(outputDir, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );

  // 3. Create README with usage instructions
  const readme = generateReadme(options, deps);
  await writeFile(join(outputDir, 'README.md'), readme);

  // 4. Create .gitignore
  const gitignore = `node_modules/
*.log
.DS_Store
`;
  await writeFile(join(outputDir, '.gitignore'), gitignore);

  // 5. If there are native modules, create note about them
  if (deps.nativeModules.length > 0) {
    const nativeNote = `# Native Dependencies

This bundle requires the following native modules to be installed:

${deps.nativeModules.map(m => `- ${m}`).join('\n')}

To install these dependencies:
\`\`\`bash
npm install ${deps.nativeModules.join(' ')}
\`\`\`

Note: Native modules must be installed for the target platform.
`;
    await writeFile(join(outputDir, 'NATIVE_MODULES.md'), nativeNote);
  }
}

/**
 * Generate README content for standalone bundle
 */
function generateReadme(
  options: BundleOptions,
  deps: ResolvedDependencies
): string {
  const bundleFilename = basename(options.output);
  const serverName = bundleFilename.replace(/\.(js|mjs|cjs)$/, '');

  return `# ${serverName}

SimplyMCP server bundle - ready to deploy!

## Quick Start

\`\`\`bash
# Run the server
node ${bundleFilename}
\`\`\`

## What's Inside

This is a bundled SimplyMCP server with all dependencies included.

- **Bundle size**: Self-contained JavaScript file
- **Format**: ${options.format || 'single-file'}
- **Target**: ${options.target || 'node20'}
- **Minified**: ${options.minify !== false ? 'Yes' : 'No'}
- **Source maps**: ${options.sourcemap ? 'Yes' : 'No'}

## Dependencies

${Object.keys(deps.dependencies).length > 0 ? `
### Bundled Dependencies

All application dependencies are included in the bundle:
${Object.entries(deps.dependencies).map(([name, version]) => `- ${name}@${version}`).join('\n')}
` : 'No external dependencies required.'}

${deps.nativeModules.length > 0 ? `
### Native Modules (External)

The following native modules must be installed separately:
${deps.nativeModules.map(m => `- ${m}`).join('\n')}

Install them with:
\`\`\`bash
npm install ${deps.nativeModules.join(' ')}
\`\`\`
` : ''}

## Deployment

### Local Deployment

\`\`\`bash
# Copy bundle to server
scp ${bundleFilename} user@server:/app/

# SSH and run
ssh user@server
cd /app
node ${bundleFilename}
\`\`\`

### Docker Deployment

\`\`\`dockerfile
FROM node:20-alpine

WORKDIR /app
COPY ${bundleFilename} .
${deps.nativeModules.length > 0 ? `
# Install native modules
RUN npm install ${deps.nativeModules.join(' ')}
` : ''}
CMD ["node", "${bundleFilename}"]
\`\`\`

### systemd Service

\`\`\`ini
[Unit]
Description=${serverName}
After=network.target

[Service]
Type=simple
User=nobody
WorkingDirectory=/app
ExecStart=/usr/bin/node /app/${bundleFilename}
Restart=on-failure

[Install]
WantedBy=multi-user.target
\`\`\`

## Environment Variables

Configure the server using environment variables:

\`\`\`bash
# Example
PORT=3000 node ${bundleFilename}
\`\`\`

## Troubleshooting

### Module not found errors

If you see "Cannot find module" errors, ensure all native modules are installed:

\`\`\`bash
npm install
\`\`\`

### Permission denied

Make the bundle executable if needed:

\`\`\`bash
chmod +x ${bundleFilename}
\`\`\`

## Support

This bundle was created with SimplyMCP. For issues:
1. Check the SimplyMCP documentation
2. Verify Node.js version (18+)
3. Check native module installation

## License

Same as the original SimplyMCP server.
`;
}

/**
 * Create a shell script wrapper for easier execution
 */
export async function createShellWrapper(
  bundlePath: string,
  name?: string
): Promise<string> {
  const wrapperName = name || basename(bundlePath, '.js');
  const wrapperPath = join(dirname(bundlePath), wrapperName);

  const script = `#!/bin/bash
# SimplyMCP server wrapper script

# Get the directory of this script
DIR="$( cd "$( dirname "\${BASH_SOURCE[0]}" )" && pwd )"

# Run the bundle
exec node "$DIR/${basename(bundlePath)}" "$@"
`;

  await writeFile(wrapperPath, script);
  await chmod(wrapperPath, 0o755);

  return wrapperPath;
}

/**
 * Create a Windows batch wrapper
 */
export async function createBatchWrapper(
  bundlePath: string,
  name?: string
): Promise<string> {
  const wrapperName = (name || basename(bundlePath, '.js')) + '.bat';
  const wrapperPath = join(dirname(bundlePath), wrapperName);

  const script = `@echo off
REM SimplyMCP server wrapper script

REM Get the directory of this script
SET DIR=%~dp0

REM Run the bundle
node "%DIR%${basename(bundlePath)}" %*
`;

  await writeFile(wrapperPath, script);

  return wrapperPath;
}
