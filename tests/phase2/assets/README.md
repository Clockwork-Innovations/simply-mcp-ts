# Test Assets

This directory contains test assets for Phase 2 binary content testing.

## Regenerating Test Assets

Large binary files (`test-large.bin` and `test-very-large.bin`) are excluded from the repository to keep it lightweight. To regenerate all test assets:

```bash
cd tests/phase2
bash generate-test-assets.sh
```

## Test Files

### Image Files
- `test-image.png` - Standard PNG image
- `test-image.jpg` - JPEG image
- `test-image.gif` - GIF image
- `test-image.webp` - WebP image
- `test-image-blue.png` - Blue pixel PNG
- `test-image-green.png` - Green pixel PNG

### Document Files
- `test-file.pdf` - Standard PDF
- `test-large-doc.pdf` - Large PDF document

### Audio Files
- `test-audio.wav` - WAV audio file

### Archive Files
- `test-archive.zip` - ZIP archive

### Binary Files (Generated)
- `test-empty.bin` - Empty binary file
- `test-large.bin` - 15MB binary file (excluded from git, regenerate with script)
- `test-very-large.bin` - 57MB binary file (excluded from git, regenerate with script)

### Invalid Files
- `test-invalid.txt` - Invalid binary data for error testing

## Purpose

These files test the binary content handling features:
- Base64 encoding/decoding
- MIME type detection
- File size limits (50MB hard limit)
- Multiple binary content types
- Error handling for invalid/oversized files
