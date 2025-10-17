/**
 * Demo Layout Component
 *
 * Main layout wrapper for demo pages with navigation, sidebar, and content area.
 * Provides consistent layout across all demo pages.
 *
 * Features:
 * - Responsive sidebar navigation
 * - Main content area
 * - Mobile-friendly menu
 * - Navigation links to all demos
 * - Code view toggle
 * - Footer with version info
 *
 * @module app/components/DemoLayout
 */

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Navigation, Breadcrumb, type BreadcrumbItem } from './Navigation';
import { getAllDemoResources } from '../../lib/demoResources';

/**
 * Props for DemoLayout component
 */
export interface DemoLayoutProps {
  /** Page content */
  children: React.ReactNode;

  /** Page title */
  title?: string;

  /** Page description */
  description?: string;

  /** Breadcrumb items */
  breadcrumbs?: BreadcrumbItem[];

  /** Show sidebar */
  showSidebar?: boolean;

  /** Custom class name */
  className?: string;
}

/**
 * Demo Layout Component
 *
 * Layout wrapper for demo pages.
 *
 * @example
 * ```tsx
 * <DemoLayout
 *   title="Product Card Demo"
 *   description="Modern product card"
 *   breadcrumbs={[
 *     { label: 'Home', href: '/' },
 *     { label: 'Demos', href: '/demo' },
 *     { label: 'Product Card' }
 *   ]}
 * >
 *   <ResourceViewer resource={resource} />
 * </DemoLayout>
 * ```
 */
export function DemoLayout({
  children,
  title,
  description,
  breadcrumbs,
  showSidebar = true,
  className = '',
}: DemoLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();
  const demoResources = getAllDemoResources();

  const isResourceActive = (resourceId: string) =>
    pathname === `/demo/${resourceId}`;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <Navigation />

      <div className="flex">
        {/* Sidebar */}
        {showSidebar && (
          <>
            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
              <div
                className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
                onClick={() => setIsSidebarOpen(false)}
              />
            )}

            {/* Sidebar */}
            <aside
              className={`
                fixed lg:sticky top-0 left-0 h-screen z-50 lg:z-0
                w-64 bg-white border-r border-gray-200
                transform transition-transform duration-300 ease-in-out
                lg:transform-none
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
              `}
            >
              <div className="h-full overflow-y-auto">
                {/* Sidebar Header */}
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-lg font-bold text-gray-900">
                      Demos
                    </h2>
                    <button
                      onClick={() => setIsSidebarOpen(false)}
                      className="lg:hidden text-gray-500 hover:text-gray-700"
                      aria-label="Close sidebar"
                    >
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                  <p className="text-sm text-gray-600">
                    Layer 1: Foundation
                  </p>
                </div>

                {/* Demo List */}
                <nav className="p-4">
                  <div className="space-y-1">
                    {demoResources.map((demo) => (
                      <Link
                        key={demo.id}
                        href={`/demo/${demo.id}`}
                        onClick={() => setIsSidebarOpen(false)}
                        className={`
                          block px-4 py-3 rounded-lg transition-colors
                          ${
                            isResourceActive(demo.id)
                              ? 'bg-purple-100 text-purple-900 font-semibold'
                              : 'text-gray-700 hover:bg-gray-100'
                          }
                        `}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">
                            {getIconForDemo(demo.id)}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">
                              {demo.displayName}
                            </div>
                            <div className="text-xs text-gray-500 truncate">
                              {demo.tags[0]}
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </nav>

                {/* Sidebar Footer */}
                <div className="p-4 border-t border-gray-200 mt-auto">
                  <div className="text-xs text-gray-500">
                    <p className="mb-2">
                      <strong>{demoResources.length}</strong> demos available
                    </p>
                    <p>
                      Built with{' '}
                      <code className="px-1 py-0.5 bg-gray-100 rounded">
                        simply-mcp
                      </code>
                    </p>
                  </div>
                </div>
              </div>
            </aside>
          </>
        )}

        {/* Main Content */}
        <main className={`flex-1 ${className}`}>
          {/* Mobile Sidebar Toggle */}
          {showSidebar && (
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden fixed bottom-6 right-6 z-30 bg-purple-600 text-white p-4 rounded-full shadow-lg hover:bg-purple-700 transition-colors"
              aria-label="Open sidebar"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          )}

          <div className="container mx-auto px-4 py-8 max-w-6xl">
            {/* Breadcrumbs */}
            {breadcrumbs && breadcrumbs.length > 0 && (
              <Breadcrumb items={breadcrumbs} className="mb-6" />
            )}

            {/* Page Header */}
            {(title || description) && (
              <div className="mb-8">
                {title && (
                  <h1 className="text-4xl font-bold text-gray-900 mb-3">
                    {title}
                  </h1>
                )}
                {description && (
                  <p className="text-lg text-gray-600">{description}</p>
                )}
              </div>
            )}

            {/* Content */}
            {children}

            {/* Footer */}
            <footer className="mt-16 pt-8 border-t border-gray-200">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-500">
                <div>
                  <p>
                    MCP-UI Demo - Layer 1: Foundation
                  </p>
                  <p className="mt-1">
                    Built with Next.js 15, React 19, and simply-mcp
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <Link
                    href="/"
                    className="hover:text-purple-600 transition-colors"
                  >
                    Home
                  </Link>
                  <Link
                    href="/demo"
                    className="hover:text-purple-600 transition-colors"
                  >
                    All Demos
                  </Link>
                </div>
              </div>
            </footer>
          </div>
        </main>
      </div>
    </div>
  );
}

/**
 * Get icon emoji for demo resource
 */
function getIconForDemo(id: string): string {
  const icons: Record<string, string> = {
    'product-card': '🛍️',
    'info-card': '🚀',
    'feature-list': '✅',
    'statistics-display': '📊',
    'welcome-card': '👋',
  };
  return icons[id] || '📦';
}

export default DemoLayout;
