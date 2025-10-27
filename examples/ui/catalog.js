/**
 * Product Catalog Logic
 *
 * Main catalog functionality including:
 * - Product rendering
 * - Search functionality
 * - Category filtering
 * - Add to cart integration
 * - Tool calls via window.callTool()
 *
 * Dependencies:
 * - validation.js (must be loaded first)
 * - window.callTool() (injected by MCP adapter)
 * - window.notify() (injected by MCP adapter)
 */

// ============================================================================
// State Management
// ============================================================================

let currentProducts = [];
let cartCount = 0;

// ============================================================================
// DOM Elements
// ============================================================================

const elements = {
  searchInput: null,
  searchBtn: null,
  clearSearchBtn: null,
  categoryFilter: null,
  productGrid: null,
  loading: null,
  emptyState: null,
  statusMessage: null,
  cartCountEl: null,
};

// ============================================================================
// Initialization
// ============================================================================

/**
 * Initialize the catalog when DOM is loaded
 */
function initCatalog() {
  console.log('[Catalog] Initializing product catalog...');

  // Get DOM elements
  elements.searchInput = document.getElementById('search-input');
  elements.searchBtn = document.getElementById('search-btn');
  elements.clearSearchBtn = document.getElementById('clear-search-btn');
  elements.categoryFilter = document.getElementById('category-filter');
  elements.productGrid = document.getElementById('product-grid');
  elements.loading = document.getElementById('loading');
  elements.emptyState = document.getElementById('empty-state');
  elements.statusMessage = document.getElementById('status-message');
  elements.cartCountEl = document.getElementById('cart-count');

  // Set up event listeners
  setupEventListeners();

  // Load all products on init
  loadAllProducts();

  console.log('[Catalog] Catalog initialized');
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
  // Search button
  elements.searchBtn.addEventListener('click', handleSearch);

  // Search on Enter key
  elements.searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  });

  // Clear search button
  elements.clearSearchBtn.addEventListener('click', () => {
    elements.searchInput.value = '';
    loadAllProducts();
  });

  // Category filter
  elements.categoryFilter.addEventListener('change', handleCategoryFilter);

  // Debounced search on input (optional - can be removed if too aggressive)
  const debouncedSearch = debounce(handleSearch, 500);
  elements.searchInput.addEventListener('input', debouncedSearch);
}

// ============================================================================
// Product Loading
// ============================================================================

/**
 * Load all products (empty search)
 */
async function loadAllProducts() {
  await searchProducts('');
}

/**
 * Search products by query
 */
async function searchProducts(query) {
  // Validate query
  const validation = validateSearchQuery(query);
  if (!validation.valid) {
    showStatus(validation.error, 'error');
    return;
  }

  // Show loading state
  showLoading(true);
  hideStatus();

  try {
    // Call MCP tool
    console.log(`[Catalog] Searching products: "${query}"`);
    const result = await window.callTool('search_products', { query });

    // Parse result
    const data = JSON.parse(result.content[0].text);
    currentProducts = data.products;

    // Render products
    renderProducts(currentProducts);

    // Show success message if search had query
    if (query.trim()) {
      showStatus(`Found ${data.count} product(s) matching "${query}"`, 'success');
    }
  } catch (error) {
    console.error('[Catalog] Search error:', error);
    showStatus(`Search failed: ${error.message}`, 'error');
    renderProducts([]);
  } finally {
    showLoading(false);
  }
}

/**
 * Filter products by category
 */
async function filterByCategory(category) {
  // Validate category
  const validation = validateCategory(category);
  if (!validation.valid) {
    showStatus(validation.error, 'error');
    return;
  }

  // Empty category means all products
  if (!category) {
    await loadAllProducts();
    return;
  }

  // Show loading state
  showLoading(true);
  hideStatus();

  try {
    // Call MCP tool
    console.log(`[Catalog] Filtering by category: ${category}`);
    const result = await window.callTool('filter_by_category', { category });

    // Parse result
    const data = JSON.parse(result.content[0].text);
    currentProducts = data.products;

    // Render products
    renderProducts(currentProducts);

    // Show success message
    showStatus(`Found ${data.count} product(s) in ${category}`, 'success');
  } catch (error) {
    console.error('[Catalog] Filter error:', error);
    showStatus(`Filter failed: ${error.message}`, 'error');
    renderProducts([]);
  } finally {
    showLoading(false);
  }
}

// ============================================================================
// Product Rendering
// ============================================================================

/**
 * Render products to the grid
 */
function renderProducts(products) {
  // Clear grid
  elements.productGrid.innerHTML = '';

  // Show/hide empty state
  if (products.length === 0) {
    elements.emptyState.style.display = 'block';
    elements.productGrid.style.display = 'none';
    return;
  }

  elements.emptyState.style.display = 'none';
  elements.productGrid.style.display = 'grid';

  // Render each product
  products.forEach((product) => {
    const card = createProductCard(product);
    elements.productGrid.appendChild(card);
  });
}

/**
 * Create a product card element
 */
function createProductCard(product) {
  const card = document.createElement('div');
  card.className = 'product-card';

  // Product image
  const img = document.createElement('img');
  img.className = 'product-image';
  img.src = product.image;
  img.alt = sanitizeHTML(product.name);
  card.appendChild(img);

  // Product info container
  const info = document.createElement('div');
  info.className = 'product-info';

  // Product name
  const name = document.createElement('h3');
  name.className = 'product-name';
  name.textContent = product.name;
  info.appendChild(name);

  // Product description
  const desc = document.createElement('p');
  desc.className = 'product-description';
  desc.textContent = product.description;
  info.appendChild(desc);

  // Product meta (price + category)
  const meta = document.createElement('div');
  meta.className = 'product-meta';

  const price = document.createElement('span');
  price.className = 'product-price';
  price.textContent = formatPrice(product.price);
  meta.appendChild(price);

  const category = document.createElement('span');
  category.className = 'product-category';
  category.textContent = product.category;
  meta.appendChild(category);

  info.appendChild(meta);

  // Stock status
  const stock = document.createElement('p');
  stock.className = `product-stock ${product.inStock ? 'in-stock' : 'out-of-stock'}`;
  stock.textContent = product.inStock ? '✓ In Stock' : '✗ Out of Stock';
  info.appendChild(stock);

  // Add to cart button
  const btn = document.createElement('button');
  btn.className = 'add-to-cart-btn btn btn-success';
  btn.textContent = '🛒 Add to Cart';
  btn.disabled = !product.inStock;
  btn.addEventListener('click', () => handleAddToCart(product.id));
  info.appendChild(btn);

  card.appendChild(info);

  return card;
}

// ============================================================================
// Event Handlers
// ============================================================================

/**
 * Handle search button click
 */
function handleSearch() {
  const query = elements.searchInput.value.trim();
  searchProducts(query);
}

/**
 * Handle category filter change
 */
function handleCategoryFilter() {
  const category = elements.categoryFilter.value;

  // Clear search input when filtering by category
  if (category) {
    elements.searchInput.value = '';
  }

  filterByCategory(category);
}

/**
 * Handle add to cart button click
 */
async function handleAddToCart(productId) {
  console.log(`[Catalog] Adding to cart: ${productId}`);

  try {
    // Call MCP tool
    const result = await window.callTool('add_to_cart', { productId });

    // Parse result
    const data = JSON.parse(result.content[0].text);

    if (data.success) {
      // Update cart count
      cartCount = data.cartCount;
      updateCartCount();

      // Show success notification
      window.notify('success', data.message);
      showStatus(data.message, 'success');
    } else {
      // Show error notification
      window.notify('error', data.message);
      showStatus(data.message, 'error');
    }
  } catch (error) {
    console.error('[Catalog] Add to cart error:', error);
    window.notify('error', `Failed to add to cart: ${error.message}`);
    showStatus(`Failed to add to cart: ${error.message}`, 'error');
  }
}

// ============================================================================
// UI State Management
// ============================================================================

/**
 * Show/hide loading indicator
 */
function showLoading(show) {
  elements.loading.style.display = show ? 'block' : 'none';
  elements.productGrid.style.display = show ? 'none' : 'grid';
  elements.emptyState.style.display = 'none';
}

/**
 * Show status message
 */
function showStatus(message, type = 'info') {
  elements.statusMessage.textContent = message;
  elements.statusMessage.className = `status-message visible ${type}`;

  // Auto-hide after 5 seconds
  setTimeout(() => {
    hideStatus();
  }, 5000);
}

/**
 * Hide status message
 */
function hideStatus() {
  elements.statusMessage.className = 'status-message';
}

/**
 * Update cart count display
 */
function updateCartCount() {
  elements.cartCountEl.textContent = cartCount;

  // Animate cart icon
  elements.cartCountEl.style.transform = 'scale(1.5)';
  setTimeout(() => {
    elements.cartCountEl.style.transform = 'scale(1)';
  }, 200);
}

// ============================================================================
// Initialize on DOM Load
// ============================================================================

// Wait for DOM to be fully loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCatalog);
} else {
  // DOM already loaded
  initCatalog();
}

// Log that catalog is loaded
console.log('[Catalog] Catalog script loaded');
