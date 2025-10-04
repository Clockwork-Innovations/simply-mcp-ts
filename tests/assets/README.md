# Test Assets Directory

This directory contains large test files that are excluded from the repository to keep it lightweight.

## Purpose

This is a centralized location for storing large test files (>1MB) that are used across multiple test suites.

## Generating Test Assets

Large binary files can be regenerated using the test asset generation script:

```bash
cd tests/phase2
bash generate-test-assets.sh
```

This will create:
- `test-large.bin` (15MB) - Tests file handling for large files
- `test-very-large.bin` (55MB) - Tests >50MB hard limit rejection

## Files in This Directory

### Large Binary Files (Generated)
- `test-large.bin` - 15MB random data
- `test-very-large.bin` - 57MB random data

These files are automatically excluded from git tracking via `.gitignore`.

## Using These Assets in Tests

Reference these files in your tests using the path:
```bash
LARGE_FILE="$PROJECT_ROOT/tests/assets/test-large.bin"
VERY_LARGE_FILE="$PROJECT_ROOT/tests/assets/test-very-large.bin"
```

## Best Practices

1. **Keep files here minimal** - Only store files >1MB that are reused across tests
2. **Document each file** - Update this README when adding new assets
3. **Always add to .gitignore** - Large files should not be committed
4. **Provide regeneration scripts** - Include instructions for recreating assets
