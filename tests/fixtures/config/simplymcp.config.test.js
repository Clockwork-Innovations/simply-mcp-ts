// Test configuration file for SimplyMCP CLI
export default {
  run: {
    http: true,
    port: 3001,
    style: 'decorator',
    verbose: true,
  },
  bundle: {
    minify: true,
    sourcemap: 'external',
    platform: 'node',
    target: 'node20',
    treeShake: true,
  },
};
