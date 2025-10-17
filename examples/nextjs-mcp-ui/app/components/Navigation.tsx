/**
 * Navigation Component
 *
 * Provides navigation between demo pages with active state indication.
 * Responsive design with mobile menu support.
 *
 * Features:
 * - Breadcrumb navigation
 * - Active link highlighting
 * - Mobile-friendly hamburger menu
 * - Resource list navigation
 *
 * @module app/components/Navigation
 */

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getAllDemoResources } from '../../lib/demoResources';

/**
 * Props for Navigation component
 */
export interface NavigationProps {
  /** Custom class name */
  className?: string;
}

/**
 * Navigation Component
 *
 * Main navigation for the demo application.
 *
 * @example
 * ```tsx
 * <Navigation />
 * ```
 */
export function Navigation({ className = '' }: NavigationProps) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const demoResources = getAllDemoResources();

  const isActive = (path: string) => pathname === path;
  const isResourceActive = (resourceId: string) =>
    pathname === `/demo/${resourceId}`;

  return (
    <nav className={`bg-white border-b border-gray-200 ${className}`}>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Brand */}
          <Link
            href="/"
            className="flex items-center gap-3 text-xl font-bold hover:opacity-80 transition-opacity"
          >
            <span className="text-2xl">🎯</span>
            <span className="bg-mcp-gradient bg-clip-text text-transparent">
              MCP-UI Demo
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            <Link
              href="/"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive('/')
                  ? 'bg-purple-100 text-purple-900'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Home
            </Link>
            <Link
              href="/demo"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive('/demo')
                  ? 'bg-purple-100 text-purple-900'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Demos
            </Link>

            {/* Version Badge */}
            <span className="badge badge-secondary text-xs">Layer 1</span>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-md text-gray-700 hover:bg-gray-100 transition-colors"
            aria-label="Toggle mobile menu"
            aria-expanded={isMobileMenuOpen}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {isMobileMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200">
            <div className="flex flex-col gap-2">
              <Link
                href="/"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/')
                    ? 'bg-purple-100 text-purple-900'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                Home
              </Link>
              <Link
                href="/demo"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/demo')
                    ? 'bg-purple-100 text-purple-900'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                Demos
              </Link>

              {/* Demo Resources */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Resources
                </p>
                {demoResources.map((demo) => (
                  <Link
                    key={demo.id}
                    href={`/demo/${demo.id}`}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`px-3 py-2 rounded-md text-sm transition-colors block ${
                      isResourceActive(demo.id)
                        ? 'bg-purple-50 text-purple-900 font-medium'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {demo.displayName}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

/**
 * Breadcrumb Component
 *
 * Displays breadcrumb navigation for the current page.
 *
 * @example
 * ```tsx
 * <Breadcrumb items={[
 *   { label: 'Home', href: '/' },
 *   { label: 'Demos', href: '/demo' },
 *   { label: 'Product Card' }
 * ]} />
 * ```
 */
export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items, className = '' }: BreadcrumbProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={`flex items-center gap-2 text-sm ${className}`}
    >
      {items.map((item, index) => (
        <React.Fragment key={index}>
          {index > 0 && (
            <span className="text-gray-400" aria-hidden="true">
              /
            </span>
          )}
          {item.href ? (
            <Link
              href={item.href}
              className="text-gray-600 hover:text-purple-600 transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-gray-900 font-medium">{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}

export default Navigation;
