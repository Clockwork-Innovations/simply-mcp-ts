import "./globals.css";
import { ReactNode } from "react";
import { Metadata } from 'next';

interface IProps {
  children: ReactNode;
}

export const metadata: Metadata = {
  title: "MCP Interpreter - Simply MCP",
  description: "Browser-based test harness for Model Context Protocol servers",
};

export default function RootLayout({ children }: IProps) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
