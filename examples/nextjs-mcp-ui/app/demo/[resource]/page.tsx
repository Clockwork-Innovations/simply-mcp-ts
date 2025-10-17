/**
 * Dynamic Demo Page
 *
 * Individual demo page for each MCP-UI resource.
 * Uses Next.js dynamic routing to load resources by ID.
 *
 * @module app/demo/[resource]/page
 */

import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DemoLayout } from '../../components/DemoLayout';
import { ResourceViewerClient } from './ResourceViewerClient';
import { getDemoResource, getAllDemoResources } from '../../../lib/demoResources';
import type { ResourceId } from '../../../lib/types';

/**
 * Page Props
 */
interface PageProps {
  params: Promise<{
    resource: string;
  }>;
}

/**
 * Generate static params for all demo resources
 *
 * This enables static generation for all demo pages at build time.
 */
export async function generateStaticParams() {
  const demos = getAllDemoResources();
  return demos.map((demo) => ({
    resource: demo.id,
  }));
}

/**
 * Generate metadata for the page
 */
export async function generateMetadata({ params }: PageProps) {
  const { resource: resourceId } = await params;
  const demo = getDemoResource(resourceId as ResourceId);

  if (!demo) {
    return {
      title: 'Demo Not Found',
    };
  }

  return {
    title: `${demo.displayName} - MCP-UI Demo`,
    description: demo.description,
  };
}

/**
 * Dynamic Demo Page Component
 *
 * Server Component that loads the resource and passes it to client component.
 */
export default async function DemoResourcePage({ params }: PageProps) {
  const { resource: resourceId } = await params;
  const demo = getDemoResource(resourceId as ResourceId);

  // Handle not found
  if (!demo) {
    notFound();
  }

  // Breadcrumbs
  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Demos', href: '/demo' },
    { label: demo.displayName },
  ];

  const adjacentDemos = getAdjacentDemos(demo.id);

  return (
    <DemoLayout
      title={demo.displayName}
      description={demo.description}
      breadcrumbs={breadcrumbs}
      showSidebar={true}
    >
      {/* Resource Viewer (Client Component) - MOVED TO TOP */}
      <ResourceViewerClient
        resource={demo.resource}
        title="Live Preview"
        description="This resource is rendered using UIResourceRenderer from simply-mcp"
      />

      {/* Demo Info Card - MOVED DOWN */}
      <div className="card mb-8 bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
        <div className="flex items-start gap-4">
          <div className="text-4xl">{getIconForDemo(demo.id)}</div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <h2 className="text-xl font-bold text-gray-900">
                About This Demo
              </h2>
              <span className="badge badge-primary text-xs">
                {demo.category}
              </span>
            </div>
            <p className="text-gray-700 mb-4">{demo.description}</p>
            <div className="flex flex-wrap gap-2">
              {demo.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 bg-white text-gray-700 rounded-full text-sm border border-gray-200"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="mt-12 flex items-center justify-between">
        <Link
          href="/demo"
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
          Back to All Demos
        </Link>

        {/* Next/Previous Demo */}
        {adjacentDemos && (
          <div className="flex items-center gap-4">
            {adjacentDemos.prev && (
              <Link
                href={`/demo/${adjacentDemos.prev.id}`}
                className="text-gray-600 hover:text-purple-600 font-medium transition-colors text-sm"
              >
                ← {adjacentDemos.prev.displayName}
              </Link>
            )}
            {adjacentDemos.next && (
              <Link
                href={`/demo/${adjacentDemos.next.id}`}
                className="text-gray-600 hover:text-purple-600 font-medium transition-colors text-sm"
              >
                {adjacentDemos.next.displayName} →
              </Link>
            )}
          </div>
        )}
      </div>
    </DemoLayout>
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
 * Get adjacent demos (previous and next)
 */
function getAdjacentDemos(currentId: string) {
  const allDemos = getAllDemoResources();
  const currentIndex = allDemos.findIndex((d) => d.id === currentId);

  if (currentIndex === -1) return null;

  return {
    prev: currentIndex > 0 ? allDemos[currentIndex - 1] : null,
    next: currentIndex < allDemos.length - 1 ? allDemos[currentIndex + 1] : null,
  };
}
