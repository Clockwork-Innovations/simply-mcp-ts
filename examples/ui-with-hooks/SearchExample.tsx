/**
 * Product Search Example - Using useMCPTool with shadcn-style components
 *
 * Demonstrates:
 * - Using useMCPTool hook for clean tool calling
 * - Working with ANY UI library (shadcn, Radix, MUI, etc.)
 * - Automatic loading/error/data state management
 * - Optimistic updates
 * - No specialized MCP components needed!
 *
 * This example uses shadcn-style components, but you can use:
 * - Radix UI primitives
 * - Material-UI components
 * - Chakra UI components
 * - Native HTML elements
 * - Any React component library!
 */

import React, { useState } from 'react';
import { useMCPTool } from '../../src/client/hooks/index.js';

// ============================================================================
// Mock shadcn/ui components (replace with real imports in your project)
// ============================================================================

const Button = ({ children, onClick, disabled, variant = 'default' }: any) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      padding: '0.5rem 1rem',
      background: variant === 'outline' ? 'transparent' : '#0066cc',
      color: variant === 'outline' ? '#0066cc' : 'white',
      border: variant === 'outline' ? '1px solid #0066cc' : 'none',
      borderRadius: '6px',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      fontWeight: 500,
    }}
  >
    {children}
  </button>
);

const Input = ({ value, onChange, placeholder }: any) => (
  <input
    type="text"
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    style={{
      padding: '0.5rem',
      border: '1px solid #ddd',
      borderRadius: '6px',
      width: '100%',
      fontSize: '1rem',
    }}
  />
);

const Card = ({ children }: any) => (
  <div
    style={{
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      padding: '1rem',
      marginBottom: '1rem',
    }}
  >
    {children}
  </div>
);

const Badge = ({ children, variant = 'default' }: any) => (
  <span
    style={{
      padding: '0.25rem 0.75rem',
      borderRadius: '12px',
      fontSize: '0.875rem',
      fontWeight: 500,
      background: variant === 'success' ? '#dcfce7' : '#f3f4f6',
      color: variant === 'success' ? '#166534' : '#374151',
    }}
  >
    {children}
  </span>
);

// ============================================================================
// Product Search Component - Using useMCPTool Hook
// ============================================================================

interface Product {
  id: string;
  name: string;
  price: number;
  inStock: boolean;
}

interface SearchResult {
  products: Product[];
  totalCount: number;
}

export default function SearchExample() {
  const [query, setQuery] = useState('');
  const [cart, setCart] = useState<string[]>([]);

  // ✅ Use the hook - automatic state management!
  const search = useMCPTool<SearchResult>('search_products', {
    onSuccess: (data) => {
      console.log(`Found ${data.products.length} products`);
    },
    onError: (error) => {
      console.error('Search failed:', error);
    },
    optimistic: true, // Show loading state immediately
  });

  // ✅ Another hook for adding to cart
  const addToCart = useMCPTool('add_to_cart', {
    onSuccess: (data, result) => {
      // Optimistic update - add to cart immediately
      const productId = data.productId;
      setCart((prev) => [...prev, productId]);
      window.notify('success', 'Added to cart!');
    },
  });

  // Handle search
  const handleSearch = () => {
    if (!query.trim()) return;
    search.execute({ query });
  };

  // Handle add to cart
  const handleAddToCart = (productId: string) => {
    addToCart.execute({ productId });
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem', fontFamily: 'system-ui' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem' }}>
        Product Search
      </h1>
      <p style={{ color: '#666', marginBottom: '2rem' }}>
        This example uses <code>useMCPTool</code> hook with shadcn-style components.
        <br />
        <strong>The components work exactly the same</strong> - no MCP-specific wrappers needed!
      </p>

      {/* Search Input */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem' }}>
        <div style={{ flex: 1 }}>
          <Input
            value={query}
            onChange={(e: any) => setQuery(e.target.value)}
            placeholder="Search for products..."
            onKeyPress={(e: any) => e.key === 'Enter' && handleSearch()}
          />
        </div>
        <Button onClick={handleSearch} disabled={search.loading}>
          {search.loading ? 'Searching...' : 'Search'}
        </Button>
      </div>

      {/* Cart Badge */}
      {cart.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <Badge variant="success">🛒 {cart.length} items in cart</Badge>
        </div>
      )}

      {/* Loading State */}
      {search.loading && (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
          <div>Loading...</div>
        </div>
      )}

      {/* Error State */}
      {search.error && (
        <Card>
          <div style={{ color: '#dc2626' }}>
            <strong>Error:</strong> {search.error.message}
          </div>
        </Card>
      )}

      {/* Results */}
      {search.data && !search.loading && (
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>
            Found {search.data.totalCount} products
          </h2>
          {search.data.products.map((product) => (
            <Card key={product.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                    {product.name}
                  </h3>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#0066cc' }}>
                      ${product.price.toFixed(2)}
                    </span>
                    {product.inStock ? (
                      <Badge variant="success">In Stock</Badge>
                    ) : (
                      <Badge>Out of Stock</Badge>
                    )}
                  </div>
                </div>
                <Button
                  onClick={() => handleAddToCart(product.id)}
                  disabled={!product.inStock || addToCart.loading || cart.includes(product.id)}
                  variant={cart.includes(product.id) ? 'outline' : 'default'}
                >
                  {cart.includes(product.id)
                    ? '✓ Added'
                    : addToCart.loading
                    ? 'Adding...'
                    : 'Add to Cart'}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {search.called && !search.loading && search.data?.products.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#666' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
          <div>No products found for "{query}"</div>
        </div>
      )}

      {/* Technical Details */}
      <div
        style={{
          marginTop: '3rem',
          padding: '1rem',
          background: '#f9fafb',
          borderRadius: '8px',
          fontSize: '0.875rem',
          color: '#374151',
        }}
      >
        <strong>How it works:</strong>
        <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
          <li>
            <code>useMCPTool('search_products')</code> handles all state management
          </li>
          <li>Button components work exactly as they normally would - no special props!</li>
          <li>Loading, error, and data states are automatic</li>
          <li>Works with shadcn, Radix, MUI, Chakra, or any component library</li>
          <li>No MCP-specific wrapper components needed</li>
        </ul>
      </div>
    </div>
  );
}
