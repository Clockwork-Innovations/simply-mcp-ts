import Link from 'next/link';
import { Navigation } from './components/Navigation';
import { DemoGrid } from './components/DemoCard';
import { getAllDemoResources } from '../lib/demoResources';

export default function Home() {
  const allDemos = getAllDemoResources();

  return (
    <>
      <Navigation />
      <div className="container mx-auto px-4 py-16 max-w-6xl">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="inline-block mb-6">
            <span className="badge badge-primary">Layer 1: Foundation</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-mcp-gradient bg-clip-text text-transparent">
            MCP-UI Demo
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto mb-8">
            Interactive demonstration of MCP-UI components with Next.js 15 and React 19
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/demo"
              className="btn-primary text-lg px-8 py-3"
            >
              Explore Demos
            </Link>
            <a
              href="https://github.com/your-repo/simple-mcp"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary text-lg px-8 py-3"
            >
              View on GitHub
            </a>
          </div>
        </div>

        {/* Introduction */}
        <div className="card mb-12">
          <h2 className="text-2xl font-bold mb-4">What is MCP-UI?</h2>
          <p className="text-gray-700 mb-4">
            MCP-UI is a framework for rendering user interfaces from Model Context Protocol (MCP) servers.
            This demo showcases <strong>Layer 1 (Foundation)</strong> - the basic HTML rendering layer
            using real components from the <code className="px-2 py-1 bg-gray-100 rounded">simply-mcp</code> package.
          </p>
          <p className="text-gray-700">
            All UI resources are rendered in sandboxed iframes for security, using the{' '}
            <code className="px-2 py-1 bg-gray-100 rounded">UIResourceRenderer</code> component.
          </p>
        </div>

        {/* Featured Demos */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-bold">Featured Demos</h2>
            <Link
              href="/demo"
              className="text-purple-600 hover:text-purple-700 font-medium transition-colors flex items-center gap-1"
            >
              View All
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
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </Link>
          </div>
          <DemoGrid demos={allDemos.slice(0, 3)} showTags />
        </div>

      {/* Architecture Info */}
      <div className="card bg-gray-50 border-2 border-gray-200">
        <h2 className="text-2xl font-bold mb-4">Architecture</h2>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-mcp-gradient text-white flex items-center justify-center text-sm font-bold">
              1
            </div>
            <div>
              <strong>Next.js 15 + React 19</strong>
              <p className="text-gray-600 text-sm">Modern React framework with App Router</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-mcp-gradient text-white flex items-center justify-center text-sm font-bold">
              2
            </div>
            <div>
              <strong>Real MCP-UI Components</strong>
              <p className="text-gray-600 text-sm">UIResourceRenderer and HTMLResourceRenderer from simply-mcp</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-mcp-gradient text-white flex items-center justify-center text-sm font-bold">
              3
            </div>
            <div>
              <strong>Mock MCP Client</strong>
              <p className="text-gray-600 text-sm">Simulates MCP server responses for demonstration</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-mcp-gradient text-white flex items-center justify-center text-sm font-bold">
              4
            </div>
            <div>
              <strong>Sandboxed Rendering</strong>
              <p className="text-gray-600 text-sm">Secure iframe rendering with strict sandbox attributes</p>
            </div>
          </div>
        </div>
      </div>

        {/* Quick Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-12">
          <div className="card bg-white text-center">
            <div className="text-3xl font-bold text-purple-600 mb-1">
              {allDemos.length}
            </div>
            <div className="text-sm text-gray-600">Live Demos</div>
          </div>
          <div className="card bg-white text-center">
            <div className="text-3xl font-bold text-indigo-600 mb-1">
              100%
            </div>
            <div className="text-sm text-gray-600">Type Safe</div>
          </div>
          <div className="card bg-white text-center">
            <div className="text-3xl font-bold text-blue-600 mb-1">
              Secure
            </div>
            <div className="text-sm text-gray-600">Sandboxed</div>
          </div>
          <div className="card bg-white text-center">
            <div className="text-3xl font-bold text-green-600 mb-1">
              React 19
            </div>
            <div className="text-sm text-gray-600">Latest Version</div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-16 text-center text-gray-500 text-sm">
          <p>Built with Next.js 15, React 19, and simply-mcp</p>
          <p className="mt-2">
            <Link href="/demo" className="text-purple-600 hover:text-purple-700 font-medium">
              Explore {allDemos.length} interactive demos
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}
