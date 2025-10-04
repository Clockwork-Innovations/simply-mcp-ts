export default {
  entry: './server.ts',
  output: {
    dir: 'dist',
    filename: 'server.js',
    format: 'single-file'
  },
  bundle: {
    minify: false
  }
};
