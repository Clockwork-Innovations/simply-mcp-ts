
Integrating MCP-UI: A Developer's Guide for Python and FastAPI Servers
1. Introduction to Interactive AI with MCP-UI
The landscape of human-computer interaction is undergoing a significant transformation, driven by the increasing sophistication of AI agents and Large Language Models (LLMs). For years, the primary mode of interaction has been conversational, confined to text-based prompts and responses. While powerful, this paradigm has inherent limitations. Complex tasks such as navigating product catalogs, filling out multi-step forms, or interpreting data visualizations are often cumbersome or impossible to manage through text alone. To unlock the next level of agentic workflows, AI must break free from the "text wall" and embrace rich, interactive user interfaces.
This guide provides a comprehensive, developer-focused roadmap for integrating MCP-UI, an emerging standard designed to bridge this gap. It enables AI agents, powered by the Model Context Protocol (MCP), to request and display fully interactive UI components directly within a client application. Instead of merely describing an action, the AI can present the user with a functional, visual tool—a product selector, an image gallery, a dynamic form—to complete the task collaboratively.
This evolution represents a fundamental architectural shift. The front-end is no longer a static application that simply calls a back-end API; it becomes a dynamic rendering target for UI components served on-demand by an AI's reasoning process. This blurs the traditional lines between front-end and back-end development in agentic systems. A developer building an MCP-UI-enabled tool is now, in effect, a full-stack "component developer" for an AI agent, responsible for the back-end logic, the interactive user experience, and the secure communication channel that binds them.
MCP and MCP-UI: The Protocol Layers
To understand MCP-UI, it is essential to first grasp the role of its foundation: the Model Context Protocol (MCP). MCP is an open standard that acts as a universal connector, or a "USB-C port for AI," defining a standardized way for AI models to communicate with external tools, data sources, and applications. An existing MCP server exposes a set of capabilities—tools (functions), resources (data), and prompts (templates)—that an AI agent can discover and invoke.
MCP-UI is not a replacement for MCP but a specialized, community-driven extension built upon MCP's existing resource-sharing specification. It standardizes how an MCP server can respond not just with raw data, but with a UIResource—a structured object that describes a renderable UI component. This layered approach allows developers already familiar with MCP to extend their existing servers with UI capabilities without learning an entirely new protocol.
The "Write Once, Run Everywhere" Vision
MCP-UI is designed as an open specification with the goal of creating a standardized ecosystem for interactive AI components. This "write once, run everywhere" philosophy means that a developer can define a UI component on their server, and any MCP-UI-compatible client—be it a desktop application like Claude Desktop, an IDE like Cursor, or a custom web application—can securely render and interact with it. This guide will walk through the practical steps of turning this vision into reality for a Python and FastAPI-based MCP server.
2. The MCP-UI Conceptual Framework
At its core, MCP-UI introduces a closed-loop system where an AI agent can request a UI, the client can render it securely, and user interactions within that UI can trigger further actions on the server. Understanding this workflow and the data structures that enable it is fundamental to successful implementation.
2.1. The Core Interaction Workflow (The "UI Loop")
The entire process, from the initial AI request to the final server-side callback, can be broken down into a sequence of well-defined steps. This "UI Loop" ensures a secure and robust separation of concerns between the server, the client host, and the rendered UI component.
The workflow proceeds as follows:
* Agent Request: During its reasoning process, an AI agent determines that it needs to display an interactive UI to the user (e.g., to collect specific information or present options). It invokes a designated tool on the MCP server that is designed to provide this UI.
* Server Response: The MCP-UI server executes the tool's logic. Instead of returning a standard JSON data payload, it constructs and returns a special UIResource object. This object contains the UI definition (e.g., an HTML string or a URL) and metadata describing how it should be rendered.
* Client Rendering: The client-side host application (e.g., a React web app) receives the MCP response. It identifies the content as a UIResource, typically by checking for the ui:// URI scheme. It then passes this object to a specialized rendering component, such as the <UIResourceRenderer /> from the @mcp-ui/client library.
* Sandboxed Execution: The renderer creates a sandboxed <iframe> element. This is a critical security step that isolates the UI component from the main application's DOM and JavaScript environment. The renderer injects the UI content into this iframe, using either the srcdoc attribute for inline HTML or the src attribute for external URLs.
* User Interaction: The user interacts with the UI now displayed within the sandboxed iframe—for example, by filling out a form and clicking a "Submit" button.
* Event Emission: JavaScript code running inside the iframe captures this user interaction. It then uses the standard browser window.parent.postMessage API to send a structured event payload back to the host application. This message is carefully formatted to describe the user's "intent" or to request a specific "tool call".
* Host Handling: The host application has an event listener (specifically, the onUIAction prop on the <UIResourceRenderer /> component) that securely catches the message from the iframe. It parses the payload to understand what action the user took.
* Server Callback: Based on the event payload, the host application initiates a new MCP tool call back to the server. For instance, if the user submitted a form, the host calls a tool like submit_form and passes the form data as arguments. This final step "closes the loop," allowing the server to process the data submitted through the UI.
This architecture elegantly maintains a clean separation: the server defines the UI and its business logic, the iframe securely executes the UI code, and the client host acts as a trusted intermediary, orchestrating communication between the two.
2.2. Anatomy of a UIResource
The UIResource is the central data structure in the MCP-UI protocol. It is an extension of the standard MCP resource primitive and serves as the primary payload for delivering UI components from the server to the client. A deep understanding of its structure is essential for server-side development.
A typical UIResource object has the following structure:
{
  "type": "resource",
  "resource": {
    "uri": "ui://user-form/123",
    "mimeType": "text/html",
    "text": "<form>...</form>"
  }
}

The key fields are:
* type: This is always set to the string 'resource', identifying it as a standard MCP resource.
* resource: This nested object contains the specific details of the UI component.
   * uri: A unique string identifier for the resource. By convention, all MCP-UI resources use the ui:// scheme (e.g., ui://component/id). This URI allows the client to identify, route, and potentially cache the UI component.
   * mimeType: This is the most critical field, as it instructs the client on how to render the content. The protocol defines several types, with the three most common being 'text/html', 'text/uri-list', and 'application/vnd.mcp-ui.remote-dom'.
   * text or blob: These fields contain the actual UI content. The text field is used for raw string content, such as an HTML snippet, a URL, or a Remote DOM script. The blob field can be used for larger payloads, typically containing Base64-encoded content.
2.3. Choosing the Right UIResource Type
The mimeType of a UIResource determines its rendering strategy. MCP-UI supports three primary mechanisms, each tailored to different use cases, complexity levels, and security considerations.
* Inline HTML (mimeType: 'text/html')
   * Description: The server returns a string of raw HTML content in the text field. The client renders this content within a sandboxed <iframe> using the srcdoc attribute. This method is simple and highly secure as the content is self-contained.
   * Use Case: This approach is ideal for simple, self-contained UI components that do not require external stylesheets, complex JavaScript libraries, or network requests. Examples include a basic confirmation dialog with "Yes/No" buttons, a card displaying static information, or a simple form with one or two input fields.
* External URL (mimeType: 'text/uri-list')
   * Description: The server returns a standard https URL in the text field. The client renders this URL within a sandboxed <iframe> using the src attribute. The protocol specifies that even if multiple URLs are provided (per the text/uri-list standard), only the first valid http/s URL will be used.
   * Use Case: This pattern is perfect for embedding existing, full-featured web applications or complex components that are already hosted on a separate server. It allows for the reuse of established UIs. Examples include embedding an interactive analytics dashboard widget, a third-party payment processing form (e.g., Stripe), or a complex product configuration tool.
* Remote DOM (mimeType: 'application/vnd.mcp-ui.remote-dom')
   * Description: This is the most sophisticated and integrated approach. The server returns a JavaScript script that runs in a sandboxed environment on the client (typically a Web Worker). This script does not render HTML directly; instead, it sends a series of declarative commands describing the UI structure and behavior to the host application. The host's renderer then translates these commands into its own native UI components (e.g., React components). This technique is powered by Shopify's open-source remote-dom library and allows the rendered UI to seamlessly match the look and feel of the host application.
   * Use Case: This is best for creating complex, highly interactive components that need to feel native to the host application and adhere to its design system. It avoids the visual and functional disconnect of a standard <iframe> and enables a much tighter integration between the remote UI and the host.
The following table provides a comparative overview to aid in selecting the appropriate UIResource type for a given task.
| Feature | Inline HTML | External URL | Remote DOM |
|---|---|---|---|
| MIME Type | text/html | text/uri-list | application/vnd.mcp-ui.remote-dom |
| Description | Server sends a raw HTML string. | Server sends a URL to an existing web page. | Server sends a JavaScript script that describes the UI. |
| Best For | Simple, self-contained UI snippets and forms. | Embedding existing, complex web applications or services. | Sophisticated, interactive components that need to match the host's native look and feel. |
| Pros | - Very simple to create.
- Highly secure and isolated.
- No external dependencies. | - Reuses existing web applications.
- Supports complex, full-featured UIs.
- Strong security via iframe sandbox. | - UI matches host's design system.
- Tighter integration than an iframe.
- Enables rich, stateful interactivity. |
| Cons | - Limited to simple HTML/CSS/JS.
- Cannot easily use external libraries or assets.
- Can feel disconnected from the host UI. | - Requires hosting a separate web application.
- Can have a distinct look and feel from the host app.
- Subject to host's Content Security Policy (CSP). | - More complex to implement on the server side.
- Requires client-side support for the remote-dom library. |
| Security Isolation | Strong (via iframe srcdoc and sandbox attribute). | Strong (via iframe src and sandbox attribute). | Strong (JS runs in a sandboxed Web Worker). |
3. Server-Side Implementation: Upgrading Your FastAPI Server
Integrating MCP-UI into an existing Python and FastAPI server involves using a dedicated server-side SDK to construct UIResource objects and modifying your existing tool endpoints to return them. The process also requires creating new tools to handle the callbacks from user interactions within the rendered UI.
3.1. The Python Server SDK (mcp-ui-server)
The official community-supported library for creating UIResource objects in a Python environment is mcp-ui-server. This package provides helper functions that abstract away the complexity of building the required dictionary structure, ensuring that the generated objects conform to the MCP-UI specification.
The core function provided by this SDK is create_ui_resource, which takes a dictionary of options and returns a valid UIResource object ready to be sent in an MCP response.
Key Resources:
* PyPI Package: The library can be installed directly from the Python Package Index.
   * pip install mcp-ui-server
   * PyPI Page: https://pypi.org/project/mcp-ui-server/
* GitHub Repository: The source code is part of the main mcp-ui monorepo.
   * GitHub Link: https://github.com/idosal/mcp-ui (The Python SDK is located under the sdks/python directory).
3.2. From JSON to UIResource: A Practical Refactoring Example
Let's consider a common scenario: an existing MCP server has a tool that retrieves user information and returns it as a simple JSON object. The goal is to upgrade this tool to return a visually formatted HTML card instead.
This example uses the fastmcp library, a popular framework that simplifies building MCP servers on top of ASGI frameworks like FastAPI by using decorators to expose functions as MCP tools.
Before: Returning JSON
Here is a typical FastAPI application with a fastmcp tool that returns user data as a dictionary.
# main_before.py
from fastapi import FastAPI
from mcp.server.fastmcp import FastMCP

# A mock database of users
FAKE_DB = {
    "user123": {"name": "Alice", "email": "alice@example.com", "status": "Active"},
}

app = FastAPI()
mcp = FastMCP("My User Server")

@mcp.tool()
def get_user_info(user_id: str) -> dict:
    """
    Retrieves information for a given user ID and returns it as JSON.
    """
    user = FAKE_DB.get(user_id)
    if user:
        return user
    return {"error": "User not found"}

# This would typically be part of a larger MCP server setup
# For simplicity, we assume the MCP server is mounted and running.

When an AI agent calls this tool with get_user_info(user_id='user123'), it receives the following JSON response:
{
  "name": "Alice",
  "email": "alice@example.com",
  "status": "Active"
}

After: Returning a UIResource
Now, the get_user_info tool will be modified to return an interactive HTML card. This involves importing create_ui_resource and changing the function's logic and return type.
# main_after.py
from fastapi import FastAPI
from mcp.server.fastmcp import FastMCP
from mcp_ui_server import create_ui_resource
from mcp_ui_server.core import UIResource  # For type hinting

# A mock database of users
FAKE_DB = {
    "user123": {"name": "Alice", "email": "alice@example.com", "status": "Active"},
}

app = FastAPI()
mcp = FastMCP("My User Server")

@mcp.tool()
def get_user_info(user_id: str) -> list:
    """
    Retrieves information for a given user ID and returns an interactive HTML card.
    """
    user = FAKE_DB.get(user_id)
    if not user:
        # Even errors can be returned as UI components
        error_html = "<div><h2>Error</h2><p>User not found.</p></div>"
        ui_error_resource = create_ui_resource({
            "uri": f"ui://error/user-not-found/{user_id}",
            "content": {"type": "rawHtml", "htmlString": error_html},
            "encoding": "text"
        })
        return [ui_error_resource]

    # Construct the HTML for the user card
    html_content = f"""
    <div style="border: 1px solid #ccc; border-radius: 8px; padding: 16px; font-family: sans-serif;">
        <h2 style="margin-top: 0;">User Profile: {user['name']}</h2>
        <p><strong>Email:</strong> {user['email']}</p>
        <p><strong>Status:</strong> {user['status']}</p>
    </div>
    """

    # Use the SDK to create a valid UIResource object
    ui_card_resource = create_ui_resource({
        "uri": f"ui://user-card/{user_id}",
        "content": {
            "type": "rawHtml",
            "htmlString": html_content
        },
        "encoding": "text"
    })

    # MCP tool responses are often lists of content blocks, so we return a list
    return [ui_card_resource]


In this updated version, the function's return type hint is changed to list. Instead of returning the user dictionary directly, it constructs an HTML string and passes it to create_ui_resource. The resulting dictionary is then returned inside a list. FastAPI and fastmcp handle the serialization of this dictionary into the final JSON response sent to the client.
3.3. Handling UI Callbacks
The true power of MCP-UI lies in its interactivity. When a user performs an action inside the rendered UI (e.g., clicking a "Submit" button), that action must trigger logic back on the server. The MCP-UI architecture achieves this by reusing the existing tool primitive. A user action in the UI simply triggers a new MCP tool call, orchestrated by the client host.
This means that handling a UI callback on the server is as simple as defining another MCP tool.
Let's extend the previous example. Suppose the user card HTML included a button to deactivate the user.
1. HTML with a Callback Button
The HTML string generated by get_user_info would be modified to include a button with an onclick handler. This handler uses window.parent.postMessage to send a tool action to the host.
<button onclick="deactivateUser()">Deactivate User</button>
<script>
    function deactivateUser() {
        window.parent.postMessage({
            type: 'tool',
            payload: {
                toolName: 'deactivate_user_account',
                params: { userId: '{user_id}' } // The server would inject the actual user_id here
            }
        }, '*');
    }
</script>

2. Server-Side Tool to Handle the Callback
On the FastAPI server, a new tool named deactivate_user_account is created to receive and process this request.
# In main_after.py, add this new tool

@mcp.tool()
def deactivate_user_account(user_id: str) -> dict:
    """
    Handles the callback from the UI to deactivate a user's account.
    """
    if user_id in FAKE_DB:
        # In a real application, this would update the database
        FAKE_DB[user_id]['status'] = 'Inactive'
        print(f"User {user_id} has been deactivated.")
        return {"status": "success", "message": f"User {user_id} deactivated."}
    else:
        print(f"Attempted to deactivate non-existent user: {user_id}")
        return {"status": "error", "message": "User not found."}

This design is remarkably elegant. The server does not need to expose a separate REST endpoint, webhook, or WebSocket connection to handle UI events. All interactions, whether for generating the initial UI or processing subsequent actions, are managed through the single, unified, and secure MCP interface. The developer only needs to think in terms of defining and implementing "tools."
4. Client-Side Implementation: Rendering with React
On the client side, a corresponding SDK is needed to receive the UIResource object and render it securely. For web applications built with React, the @mcp-ui/client package provides the necessary components and utilities.
4.1. The TypeScript Client SDK (@mcp-ui/client)
The @mcp-ui/client package is the official library for building MCP-UI-compatible host applications. It includes a React component (<UIResourceRenderer />) and a standard Web Component (<ui-resource-renderer>) for easy integration into any web front-end.
Key Resources:
* npm Package: The library can be installed from the npm registry.
   * npm install @mcp-ui/client
   * npm Page: https://www.npmjs.com/package/@mcp-ui/client
* GitHub Repository: The source code is part of the main mcp-ui monorepo.
   * GitHub Link: https://github.com/idosal/mcp-ui (The client SDK is located under the sdks/client directory).
4.2. Rendering with the <UIResourceRenderer /> Component
The <UIResourceRenderer /> is the central component for rendering UI on the client. It automatically detects the mimeType of the provided resource and uses the appropriate internal renderer (e.g., an <iframe> or a Remote DOM renderer).
The component's two most important props are:
* resource: This prop takes the resource object nested inside the UIResource payload received from the MCP server. It must contain the uri, mimeType, and content (text or blob).
* onUIAction: This is an optional callback function that serves as the event handler for all user interactions originating from within the rendered UI. It receives an action object from the iframe's postMessage call and is where the client-side logic for handling UI events is implemented.
The following React/TypeScript snippet demonstrates how to use the component to render a resource and handle an action.
// App.tsx
import React, { useState } from 'react';
import { UIResourceRenderer, UIActionResult, isUIResource } from '@mcp-ui/client';
import { UIResource } from '@mcp-ui/core'; // Assuming core types are available

// This is a mock response that would typically come from an MCP server call
const mockMcpResponse: UIResource = {
  type: 'resource',
  resource: {
    uri: 'ui://user-card/user123',
    mimeType: 'text/html',
    text: `
      <div style="border: 1px solid #ccc; border-radius: 8px; padding: 16px; font-family: sans-serif;">
          <h2 style="margin-top: 0;">User Profile: Alice</h2>
          <p><strong>Email:</strong> alice@example.com</p>
          <p><strong>Status:</strong> Active</p>
          <button onclick="deactivateUser()">Deactivate User</button>
          <script>
              function deactivateUser() {
                  window.parent.postMessage({
                      type: 'tool',
                      payload: {
                          toolName: 'deactivate_user_account',
                          params: { userId: 'user123' }
                      }
                  }, '*');
              }
          </script>
      </div>
    `,
  },
};

const App: React.FC = () => {
  const [mcpContent, setMcpContent] = useState<any>(mockMcpResponse);
  const = useState<string | null>(null);

  // Define the action handler for UI events
  const handleUIAction = async (action: UIActionResult) => {
    console.log('UI Action received by host:', action);

    if (action.type === 'tool') {
      const { toolName, params } = action.payload;
     
      // Here, you would make a real MCP tool call to your server
      console.log(`Executing tool call: ${toolName} with params:`, params);
     
      // Simulate an async server call
      await new Promise(resolve => setTimeout(resolve, 500));
     
      const response = { status: 'success', message: `Tool '${toolName}' executed.` };
      setLastActionStatus(response.message);
     
      // The return value can be sent back to the iframe if it's listening for a response
      return response;
    }
  };

  return (
    <div>
      <h1>MCP-UI Client Host</h1>
      {mcpContent && isUIResource(mcpContent)? (
        <UIResourceRenderer
          resource={mcpContent.resource}
          onUIAction={handleUIAction}
        />
      ) : (
        <p>No UI Resource to display.</p>
      )}
      {lastActionStatus && (
        <div style={{ marginTop: '20px', padding: '10px', border: '1px solid green' }}>
          <p><strong>Last Action Status:</strong> {lastActionStatus}</p>
        </div>
      )}
    </div>
  );
};

export default App;

4.3. The Security Model in Practice
The security of MCP-UI is paramount, as it involves rendering code from a server directly within a client application. The entire security model is built upon the robust, browser-native features of <iframe> sandboxing and the postMessage API.
* The <iframe> Sandbox: All remote content, regardless of type, is rendered inside an <iframe>. This element acts as a nested browsing context, creating a strong boundary between the embedded content and the parent (host) page. To enforce this boundary, MCP-UI leverages the sandbox attribute of the <iframe> element.
* The sandbox Attribute: When the sandbox attribute is present on an <iframe>, it applies a strict set of restrictions to the content within it. By default, it blocks scripts, form submissions, popups, pointer lock, top-level navigation, and more. It also treats the content as being from a unique, opaque origin, which prevents it from accessing cookies or local storage from the parent's origin. Permissions must be explicitly re-enabled on a case-by-case basis.
* Default Permissions in MCP-UI: The @mcp-ui/client renderer applies a minimal set of required permissions by default to allow for interactivity while maintaining security.
   * For Inline HTML (text/html), the default is sandbox="allow-scripts". This allows JavaScript within the UI to run but prevents it from submitting forms directly or creating popups.
   * For External URLs (text/uri-list), the default is sandbox="allow-scripts allow-same-origin". The allow-same-origin token is crucial for external applications that may need to make fetch requests to their own backend or access their own origin's storage.
     These defaults can be extended using the sandboxPermissions prop if a specific UI requires additional capabilities, but this should be done with caution.
* The postMessage API: While the sandbox isolates the iframe, the postMessage API provides the sole, secure communication channel between the iframe and its parent host. This event-based API allows the two contexts to exchange string-based messages without giving the iframe's code direct access to the host page's DOM, global variables, or functions. The host application listens for these messages and can validate their origin and content before acting on them, ensuring that the iframe can only request actions that the host explicitly permits.
* Content Security Policy (CSP): As an additional layer of defense, the host application's own Content Security Policy (CSP) provides control. When rendering an External URL (text/uri-list), the host's HTTP headers must include a frame-src directive in its CSP that whitelists the domain of the external URL. If the domain is not whitelisted, the browser will refuse to load the iframe, regardless of the MCP-UI request.
Together, these mechanisms create a multi-layered security model that allows for rich interactivity while mitigating the risks associated with executing server-provided code on the client.
5. End-to-End Example: The "Hello, Form!" Interactive Loop
To solidify these concepts, this section provides a complete, runnable end-to-end example. It demonstrates the full interactive loop: a Python/FastAPI server defines a simple form, a React client renders it, the user submits data, and the data is sent back to the server.
5.1. The Scenario
The use case is straightforward:
* An AI agent needs to ask the user for their name.
* It calls a tool on the MCP server named show_name_form.
* The server responds with a UIResource containing an HTML form with a text input and a "Submit" button.
* The client renders this form.
* The user types their name into the input and clicks "Submit".
* The form data is sent back to the server via a second tool call, submit_name.
* The server processes the name and returns a confirmation.
5.2. Full Server Code (Python/FastAPI)
This single main.py file contains the complete FastAPI server with the two required MCP tools.
# main.py
import uvicorn
from fastapi import FastAPI
from mcp.server.fastmcp import FastMCP
from mcp_ui_server import create_ui_resource
from mcp_ui_server.core import UIResource

# Initialize FastAPI and FastMCP
app = FastAPI(title="MCP-UI Form Server")
mcp = FastMCP("FormServer")

@mcp.tool()
def show_name_form() -> list:
    """
    Generates and returns a UIResource for a simple HTML form to ask for the user's name.
    """
    print("Tool 'show_name_form' called. Generating UI resource...")
   
    # The HTML content includes JavaScript to handle the form submission via postMessage.
    html_content = """
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body { font-family: sans-serif; margin: 1em; }
            input { width: calc(100% - 12px); padding: 8px; margin-bottom: 10px; border: 1px solid #ccc; border-radius: 4px; }
            button { padding: 10px 15px; border: none; background-color: #007bff; color: white; border-radius: 4px; cursor: pointer; }
            button:hover { background-color: #0056b3; }
        </style>
    </head>
    <body>
        <h3>What is your name?</h3>
        <form id="nameForm">
            <input type="text" id="nameInput" placeholder="Enter your name" required>
            <button type="submit">Submit</button>
        </form>

        <script>
            document.getElementById('nameForm').addEventListener('submit', function(event) {
                event.preventDefault();
                const name = document.getElementById('nameInput').value;
                if (name) {
                    // Send the form data back to the parent host application
                    window.parent.postMessage({
                        type: 'tool',
                        payload: {
                            toolName: 'submit_name',
                            params: { name: name }
                        }
                    }, '*'); // In production, you should use a specific target origin
                }
            });
        </script>
    </body>
    </html>
    """

    # Create the UIResource object using the SDK
    form_resource = create_ui_resource({
        "uri": "ui://hello-form/name-input",
        "content": {
            "type": "rawHtml",
            "htmlString": html_content
        },
        "encoding": "text"
    })

    return [form_resource]

@mcp.tool()
def submit_name(name: str) -> dict:
    """
    Receives the name submitted from the UI form and returns a confirmation.
    """
    print(f"Tool 'submit_name' called. Received name: {name}")
   
    # In a real application, you would process this data (e.g., save to a database)
   
    return {
        "status": "success",
        "message": f"Hello, {name}! Your name has been received by the server."
    }

# Mount the MCP server as a streamable HTTP app, which creates the /mcp endpoint
mcp_app = mcp.streamable_http_app()
app.mount("/mcp", mcp_app)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)


5.3. Full Client Code (TypeScript/React)
This App.tsx file contains a minimal React application to interact with the server. It simulates the initial tool call and handles the UI rendering and callback loop.
// App.tsx
import React, { useState } from 'react';
import { UIResourceRenderer, UIActionResult, isUIResource } from '@mcp-ui/client';
import { UIResource } from '@mcp-ui/core';

// Helper function to simulate fetching data from the MCP server
async function callMcpTool(toolName: string, params: Record<string, any> = {}): Promise<any> {
  // In a real app, this would be a proper MCP client call over HTTP+SSE or stdio.
  // Here, we simulate it with a fetch call to our FastAPI server.
  const response = await fetch('http://localhost:8000/mcp/call_tool', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Math.random(),
      method: 'tools/call',
      params: { name: toolName, arguments: params },
    }),
  });
  const jsonResponse = await response.json();
  // The actual content is in the result.content array
  return jsonResponse.result.content;
}

const App: React.FC = () => {
  const = useState<UIResource | null>(null);
  const = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleShowForm = async () => {
    setIsLoading(true);
    setServerMessage(null);
    setUiResource(null);
    try {
      const contentBlocks = await callMcpTool('show_name_form');
      // Find the first UIResource in the response content
      const resource = contentBlocks.find((block: any) => isUIResource(block));
      if (resource) {
        setUiResource(resource);
      }
    } catch (error) {
      console.error("Error fetching form:", error);
      setServerMessage("Failed to load form from server.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUIAction = async (action: UIActionResult) => {
    if (action.type === 'tool') {
      const { toolName, params } = action.payload;
      setServerMessage(`Submitting name to server...`);
      try {
        const responseContent = await callMcpTool(toolName, params);
        // Assuming the response is a simple text block
        const messageBlock = responseContent.find((block: any) => block.type === 'text');
        if (messageBlock) {
          const confirmation = JSON.parse(messageBlock.text);
          setServerMessage(confirmation.message);
        }
        // Hide the form after successful submission
        setUiResource(null);
      } catch (error) {
        console.error("Error submitting form:", error);
        setServerMessage("Failed to submit name.");
      }
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: 'auto', fontFamily: 'sans-serif' }}>
      <h1>MCP-UI End-to-End Form Example</h1>
      <button onClick={handleShowForm} disabled={isLoading}>
        {isLoading? 'Loading Form...' : 'Ask for Name'}
      </button>

      {uiResource && (
        <div style={{ marginTop: '20px', border: '1px solid #ddd', padding: '10px' }}>
          <UIResourceRenderer
            resource={uiResource.resource}
            onUIAction={handleUIAction}
          />
        </div>
      )}

      {serverMessage && (
        <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#e0f7fa' }}>
          <strong>Server Response:</strong> {serverMessage}
        </div>
      )}
    </div>
  );
};

export default App;

5.4. Tracing the Interaction
With both the server and client running, the interaction proceeds as follows:
* Initial State: The user sees the React app with the "Ask for Name" button.
* Trigger: The user clicks the "Ask for Name" button. The handleShowForm function is called.
* Request UI: The client makes a simulated MCP tool call to the show_name_form tool on the FastAPI server at http://localhost:8000/mcp.
* Serve UI: The server executes show_name_form, prints a log message, creates the HTML form UIResource, and sends it back as a JSON response.
* Render UI: The client's handleShowForm function receives the response, finds the UIResource object using isUIResource, and updates the uiResource state. React re-renders, and the <UIResourceRenderer> component displays the HTML form inside a sandboxed <iframe>.
* User Input: The user types their name (e.g., "Jane Doe") into the text input and clicks the "Submit" button.
* postMessage Event: The submit event listener inside the iframe's JavaScript code executes. It prevents the default form submission, retrieves the input value, and calls window.parent.postMessage with a payload containing { type: 'tool', payload: { toolName: 'submit_name', params: { name: 'Jane Doe' } } }.
* Handle Action: The onUIAction prop of the <UIResourceRenderer> (the handleUIAction function) is triggered. It receives the action object from the postMessage event.
* Callback to Server: The handleUIAction function identifies the action as a tool call for submit_name. It then makes a new MCP tool call to the server, this time to the submit_name tool, passing { "name": "Jane Doe" } as the arguments.
* Process Data: The FastAPI server receives the request. It executes the submit_name tool, which prints "Received name: Jane Doe" to the server console and returns a JSON confirmation message.
* Confirmation: The client receives the confirmation message, updates the serverMessage state, and clears the uiResource state (hiding the form). The user now sees the confirmation message "Hello, Jane Doe! Your name has been received by the server." displayed on the page.
This completes the full, secure, and interactive loop, demonstrating the power and elegance of the MCP-UI architecture.
6. Conclusion and Resource Compendium
The integration of MCP-UI into a Model Context Protocol server marks a pivotal evolution in the development of agentic AI applications. By moving beyond text-only interactions, developers can create richer, more intuitive, and more capable systems that leverage visual components to collaborate with users. The architecture, founded on the principles of extending the existing MCP resource specification, ensures that this powerful new capability is both a natural and secure evolution of the protocol.
The core architectural patterns are clear: UIResource objects act as the standardized payload for UI definitions, sandboxed <iframe>s provide a robust security boundary, and the postMessage API facilitates a secure, event-driven communication channel. Crucially, the reuse of the standard MCP tool primitive for handling UI callbacks simplifies the server-side architecture, allowing developers to manage all agent-facing functionality through a single, consistent interface. For teams working with Python and FastAPI, the mcp-ui-server and fastmcp libraries provide the necessary tools to implement this new paradigm efficiently.
As the MCP-UI specification is still an emerging and experimental standard, developers should anticipate continued evolution. However, the foundational concepts and SDKs provide a solid and functional basis for building the next generation of interactive AI experiences today.
Resource Compendium
The following is a curated list of essential resources for developing with MCP and MCP-UI.
Official Specifications and Documentation
* Model Context Protocol (MCP) Official Site: https://modelcontextprotocol.io/
* MCP-UI Official Site & Documentation: https://mcpui.dev/
SDKs and Repositories
* mcp-ui Monorepo (Client & Server SDKs): https://github.com/idosal/mcp-ui
* mcp-ui-server on PyPI (Python SDK): https://pypi.org/project/mcp-ui-server/
* @mcp-ui/client on npm (TypeScript/React SDK): https://www.npmjs.com/package/@mcp-ui/client
* Official MCP Python SDK: https://github.com/modelcontextprotocol/python-sdk
Key Frameworks and Tools
* FastMCP (Python Framework): https://gofastmcp.com/
* FastAPI-MCP (FastAPI Integration): https://github.com/tadata-org/fastapi_mcp
* MCP Inspector (Debugging Tool): https://github.com/modelcontextprotocol/inspector
High-Quality Technical Articles
* Shopify Engineering - "MCP UI: Breaking the text wall with interactive components": https://shopify.engineering/mcp-ui-breaking-the-text-wall
* WorkOS Blog - "MCP-UI: A Technical Deep Dive into Interactive Agent Interfaces": https://workos.com/blog/mcp-ui-a-technical-deep-dive-into-interactive-agent-interfaces
 
