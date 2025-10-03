# Contributing to SimplyMCP

Thank you for your interest in contributing to SimplyMCP! This document provides guidelines and instructions for contributing.

## 🎯 Ways to Contribute

- **Bug Reports** - Report issues you encounter
- **Feature Requests** - Suggest new features or improvements
- **Documentation** - Improve or add documentation
- **Code Contributions** - Submit bug fixes or new features
- **Examples** - Add example implementations
- **Tests** - Improve test coverage

## 🚀 Getting Started

### 1. Fork and Clone

```bash
# Fork the repository on GitHub, then:
git clone https://github.com/clockwork-innovations/simply-mcp.git
cd simply-mcp
```

### 2. Install Dependencies

```bash
npm install --legacy-peer-deps
```

Note: We use `--legacy-peer-deps` due to a peer dependency conflict with `zod` versions.

### 3. Build the Project

```bash
npm run build
```

### 4. Run Tests

```bash
# Run all tests
npm test

# Run specific tests
npm run test:stdio
npm run test:http
```

### 5. Try Examples

```bash
npm run dev              # stdio transport
npm run dev:http         # HTTP transport
npm run dev:class        # Decorator API
```

## 📝 Development Workflow

### Creating a Feature Branch

```bash
git checkout -b feature/your-feature-name
```

Or for bug fixes:

```bash
git checkout -b fix/issue-description
```

### Making Changes

1. **Write Code** - Implement your feature or fix
2. **Add Tests** - Ensure your changes are tested
3. **Update Docs** - Update relevant documentation
4. **Run Tests** - Ensure all tests pass
5. **Build** - Verify the project builds successfully

```bash
npm run build
npm test
```

### Commit Messages

We follow conventional commit format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

Examples:
```
feat(decorators): add support for async prompts
fix(SimplyMCP): resolve memory leak in HTTP transport
docs(README): update installation instructions
```

### Submitting a Pull Request

1. **Push your branch**
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Create Pull Request** on GitHub

3. **Describe your changes**
   - What does this PR do?
   - Why is this change needed?
   - How has it been tested?
   - Any breaking changes?

4. **Wait for review** - Maintainers will review your PR

5. **Address feedback** - Make requested changes if needed

6. **Merge** - Once approved, your PR will be merged!

## 🏗️ Project Structure

```
simple-mcp/
├── mcp/
│   ├── core/              # Core framework code
│   ├── decorators.ts      # Decorator API
│   ├── single-file-types.ts # Functional API
│   ├── SimplyMCP.ts       # Programmatic API
│   ├── examples/          # Example implementations
│   ├── tests/             # Test suite
│   └── docs/              # Documentation
├── dist/                  # Compiled output (git-ignored)
├── package.json
├── tsconfig.json
└── README.md
```

## 🧪 Testing Guidelines

### Writing Tests

- Place tests in `mcp/tests/`
- Use descriptive test names
- Test both success and failure cases
- Include edge cases

### Test Structure

Tests use bash scripts that exercise the MCP protocol:

```bash
# mcp/tests/test-your-feature.sh
#!/bin/bash

# Test setup
# Test execution
# Assertions
# Cleanup
```

### Running Tests

```bash
# All tests
npm test

# Specific test
bash mcp/tests/test-your-feature.sh
```

## 📚 Documentation Guidelines

### Code Documentation

- Use JSDoc comments for public APIs
- Include `@param`, `@returns`, `@example` tags
- Be clear and concise

Example:
```typescript
/**
 * Add two numbers together
 * @param a First number
 * @param b Second number
 * @returns Sum of a and b
 * @example
 * const result = add(2, 3); // 5
 */
function add(a: number, b: number): number {
  return a + b;
}
```

### README and Guides

- Keep examples practical and runnable
- Update when adding new features
- Check for broken links
- Use clear, concise language

## 🎨 Code Style

### TypeScript

- Use TypeScript for all new code
- Enable strict type checking
- Avoid `any` types when possible
- Use interfaces for public APIs

### Formatting

- 2 spaces for indentation
- Single quotes for strings
- Semicolons required
- Trailing commas in multiline

We don't currently use a formatter, but consistency is appreciated.

### Naming Conventions

- `camelCase` for variables and functions
- `PascalCase` for classes and types
- `UPPER_SNAKE_CASE` for constants
- Descriptive names over short names

## 🐛 Bug Reports

### Before Reporting

1. Check existing issues
2. Verify it's reproducible
3. Test with latest version

### Creating a Bug Report

Include:
- **Description** - What happened vs. what should happen
- **Steps to Reproduce** - Minimal steps to trigger the bug
- **Environment** - OS, Node version, package version
- **Code Sample** - Minimal reproducible example
- **Error Messages** - Full error output

Template:
```markdown
**Describe the bug**
A clear description of what the bug is.

**To Reproduce**
1. Create a server with...
2. Call tool...
3. See error

**Expected behavior**
What you expected to happen.

**Environment**
- OS: [e.g., macOS 14.1]
- Node: [e.g., 20.10.0]
- Package version: [e.g., 1.0.0]

**Additional context**
Any other relevant information.
```

## 💡 Feature Requests

### Proposing Features

Include:
- **Use Case** - Why is this needed?
- **Proposed Solution** - How should it work?
- **Alternatives** - What other options did you consider?
- **Examples** - Code examples if applicable

### Discussion

- Features may be discussed before implementation
- Feedback and iteration are welcome
- Not all proposals will be accepted

## 🔍 Code Review Process

### What We Look For

- **Correctness** - Does it work as intended?
- **Tests** - Are changes adequately tested?
- **Documentation** - Are docs updated?
- **Style** - Does it follow project conventions?
- **Breaking Changes** - Are they necessary and documented?

### Review Timeline

- Initial review: Within 1 week
- Follow-up: Within 3 days
- This is volunteer time, please be patient

## 📜 License

By contributing, you agree that your contributions will be licensed under the MIT License.

## 🤝 Code of Conduct

### Our Standards

- Be respectful and inclusive
- Welcome newcomers
- Accept constructive criticism
- Focus on what's best for the project

### Unacceptable Behavior

- Harassment or discrimination
- Trolling or insulting comments
- Personal or political attacks
- Publishing private information

### Enforcement

Violations may result in:
1. Warning
2. Temporary ban
3. Permanent ban

Report issues to project maintainers.

## 🙋 Questions?

- **Documentation**: Check the [docs](./mcp/docs/INDEX.md)
- **Issues**: Search [existing issues](https://github.com/clockwork-innovations/simply-mcp/issues)
- **Discussions**: Start a [discussion](https://github.com/clockwork-innovations/simply-mcp/discussions)

## 🎉 Thank You!

Your contributions make SimplyMCP better for everyone. Thank you for taking the time to contribute!
