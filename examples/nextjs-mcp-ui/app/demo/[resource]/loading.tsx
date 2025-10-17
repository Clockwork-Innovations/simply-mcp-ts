/**
 * Loading State for Demo Resource Page
 *
 * Displays a loading skeleton while the demo resource is being loaded.
 *
 * @module app/demo/[resource]/loading
 */

import React from 'react';

/**
 * Loading Component
 *
 * Suspense fallback for dynamic demo pages.
 */
export default function Loading() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="animate-pulse">
        {/* Breadcrumb Skeleton */}
        <div className="h-4 bg-gray-200 rounded w-48 mb-6"></div>

        {/* Title Skeleton */}
        <div className="h-10 bg-gray-200 rounded w-64 mb-4"></div>
        <div className="h-6 bg-gray-200 rounded w-96 mb-8"></div>

        {/* Info Card Skeleton */}
        <div className="card mb-8">
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>

        {/* Resource Viewer Skeleton */}
        <div className="card">
          <div className="h-8 bg-gray-200 rounded w-32 mb-4"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    </div>
  );
}
