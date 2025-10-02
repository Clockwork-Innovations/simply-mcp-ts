#!/bin/bash
###############################################################################
# Generate Test Assets for Phase 2 Binary Content Testing
#
# This script creates real test files (images, PDFs, audio, etc.) for testing
# binary content handling in SimpleMCP.
#
# Usage: bash mcp/tests/phase2/generate-test-assets.sh
###############################################################################

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ASSETS_DIR="$SCRIPT_DIR/assets"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}===========================================

${NC}"
echo -e "${BLUE}Generating Test Assets for Phase 2${NC}"
echo -e "${BLUE}==========================================${NC}"
echo ""

# Create assets directory
mkdir -p "$ASSETS_DIR"

# Function to create a minimal PNG image
create_png() {
    local filename="$1"
    local color="$2"

    # PNG file format: 1x1 pixel
    # Header + IHDR + IDAT + IEND chunks
    case "$color" in
        "red")
            # 1x1 red pixel PNG
            base64_data="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=="
            ;;
        "blue")
            # 1x1 blue pixel PNG
            base64_data="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAEBgIApD5fRAAAAABJRU5ErkJggg=="
            ;;
        "green")
            # 1x1 green pixel PNG
            base64_data="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+A+EAAQUATIEYB+9AAAAAElFTkSuQmCC"
            ;;
        *)
            # Default: 1x1 transparent pixel PNG
            base64_data="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQIW2NgAAIAAAUAAR4f7BQAAAAASUVORK5CYII="
            ;;
    esac

    echo "$base64_data" | base64 -d > "$filename"
    echo -e "${GREEN}✓${NC} Created: $filename ($(stat -f%z "$filename" 2>/dev/null || stat -c%s "$filename") bytes)"
}

# Function to create a JPEG image
create_jpeg() {
    local filename="$1"

    # Minimal JPEG (1x1 pixel, grayscale)
    # JPEG markers: SOI (FFD8) + APP0 + SOF0 + SOS + data + EOI (FFD9)
    base64_data="/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlbaWmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD3+iiigD//2Q=="

    echo "$base64_data" | base64 -d > "$filename"
    echo -e "${GREEN}✓${NC} Created: $filename ($(stat -f%z "$filename" 2>/dev/null || stat -c%s "$filename") bytes)"
}

# Function to create a minimal PDF
create_pdf() {
    local filename="$1"
    local title="$2"

    cat > "$filename" << 'EOF'
%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /Resources 4 0 R /MediaBox [0 0 612 792] /Contents 5 0 R >>
endobj
4 0 obj
<< /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >>
endobj
5 0 obj
<< /Length 44 >>
stream
BT
/F1 12 Tf
100 700 Td
(Test PDF Document) Tj
ET
endstream
endobj
xref
0 6
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000214 00000 n
0000000309 00000 n
trailer
<< /Size 6 /Root 1 0 R >>
startxref
406
%%EOF
EOF

    echo -e "${GREEN}✓${NC} Created: $filename ($(stat -f%z "$filename" 2>/dev/null || stat -c%s "$filename") bytes)"
}

# Function to create a minimal WAV file
create_wav() {
    local filename="$1"

    # Minimal WAV file (44-byte header + silent audio)
    # RIFF header + fmt chunk + data chunk
    printf '\x52\x49\x46\x46\x24\x00\x00\x00\x57\x41\x56\x45\x66\x6d\x74\x20' > "$filename"
    printf '\x10\x00\x00\x00\x01\x00\x01\x00\x44\xac\x00\x00\x88\x58\x01\x00' >> "$filename"
    printf '\x02\x00\x10\x00\x64\x61\x74\x61\x00\x00\x00\x00' >> "$filename"

    echo -e "${GREEN}✓${NC} Created: $filename ($(stat -f%z "$filename" 2>/dev/null || stat -c%s "$filename") bytes)"
}

# Function to create a ZIP file
create_zip() {
    local filename="$1"

    # Minimal ZIP file (empty archive)
    # PK\x03\x04 (local file header) + PK\x05\x06 (end of central directory)
    printf '\x50\x4b\x05\x06\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00' > "$filename"

    echo -e "${GREEN}✓${NC} Created: $filename ($(stat -f%z "$filename" 2>/dev/null || stat -c%s "$filename") bytes)"
}

# Function to create a GIF file
create_gif() {
    local filename="$1"

    # 1x1 transparent GIF
    base64_data="R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"

    echo "$base64_data" | base64 -d > "$filename"
    echo -e "${GREEN}✓${NC} Created: $filename ($(stat -f%z "$filename" 2>/dev/null || stat -c%s "$filename") bytes)"
}

# Function to create a WebP file
create_webp() {
    local filename="$1"

    # Minimal WebP (1x1 lossy)
    # RIFF header + WEBP + VP8 chunk
    base64_data="UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAwA0JaQAA3AA/vuUAAA="

    echo "$base64_data" | base64 -d > "$filename"
    echo -e "${GREEN}✓${NC} Created: $filename ($(stat -f%z "$filename" 2>/dev/null || stat -c%s "$filename") bytes)"
}

# Function to create a large binary file
create_large_file() {
    local filename="$1"
    local size_mb="$2"

    # Create file with random data
    dd if=/dev/urandom of="$filename" bs=1M count="$size_mb" status=none 2>/dev/null

    echo -e "${GREEN}✓${NC} Created: $filename ($(stat -f%z "$filename" 2>/dev/null || stat -c%s "$filename") bytes)"
}

# Function to create invalid test files
create_invalid_file() {
    local filename="$1"

    echo "This is not valid base64 data!!!" > "$filename"
    echo -e "${GREEN}✓${NC} Created: $filename (invalid content for testing)"
}

# Generate test assets
echo -e "${BLUE}Image Files:${NC}"
create_png "$ASSETS_DIR/test-image.png" "red"
create_png "$ASSETS_DIR/test-image-blue.png" "blue"
create_png "$ASSETS_DIR/test-image-green.png" "green"
create_jpeg "$ASSETS_DIR/test-image.jpg"
create_gif "$ASSETS_DIR/test-image.gif"
create_webp "$ASSETS_DIR/test-image.webp"
echo ""

echo -e "${BLUE}Document Files:${NC}"
create_pdf "$ASSETS_DIR/test-file.pdf" "Test Document"
create_pdf "$ASSETS_DIR/test-large-doc.pdf" "Large Document"
echo ""

echo -e "${BLUE}Audio Files:${NC}"
create_wav "$ASSETS_DIR/test-audio.wav"
echo ""

echo -e "${BLUE}Archive Files:${NC}"
create_zip "$ASSETS_DIR/test-archive.zip"
echo ""

echo -e "${BLUE}Large Files (for size limit testing):${NC}"
create_large_file "$ASSETS_DIR/test-large.bin" 15
echo ""

echo -e "${BLUE}Invalid Files (for error testing):${NC}"
create_invalid_file "$ASSETS_DIR/test-invalid.txt"
echo ""

echo -e "${BLUE}Empty File (for edge case testing):${NC}"
touch "$ASSETS_DIR/test-empty.bin"
echo -e "${GREEN}✓${NC} Created: $ASSETS_DIR/test-empty.bin (0 bytes)"
echo ""

echo -e "${GREEN}==========================================${NC}"
echo -e "${GREEN}✓ Test asset generation complete!${NC}"
echo -e "${GREEN}==========================================${NC}"
echo ""
echo "Generated $(ls -1 "$ASSETS_DIR" | wc -l) test files in: $ASSETS_DIR"
echo ""
echo "File listing:"
ls -lh "$ASSETS_DIR"
