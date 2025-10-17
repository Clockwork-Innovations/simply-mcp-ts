/**
 * Loading State for Demo Overview Page
 *
 * Displays a loading skeleton while demos are being loaded.
 *
 * @module app/demo/loading
 */

import React from 'react';

/**
 * Loading Component
 *
 * Suspense fallback for demo overview page.
 */
export default function Loading() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="animate-pulse">
        {/* Breadcrumb Skeleton */}
        <div className="h-4 bg-gray-200 rounded w-48 mb-6"></div>

        {/* Title Skeleton */}
        <div className="h-12 bg-gray-200 rounded w-64 mb-4"></div>
        <div className="h-6 bg-gray-200 rounded w-96 mb-8"></div>

        {/* Info Card Skeleton */}
        <div className="card mb-8">
          <div className="h-48 bg-gray-200 rounded"></div>
        </div>

        {/* Demo Grid Skeleton */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="card">
              <div className="h-48 bg-gray-200 rounded mb-4"></div>
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-3"></div>
              <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
