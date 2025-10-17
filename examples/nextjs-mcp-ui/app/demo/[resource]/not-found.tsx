/**
 * Not Found Page for Demo Resources
 *
 * Displayed when a demo resource cannot be found.
 *
 * @module app/demo/[resource]/not-found
 */

import React from 'react';
import Link from 'next/link';

/**
 * Not Found Component
 *
 * Displays a 404 error when a demo resource is not found.
 */
export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-lg w-full">
        <div className="card text-center">
          <div className="text-6xl mb-6">🔍</div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Demo Not Found
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            The demo resource you're looking for doesn't exist or has been removed.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/demo" className="btn-primary">
              View All Demos
            </Link>
            <Link href="/" className="btn-secondary">
              Go Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
