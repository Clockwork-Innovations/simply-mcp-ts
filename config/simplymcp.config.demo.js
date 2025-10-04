// Demo configuration for testing CLI integration
export default {
  run: {
    http: true,
    port: 3333,
    verbose: true,
  },
  bundle: {
    minify: true,
    platform: 'node',
    target: 'node20',
  },
};
