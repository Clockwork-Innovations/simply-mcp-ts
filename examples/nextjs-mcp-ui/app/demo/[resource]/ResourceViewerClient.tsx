/**
 * Resource Viewer Client Component
 *
 * Client wrapper for ResourceViewer to handle client-side functionality.
 * This component bridges server and client components for Next.js App Router
 * and wires interactive tool execution via InteractiveHandler.
 *
 * @module app/demo/[resource]/ResourceViewerClient
 */

'use client';

import React, { useEffect, useRef } from 'react';
import type { UIResourceContent } from 'simply-mcp/client';
import { ResourceViewer } from '../../components/ResourceViewer';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { InteractiveHandler, type ToolExecutor } from '../../../lib/interactiveHandler';

/**
 * Props for ResourceViewerClient
 */
export interface ResourceViewerClientProps {
  /** UI resource to display */
  resource: UIResourceContent;

  /** Resource title */
  title?: string;

  /** Resource description */
  description?: string;

  /** Show code by default */
  showCode?: boolean;
}

/**
 * Resource Viewer Client Component
 *
 * Wraps ResourceViewer in an ErrorBoundary for safe client-side rendering.
 * Sets up InteractiveHandler for tool execution from iframes.
 *
 * @example
 * ```tsx
 * <ResourceViewerClient
 *   resource={resource}
 *   title="Product Card"
 *   showCode
 * />
 * ```
 */
export function ResourceViewerClient({
  resource,
  title,
  description,
  showCode = false,
}: ResourceViewerClientProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const handlerRef = useRef<InteractiveHandler | null>(null);
  const [toolCalls, setToolCalls] = React.useState<
    Array<{
      id: string;
      toolName: string;
      request: Record<string, unknown>;
      response?: Record<string, unknown>;
      timestamp: string;
    }>
  >([]);

  // Tool executor for mock/demo purposes
  const toolExecutor: ToolExecutor = async (toolName: string, args?: Record<string, unknown>) => {
    console.log(`[Tool Execution] ${toolName}`, args);

    // Mock responses for demo purposes
    if (toolName === 'submit_feedback') {
      return {
        success: true,
        data: {
          feedbackId: `FB-${Date.now()}`,
          message: 'Feedback submitted successfully',
          status: 'received',
        },
      };
    } else if (toolName === 'send_contact_message') {
      return {
        success: true,
        data: {
          messageId: `MSG-${Date.now()}`,
          message: 'Message sent successfully',
          status: 'sent',
        },
      };
    } else if (toolName === 'select_product') {
      return {
        success: true,
        data: {
          orderId: `ORD-${Date.now()}`,
          product: (args as any)?.productName,
          status: 'confirmed',
        },
      };
    } else if (toolName === 'export_report') {
      const format = (args as any)?.format || 'csv';
      return {
        success: true,
        data: {
          reportId: `REP-${Date.now()}`,
          format: format,
          filename: `analytics-report-${new Date().toISOString().split('T')[0]}.${format}`,
          size: Math.floor(Math.random() * 5000) + 500,
          status: 'exported',
        },
      };
    }

    return {
      success: false,
      error: `Unknown tool: ${toolName}`,
    };
  };

  // Setup InteractiveHandler when component mounts
  useEffect(() => {
    // Get the iframe from ResourceViewer
    const iframe = document.querySelector('iframe') as HTMLIFrameElement | null;

    if (iframe) {
      // Create handler if not already created
      if (!handlerRef.current) {
        handlerRef.current = new InteractiveHandler(toolExecutor, false);

        // Wrap the original handleMessage to track calls
        const originalHandleMessage = (handlerRef.current as any).handleMessage.bind(handlerRef.current);
        (handlerRef.current as any).handleMessage = async function(event: MessageEvent) {
          const action = event.data as any;

          // Track tool calls
          if (action.type === 'tool') {
            const callId = `${action.toolName}-${Date.now()}`;
            setToolCalls(prev => [...prev, {
              id: callId,
              toolName: action.toolName,
              request: { toolName: action.toolName, args: action.args },
              timestamp: new Date().toLocaleTimeString(),
            }]);

            // Execute original handler
            await originalHandleMessage(event);

            // Update with response
            setToolCalls(prev => prev.map(call =>
              call.id === callId
                ? {
                    ...call,
                    response: { success: true, message: 'Response received from tool executor' }
                  }
                : call
            ));
          } else {
            await originalHandleMessage(event);
          }
        };

        handlerRef.current.setupIframe(iframe);
      }
    }

    // Cleanup
    return () => {
      // Handler cleanup if needed
    };
  }, []);

  return (
    <ErrorBoundary>
      <div className="flex flex-col gap-6">
        {/* Preview Section */}
        <ResourceViewer
          resource={resource}
          title={title}
          description={description}
          showCode={showCode}
          renderPreview={true}
          renderResourceInfo={false}
        />

        {/* Tool Calls Monitor */}
        <div className="card bg-gradient-to-br from-purple-50 to-indigo-50 border-2 border-purple-300">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <span>🔄</span>
              <span>Tool Calls & Responses</span>
            </h3>
            <span className="text-sm px-3 py-1 bg-purple-600 text-white rounded-full font-bold">
              {toolCalls.length} {toolCalls.length === 1 ? 'call' : 'calls'}
            </span>
          </div>

          {toolCalls.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">👇</div>
              <p className="text-gray-600 font-medium">
                Interact with the preview to see tool calls tracked here
              </p>
            </div>
          ) : (
            <div className="space-y-4 max-h-screen overflow-y-auto">
              {toolCalls.map((call, idx) => (
                <div key={call.id} className="bg-white rounded-lg border-2 border-gray-200 overflow-hidden">
                  {/* Header */}
                  <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="bg-white text-purple-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                        {idx + 1}
                      </span>
                      <div>
                        <div className="font-bold text-lg">{call.toolName}</div>
                        <div className="text-purple-100 text-xs">{call.timestamp}</div>
                      </div>
                    </div>
                    {call.response && (
                      <span className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1">
                        ✓ Response
                      </span>
                    )}
                  </div>

                  {/* Request */}
                  <div className="p-4 border-b border-gray-200 bg-blue-50">
                    <div className="font-bold text-blue-900 mb-2 flex items-center gap-1">
                      <span>📤</span>
                      <span>Request Sent</span>
                    </div>
                    <div className="bg-white border border-blue-200 rounded p-3 font-mono text-xs text-gray-800 overflow-x-auto max-h-40 overflow-y-auto">
                      {JSON.stringify(call.request, null, 2)}
                    </div>
                  </div>

                  {/* Response */}
                  {call.response && (
                    <div className="p-4 bg-green-50">
                      <div className="font-bold text-green-900 mb-2 flex items-center gap-1">
                        <span>📥</span>
                        <span>Response Received</span>
                      </div>
                      <div className="bg-white border border-green-200 rounded p-3 font-mono text-xs text-gray-800 overflow-x-auto max-h-40 overflow-y-auto">
                        {JSON.stringify(call.response, null, 2)}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Resource Information Section */}
        <ResourceViewer
          resource={resource}
          title=""
          description=""
          showCode={false}
          renderPreview={false}
          renderResourceInfo={true}
        />
      </div>
    </ErrorBoundary>
  );
}

export default ResourceViewerClient;
