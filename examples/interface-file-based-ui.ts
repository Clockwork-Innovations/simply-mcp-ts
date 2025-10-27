/**
 * Task 22: File-Based UI Example
 *
 * Demonstrates comprehensive file-based UI with external HTML, CSS, and JavaScript files.
 * This example shows:
 * - External HTML file loading (file: './ui/catalog.html')
 * - Multiple external CSS files (stylesheets: ['./styles/reset.css', './styles/catalog.css'])
 * - Multiple external JavaScript files (scripts: ['./scripts/validation.js', './ui/catalog.js'])
 * - Tool integration with callTool() in external JS
 * - Product catalog with search and filter functionality
 * - Professional UI design patterns
 *
 * File Structure:
 * - examples/interface-file-based-ui.ts (this file)
 * - examples/ui/catalog.html (main UI markup)
 * - examples/styles/reset.css (CSS reset/normalization)
 * - examples/styles/catalog.css (catalog-specific styles)
 * - examples/scripts/validation.js (input validation utilities)
 * - examples/ui/catalog.js (main catalog logic)
 *
 * Usage:
 *   npx simply-mcp run examples/interface-file-based-ui.ts
 *
 * To view the UI:
 *   1. Start the server with the command above
 *   2. Access via MCP client (Claude Desktop, etc.)
 *   3. Look for resource: ui://products/catalog
 */

import type { IServer, IUI, ITool } from '../src/index.js';

// ============================================================================
// Tool Interfaces
// ============================================================================

/**
 * Search Products Tool
 *
 * Searches products by query string (name or description match).
 * Returns array of matching products with full details.
 */
interface SearchProductsTool extends ITool {
  name: 'search_products';
  description: 'Search products by name or description';
  params: {
    /** Search query string */
    query: string;
  };
  result: {
    /** Array of matching products */
    products: Array<{
      id: string;
      name: string;
      description: string;
      price: number;
      image: string;
      category: string;
      inStock: boolean;
    }>;
    /** Total number of results */
    count: number;
  };
}

/**
 * Filter by Category Tool
 *
 * Filters products by category name.
 * Returns all products in the specified category.
 */
interface FilterByCategoryTool extends ITool {
  name: 'filter_by_category';
  description: 'Filter products by category';
  params: {
    /** Category name (e.g., 'Electronics', 'Books', 'Clothing') */
    category: string;
  };
  result: {
    /** Array of products in category */
    products: Array<{
      id: string;
      name: string;
      description: string;
      price: number;
      image: string;
      category: string;
      inStock: boolean;
    }>;
    /** Category name */
    category: string;
    /** Total number of products in category */
    count: number;
  };
}

/**
 * Add to Cart Tool
 *
 * Adds a product to the shopping cart.
 * Validates product exists and is in stock before adding.
 */
interface AddToCartTool extends ITool {
  name: 'add_to_cart';
  description: 'Add a product to the shopping cart';
  params: {
    /** Product ID to add */
    productId: string;
    /** Quantity to add (default: 1) */
    quantity?: number;
  };
  result: {
    /** Whether the operation succeeded */
    success: boolean;
    /** User-friendly message */
    message: string;
    /** Updated cart item count */
    cartCount: number;
  };
}

// ============================================================================
// UI Interface - File-Based
// ============================================================================

/**
 * Product Catalog UI
 *
 * Comprehensive file-based UI demonstrating:
 * - External HTML file loading
 * - Multiple external stylesheets (reset + theme)
 * - Multiple external scripts (utilities + logic)
 * - Tool integration in external JavaScript
 * - Professional product catalog design
 * - Search and filter functionality
 * - Grid layout with responsive design
 *
 * File References (all relative to server file):
 * - HTML: ./ui/catalog.html (main markup)
 * - CSS: ./styles/reset.css (normalization)
 * - CSS: ./styles/catalog.css (catalog styles)
 * - JS: ./scripts/validation.js (input validation)
 * - JS: ./ui/catalog.js (catalog logic)
 */
interface ProductCatalogUI extends IUI {
  uri: 'ui://products/catalog';
  name: 'Product Catalog';
  description: 'Browse and filter products with external files';

  /**
   * Main HTML file (relative to server file)
   * Contains the catalog structure and placeholder elements
   */
  file: './ui/catalog.html';

  /**
   * External CSS files (loaded in order)
   * - reset.css: CSS normalization
   * - catalog.css: Catalog-specific styles
   */
  stylesheets: ['./styles/reset.css', './styles/catalog.css'];

  /**
   * External JavaScript files (loaded in order)
   * - validation.js: Input validation utilities
   * - catalog.js: Main catalog logic and tool calls
   */
  scripts: ['./scripts/validation.js', './ui/catalog.js'];

  /**
   * Tools this UI can call
   * Security: Only these tools are accessible via callTool()
   */
  tools: ['search_products', 'filter_by_category', 'add_to_cart'];

  /**
   * Preferred UI size (rendering hint)
   * Clients may adjust based on available space
   */
  size: {
    width: 1024;
    height: 768;
  };
}

// ============================================================================
// Server Interface
// ============================================================================

interface FileBasedUIServer extends IServer {
  name: 'file-based-ui-example';
  version: '1.0.0';
  description: 'Comprehensive file-based UI example with external HTML, CSS, and JavaScript';
}

// ============================================================================
// Server Implementation
// ============================================================================

/**
 * Mock product database
 * In a real application, this would be a database or API
 */
const PRODUCTS = [
  {
    id: 'prod-001',
    name: 'Wireless Headphones',
    description: 'Premium noise-cancelling wireless headphones with 30-hour battery life',
    price: 299.99,
    image: 'https://via.placeholder.com/200x200/3498db/ffffff?text=Headphones',
    category: 'Electronics',
    inStock: true,
  },
  {
    id: 'prod-002',
    name: 'Smart Watch',
    description: 'Fitness tracking smartwatch with heart rate monitor and GPS',
    price: 399.99,
    image: 'https://via.placeholder.com/200x200/e74c3c/ffffff?text=Watch',
    category: 'Electronics',
    inStock: true,
  },
  {
    id: 'prod-003',
    name: 'Running Shoes',
    description: 'Lightweight running shoes with excellent cushioning and support',
    price: 129.99,
    image: 'https://via.placeholder.com/200x200/2ecc71/ffffff?text=Shoes',
    category: 'Clothing',
    inStock: true,
  },
  {
    id: 'prod-004',
    name: 'Coffee Maker',
    description: 'Programmable coffee maker with thermal carafe and auto-brew',
    price: 89.99,
    image: 'https://via.placeholder.com/200x200/f39c12/ffffff?text=Coffee',
    category: 'Home',
    inStock: false,
  },
  {
    id: 'prod-005',
    name: 'Laptop Stand',
    description: 'Ergonomic aluminum laptop stand with adjustable height',
    price: 49.99,
    image: 'https://via.placeholder.com/200x200/9b59b6/ffffff?text=Stand',
    category: 'Electronics',
    inStock: true,
  },
  {
    id: 'prod-006',
    name: 'Yoga Mat',
    description: 'Non-slip exercise yoga mat with carrying strap',
    price: 29.99,
    image: 'https://via.placeholder.com/200x200/1abc9c/ffffff?text=Yoga',
    category: 'Fitness',
    inStock: true,
  },
  {
    id: 'prod-007',
    name: 'Desk Lamp',
    description: 'LED desk lamp with adjustable brightness and color temperature',
    price: 39.99,
    image: 'https://via.placeholder.com/200x200/34495e/ffffff?text=Lamp',
    category: 'Home',
    inStock: true,
  },
  {
    id: 'prod-008',
    name: 'Water Bottle',
    description: 'Insulated stainless steel water bottle keeps drinks cold for 24 hours',
    price: 24.99,
    image: 'https://via.placeholder.com/200x200/16a085/ffffff?text=Bottle',
    category: 'Fitness',
    inStock: true,
  },
];

export default class FileBasedUIServerImpl implements FileBasedUIServer {
  private cart: Map<string, number> = new Map();

  /**
   * Search products by query string
   *
   * Searches product names and descriptions for matches.
   * Case-insensitive substring matching.
   */
  searchProducts: SearchProductsTool = async ({ query }) => {
    const normalizedQuery = query.toLowerCase().trim();

    if (!normalizedQuery) {
      // Return all products if query is empty
      return {
        products: PRODUCTS,
        count: PRODUCTS.length,
      };
    }

    // Filter products by name or description match
    const results = PRODUCTS.filter(
      (product) =>
        product.name.toLowerCase().includes(normalizedQuery) ||
        product.description.toLowerCase().includes(normalizedQuery)
    );

    return {
      products: results,
      count: results.length,
    };
  };

  /**
   * Filter products by category
   *
   * Returns all products matching the specified category.
   * Category matching is case-insensitive.
   */
  filterByCategory: FilterByCategoryTool = async ({ category }) => {
    const normalizedCategory = category.toLowerCase().trim();

    // Filter products by category
    const results = PRODUCTS.filter(
      (product) => product.category.toLowerCase() === normalizedCategory
    );

    return {
      products: results,
      category,
      count: results.length,
    };
  };

  /**
   * Add product to cart
   *
   * Validates product exists and is in stock before adding.
   * Increments quantity if product already in cart.
   */
  addToCart: AddToCartTool = async ({ productId, quantity = 1 }) => {
    // Validate product exists
    const product = PRODUCTS.find((p) => p.id === productId);
    if (!product) {
      return {
        success: false,
        message: `Product not found: ${productId}`,
        cartCount: this.cart.size,
      };
    }

    // Check if in stock
    if (!product.inStock) {
      return {
        success: false,
        message: `Product out of stock: ${product.name}`,
        cartCount: this.cart.size,
      };
    }

    // Add to cart (or increment quantity)
    const currentQty = this.cart.get(productId) || 0;
    this.cart.set(productId, currentQty + quantity);

    return {
      success: true,
      message: `Added ${quantity}x ${product.name} to cart`,
      cartCount: this.cart.size,
    };
  };
}

// ============================================================================
// Demo Runner (for standalone execution)
// ============================================================================

/**
 * Demo execution when file is run directly
 */
async function runDemo() {
  const { loadInterfaceServer } = await import('../src/index.js');
  const { fileURLToPath } = await import('url');

  console.log('=== File-Based UI Example (Task 22) ===\n');

  // Load the server
  const server = await loadInterfaceServer({
    filePath: fileURLToPath(import.meta.url),
    verbose: false,
  });

  console.log(`Server: ${server.name} v${server.version}`);
  console.log(`Description: ${server.description}\n`);

  // List UI resources
  console.log('UI Resources:');
  const resources = server.listResources();
  const uiResources = resources.filter((r) => r.uri.startsWith('ui://'));
  uiResources.forEach((resource) => {
    console.log(`  - ${resource.uri}: ${resource.name}`);
    console.log(`    ${resource.description}`);
  });
  console.log();

  // List tools
  console.log('Available Tools:');
  const tools = server.listTools();
  tools.forEach((tool) => {
    console.log(`  - ${tool.name}: ${tool.description}`);
  });
  console.log();

  // Test tools
  console.log('=== Testing Tool Integration ===');

  // Test search
  const searchResult = await server.executeTool('search_products', { query: 'wireless' });
  console.log('✓ search_products("wireless")');
  console.log(`  Found ${JSON.parse(searchResult.content[0].text).count} products`);

  // Test filter
  const filterResult = await server.executeTool('filter_by_category', { category: 'Electronics' });
  console.log('✓ filter_by_category("Electronics")');
  console.log(`  Found ${JSON.parse(filterResult.content[0].text).count} products`);

  // Test add to cart
  const addResult = await server.executeTool('add_to_cart', { productId: 'prod-001' });
  console.log('✓ add_to_cart("prod-001")');
  console.log(`  ${JSON.parse(addResult.content[0].text).message}`);

  console.log();
  console.log('=== Demo Complete ===\n');
  console.log('File-Based UI Features Demonstrated:');
  console.log('  ✓ External HTML file (ui/catalog.html)');
  console.log('  ✓ Multiple CSS files (reset.css, catalog.css)');
  console.log('  ✓ Multiple JS files (validation.js, catalog.js)');
  console.log('  ✓ Tool integration in external JS');
  console.log('  ✓ Product catalog with search/filter');
  console.log('  ✓ Professional UI design');
  console.log('\nTo run the MCP server:');
  console.log('  npx simply-mcp run examples/interface-file-based-ui.ts');

  await server.stop();
}

// Run demo if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runDemo().catch(console.error);
}
