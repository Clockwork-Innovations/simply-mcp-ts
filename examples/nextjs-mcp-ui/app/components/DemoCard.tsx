/**
 * Demo Card Component
 *
 * Displays a preview card for a demo resource with thumbnail and metadata.
 * Links to the full demo page.
 *
 * Features:
 * - Resource preview/thumbnail
 * - Name and description
 * - Tags display
 * - Hover effects
 * - Link to full demo
 *
 * @module app/components/DemoCard
 */

'use client';

import React from 'react';
import Link from 'next/link';
import type { DemoResource } from '../../lib/types';

/**
 * Props for DemoCard component
 */
export interface DemoCardProps {
  /** Demo resource to display */
  demo: DemoResource;

  /** Custom class name */
  className?: string;

  /** Show tags */
  showTags?: boolean;
}

/**
 * Demo Card Component
 *
 * Displays a card preview for a demo resource.
 *
 * @example
 * ```tsx
 * <DemoCard demo={demoResource} showTags />
 * ```
 */
export function DemoCard({
  demo,
  className = '',
  showTags = true,
}: DemoCardProps) {
  return (
    <Link
      href={`/demo/${demo.id}`}
      className={`block card-hover group ${className}`}
    >
      {/* Preview/Thumbnail Area */}
      <div className="relative mb-4 h-48 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-lg overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-6xl opacity-50 group-hover:scale-110 transition-transform duration-300">
            {getIconForDemo(demo.id)}
          </div>
        </div>

        {/* Category Badge */}
        <div className="absolute top-3 right-3">
          <span className="badge badge-primary text-xs">
            {demo.category}
          </span>
        </div>
      </div>

      {/* Content */}
      <div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-purple-600 transition-colors">
          {demo.displayName}
        </h3>
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
          {demo.description}
        </p>

        {/* Tags */}
        {showTags && demo.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {demo.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-medium"
              >
                {tag}
              </span>
            ))}
            {demo.tags.length > 3 && (
              <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-medium">
                +{demo.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <span className="text-sm text-gray-500 font-mono">
            {demo.resource.mimeType}
          </span>
          <span className="text-purple-600 group-hover:text-purple-700 font-medium text-sm flex items-center gap-1">
            View Demo
            <svg
              className="w-4 h-4 group-hover:translate-x-1 transition-transform"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </span>
        </div>
      </div>
    </Link>
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

/**
 * Demo Grid Component
 *
 * Displays a grid of demo cards.
 *
 * @example
 * ```tsx
 * <DemoGrid demos={allDemos} />
 * ```
 */
export interface DemoGridProps {
  /** Demos to display */
  demos: DemoResource[];

  /** Custom class name */
  className?: string;

  /** Show tags on cards */
  showTags?: boolean;

  /** Columns configuration */
  columns?: 2 | 3 | 4;
}

export function DemoGrid({
  demos,
  className = '',
  showTags = true,
  columns = 3,
}: DemoGridProps) {
  const gridCols = {
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-2 lg:grid-cols-3',
    4: 'md:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={`grid gap-6 ${gridCols[columns]} ${className}`}>
      {demos.map((demo) => (
        <DemoCard key={demo.id} demo={demo} showTags={showTags} />
      ))}
    </div>
  );
}

export default DemoCard;
