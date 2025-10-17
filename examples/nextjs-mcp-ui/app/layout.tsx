import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'MCP-UI Demo - Next.js 15',
  description: 'Interactive demonstration of MCP-UI Layer 1 Foundation with Next.js 15 and React 19',
  keywords: ['MCP', 'UI', 'Next.js', 'React', 'Demo', 'Model Context Protocol'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen bg-gray-50">
          {children}
        </div>
      </body>
    </html>
  );
}
