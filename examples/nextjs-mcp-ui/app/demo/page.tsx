/**
 * Demo Overview Page
 *
 * Main demo listing page that shows all available MCP-UI demos.
 * Provides cards for each demo with links to individual demo pages.
 *
 * @module app/demo/page
 */

import React from 'react';
import Link from 'next/link';
import { DemoLayout } from '../components/DemoLayout';
import { DemoGrid } from '../components/DemoCard';
import { getAllDemoResources } from '../../lib/demoResources';

/**
 * Demo Overview Page
 *
 * Server Component that displays all available demos.
 */
export default function DemoPage() {
  const allDemos = getAllDemoResources();
  const foundationDemos = allDemos.filter((d) => d.category === 'foundation');

  return (
    <DemoLayout
      title="MCP-UI Demos"
      description="Explore interactive demonstrations of MCP-UI Layer 1 (Foundation) capabilities"
      breadcrumbs={[
        { label: 'Home', href: '/' },
        { label: 'Demos' },
      ]}
      showSidebar={false}
    >
      {/* Introduction */}
      <div className="card mb-8 bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
        <div className="flex items-start gap-4">
          <div className="text-4xl">🎯</div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Layer 1: Foundation Demos
            </h2>
            <p className="text-gray-700 mb-4">
              These demos showcase the foundational capabilities of MCP-UI:
              rendering static HTML resources in sandboxed iframes using the
              UIResourceRenderer component from the{' '}
              <code className="px-2 py-1 bg-white rounded text-sm">
                simply-mcp
              </code>{' '}
              package.
            </p>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-start gap-2">
                <span className="text-green-500 text-lg">✓</span>
                <div>
                  <strong className="text-gray-900">Secure Rendering</strong>
                  <p className="text-gray-600">
                    Sandboxed iframe isolation
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-500 text-lg">✓</span>
                <div>
                  <strong className="text-gray-900">HTML Support</strong>
                  <p className="text-gray-600">
                    Full HTML5 and CSS3
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-500 text-lg">✓</span>
                <div>
                  <strong className="text-gray-900">Type Safety</strong>
                  <p className="text-gray-600">
                    TypeScript types included
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-6 mb-12">
        <div className="card bg-white border-2 border-purple-200">
          <div className="text-3xl font-bold text-purple-600 mb-1">
            {allDemos.length}
          </div>
          <div className="text-sm text-gray-600 uppercase tracking-wider">
            Total Demos
          </div>
        </div>
        <div className="card bg-white border-2 border-indigo-200">
          <div className="text-3xl font-bold text-indigo-600 mb-1">
            {foundationDemos.length}
          </div>
          <div className="text-sm text-gray-600 uppercase tracking-wider">
            Foundation Layer
          </div>
        </div>
        <div className="card bg-white border-2 border-blue-200">
          <div className="text-3xl font-bold text-blue-600 mb-1">
            100%
          </div>
          <div className="text-sm text-gray-600 uppercase tracking-wider">
            Type Safe
          </div>
        </div>
        <div className="card bg-white border-2 border-green-200">
          <div className="text-3xl font-bold text-green-600 mb-1">
            0ms
          </div>
          <div className="text-sm text-gray-600 uppercase tracking-wider">
            Bundle Size
          </div>
        </div>
      </div>

      {/* Demo Cards */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Available Demos
        </h2>
        <DemoGrid demos={allDemos} showTags />
      </div>

      {/* Getting Started */}
      <div className="card bg-gray-50 border-2 border-gray-200">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Getting Started
        </h2>
        <div className="space-y-4 text-gray-700">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-sm">
              1
            </div>
            <div>
              <strong className="text-gray-900">Click a demo card</strong>
              <p className="text-sm text-gray-600">
                Choose any demo above to see it in action
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-sm">
              2
            </div>
            <div>
              <strong className="text-gray-900">View the live render</strong>
              <p className="text-sm text-gray-600">
                See the UIResourceRenderer component in action
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-sm">
              3
            </div>
            <div>
              <strong className="text-gray-900">Inspect the code</strong>
              <p className="text-sm text-gray-600">
                Toggle code view to see the HTML source and integration example
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Back to Home */}
      <div className="mt-12 text-center">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700 font-medium transition-colors"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Back to Home
        </Link>
      </div>
    </DemoLayout>
  );
}
