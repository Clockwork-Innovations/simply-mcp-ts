/**
 * Simply MCP Test Harness - Foundation Layer
 * Vanilla JavaScript application for testing MCP servers
 */

// ============================================================================
// State Management
// ============================================================================

let currentTab = 'tools';
let serverInfo = null;
let toolsList = [];
let resourcesList = [];
let promptsList = [];

// ============================================================================
// DOM Element References
// ============================================================================

const elements = {
    // Loading and error
    loadingIndicator: null,
    errorBanner: null,
    errorText: null,
    errorClose: null,

    // Server info
    serverName: null,
    serverStatus: null,
    statusText: null,
    mcpPort: null,

    // Tab navigation
    tabButtons: null,
    tabContents: null,
};

// ============================================================================
// Initialization
// ============================================================================

/**
 * Initialize the application when DOM is ready
 */
document.addEventListener('DOMContentLoaded', () => {
    console.log('Simply MCP Test Harness - Initializing...');

    // Cache DOM element references
    cacheElements();

    // Set up event listeners
    setupEventListeners();

    // Fetch server information
    fetchServerInfo();

    // Load tools on initial load
    fetchTools();

    // Load resources
    fetchResources();

    // Setup UI Preview tab
    setupUIPreview();
});

/**
 * Cache references to frequently accessed DOM elements
 */
function cacheElements() {
    // Loading and error
    elements.loadingIndicator = document.getElementById('loading-indicator');
    elements.errorBanner = document.getElementById('error-message');
    elements.errorText = document.getElementById('error-text');
    elements.errorClose = document.getElementById('error-close');

    // Server info
    elements.serverName = document.getElementById('server-name');
    elements.serverStatus = document.getElementById('server-status');
    elements.statusText = document.getElementById('status-text');
    elements.mcpPort = document.getElementById('mcp-port');

    // Tab navigation
    elements.tabButtons = document.querySelectorAll('.tab-button');
    elements.tabContents = document.querySelectorAll('.tab-content');
}

/**
 * Set up all event listeners
 */
function setupEventListeners() {
    // Tab button click handlers
    elements.tabButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const tabName = e.target.getAttribute('data-tab');
            switchTab(tabName);
        });
    });

    // Error banner close button
    if (elements.errorClose) {
        elements.errorClose.addEventListener('click', hideError);
    }
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Fetch server information from the API
 */
async function fetchServerInfo() {
    console.log('Fetching server information...');
    showLoading();
    hideError();

    try {
        const response = await fetch('/api/server-info');

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Server info received:', data);

        serverInfo = data;
        updateServerInfo(data);
        hideLoading();

    } catch (error) {
        console.error('Failed to fetch server information:', error);
        hideLoading();
        showError(`Failed to connect to server: ${error.message}`);

        // Set default placeholder values on error
        updateServerInfo({
            name: 'Unknown',
            status: 'error',
            port: '--',
        });
    }
}

/**
 * Fetch tools from the API
 */
async function fetchTools() {
    console.log('Fetching tools...');

    try {
        const response = await fetch('/api/tools');

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Tools received:', data);

        toolsList = data.tools || [];
        renderTools();

    } catch (error) {
        console.error('Failed to fetch tools:', error);
        showError(`Failed to load tools: ${error.message}`);
    }
}

/**
 * Render tools in the tools tab
 */
function renderTools() {
    const toolsContainer = document.getElementById('tools-tab');
    if (!toolsContainer) return;

    if (toolsList.length === 0) {
        toolsContainer.innerHTML = '<div class="placeholder">No tools available</div>';
        return;
    }

    let html = '<div class="tools-header"><h2>Tools</h2></div><div class="tools-list">';

    toolsList.forEach((tool, index) => {
        html += `
            <div class="tool-card" id="tool-${index}">
                <div class="tool-header">
                    <h3>${escapeHtml(tool.name)}</h3>
                </div>
                ${tool.description ? `<p class="tool-description">${escapeHtml(tool.description)}</p>` : ''}
                <div class="tool-params">
                    ${renderToolParams(tool.inputSchema, index)}
                </div>
                <button class="button-primary" onclick="executeTool(${index})">Execute</button>
                <div id="tool-result-${index}" class="tool-result hidden"></div>
            </div>
        `;
    });

    html += '</div>';
    toolsContainer.innerHTML = html;
}

/**
 * Render input form for tool parameters
 */
function renderToolParams(schema, toolIndex) {
    if (!schema || !schema.properties || Object.keys(schema.properties).length === 0) {
        return '<p class="no-params">No parameters</p>';
    }

    let html = '<div class="param-form">';
    const required = schema.required || [];

    for (const [paramName, paramDef] of Object.entries(schema.properties)) {
        const isRequired = required.includes(paramName);
        const paramId = `param-${toolIndex}-${paramName}`;

        html += `
            <div class="param-field">
                <label for="${paramId}">
                    ${escapeHtml(paramName)}
                    ${isRequired ? '<span class="required">*</span>' : '<span class="optional">(optional)</span>'}
                </label>
                ${paramDef.description ? `<p class="param-description">${escapeHtml(paramDef.description)}</p>` : ''}
                ${renderParamInput(paramDef, paramId, paramName, toolIndex)}
            </div>
        `;
    }

    html += '</div>';
    return html;
}

/**
 * Render appropriate input field based on parameter type
 */
function renderParamInput(paramDef, paramId, paramName, toolIndex) {
    const type = paramDef.type || 'string';

    // Handle enum types (dropdown)
    if (paramDef.enum && Array.isArray(paramDef.enum)) {
        let html = `<select id="${paramId}" class="param-input">`;
        html += '<option value="">-- Select --</option>';
        paramDef.enum.forEach(value => {
            html += `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`;
        });
        html += '</select>';
        return html;
    }

    // Handle different types
    switch (type) {
        case 'number':
        case 'integer':
            return `<input type="number" id="${paramId}" class="param-input"
                ${paramDef.minimum !== undefined ? `min="${paramDef.minimum}"` : ''}
                ${paramDef.maximum !== undefined ? `max="${paramDef.maximum}"` : ''}
            />`;

        case 'boolean':
            return `
                <select id="${paramId}" class="param-input">
                    <option value="">-- Select --</option>
                    <option value="true">true</option>
                    <option value="false">false</option>
                </select>
            `;

        case 'string':
        default:
            if (paramDef.maxLength && paramDef.maxLength > 100) {
                return `<textarea id="${paramId}" class="param-input" rows="3"
                    ${paramDef.maxLength ? `maxlength="${paramDef.maxLength}"` : ''}
                ></textarea>`;
            } else {
                return `<input type="text" id="${paramId}" class="param-input"
                    ${paramDef.minLength ? `minlength="${paramDef.minLength}"` : ''}
                    ${paramDef.maxLength ? `maxlength="${paramDef.maxLength}"` : ''}
                    ${paramDef.pattern ? `pattern="${escapeHtml(paramDef.pattern)}"` : ''}
                />`;
            }
    }
}

/**
 * Execute a tool
 */
async function executeTool(toolIndex) {
    const tool = toolsList[toolIndex];
    if (!tool) {
        console.error('Tool not found:', toolIndex);
        return;
    }

    console.log('Executing tool:', tool.name);

    // Get result container
    const resultContainer = document.getElementById(`tool-result-${toolIndex}`);
    if (!resultContainer) return;

    // Collect parameters from form
    const params = {};
    const schema = tool.inputSchema;

    if (schema && schema.properties) {
        for (const paramName of Object.keys(schema.properties)) {
            const paramId = `param-${toolIndex}-${paramName}`;
            const input = document.getElementById(paramId);

            if (input && input.value !== '') {
                const paramDef = schema.properties[paramName];
                let value = input.value;

                // Convert to appropriate type
                if (paramDef.type === 'number' || paramDef.type === 'integer') {
                    value = paramDef.type === 'integer' ? parseInt(value, 10) : parseFloat(value);
                } else if (paramDef.type === 'boolean') {
                    value = value === 'true';
                }

                params[paramName] = value;
            }
        }
    }

    // Show loading state
    resultContainer.innerHTML = '<div class="loading-spinner">Executing...</div>';
    resultContainer.classList.remove('hidden');

    try {
        const response = await fetch(`/api/tools/${encodeURIComponent(tool.name)}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ params }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Tool execution result:', data);

        if (data.success) {
            resultContainer.innerHTML = `
                <div class="result-success">
                    <h4>Result:</h4>
                    <pre>${JSON.stringify(data.result, null, 2)}</pre>
                </div>
            `;
        } else {
            resultContainer.innerHTML = `
                <div class="result-error">
                    <h4>Error:</h4>
                    <p>${escapeHtml(data.error || 'Unknown error')}</p>
                </div>
            `;
        }

    } catch (error) {
        console.error('Failed to execute tool:', error);
        resultContainer.innerHTML = `
            <div class="result-error">
                <h4>Error:</h4>
                <p>${escapeHtml(error.message)}</p>
            </div>
        `;
    }
}

/**
 * Fetch resources from the API
 */
async function fetchResources() {
    console.log('Fetching resources...');

    try {
        const response = await fetch('/api/resources');

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Resources received:', data);

        resourcesList = data.resources || [];
        renderResources();

    } catch (error) {
        console.error('Failed to fetch resources:', error);
        showError(`Failed to load resources: ${error.message}`);
    }
}

/**
 * Render resources in the resources tab
 */
function renderResources() {
    const resourcesContainer = document.getElementById('resources-tab');
    if (!resourcesContainer) return;

    if (resourcesList.length === 0) {
        resourcesContainer.innerHTML = '<div class="placeholder">No resources available</div>';
        return;
    }

    let html = '<div class="resources-header"><h2>Resources</h2></div><div class="resources-list">';

    resourcesList.forEach((resource, index) => {
        const isUIResource = resource.uri && resource.uri.startsWith('ui://');
        html += `
            <div class="resource-card" id="resource-${index}">
                <div class="resource-header">
                    <h3>${escapeHtml(resource.uri)}</h3>
                    ${isUIResource ? '<span class="badge ui-badge">UI</span>' : ''}
                </div>
                ${resource.name ? `<p class="resource-name">${escapeHtml(resource.name)}</p>` : ''}
                ${resource.description ? `<p class="resource-description">${escapeHtml(resource.description)}</p>` : ''}
                ${resource.mimeType ? `<p class="resource-mime"><strong>MIME Type:</strong> ${escapeHtml(resource.mimeType)}</p>` : ''}
                <button class="button-primary" onclick="viewResource(${index})">View Resource</button>
                <div id="resource-content-${index}" class="resource-content hidden"></div>
            </div>
        `;
    });

    html += '</div>';
    resourcesContainer.innerHTML = html;
}

/**
 * View a resource
 */
async function viewResource(resourceIndex) {
    const resource = resourcesList[resourceIndex];
    if (!resource) {
        console.error('Resource not found:', resourceIndex);
        return;
    }

    console.log('Viewing resource:', resource.uri);

    // Get content container
    const contentContainer = document.getElementById(`resource-content-${resourceIndex}`);
    if (!contentContainer) return;

    // Show loading state
    contentContainer.innerHTML = '<div class="loading-spinner">Loading...</div>';
    contentContainer.classList.remove('hidden');

    try {
        const response = await fetch(`/api/resources/${encodeURIComponent(resource.uri)}`);

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Resource content:', data);

        if (data.success && data.contents && data.contents.length > 0) {
            const content = data.contents[0];
            const mimeType = content.mimeType || resource.mimeType || 'text/plain';

            // Render based on MIME type
            if (mimeType.includes('json')) {
                const jsonData = content.text ? JSON.parse(content.text) : content;
                contentContainer.innerHTML = `
                    <div class="resource-viewer">
                        <h4>Resource Content (JSON):</h4>
                        <pre>${JSON.stringify(jsonData, null, 2)}</pre>
                    </div>
                `;
            } else if (mimeType.includes('html')) {
                contentContainer.innerHTML = `
                    <div class="resource-viewer">
                        <h4>Resource Content (HTML):</h4>
                        <iframe
                            srcdoc="${escapeHtml(content.text || '')}"
                            sandbox="allow-scripts allow-same-origin"
                            style="width: 100%; min-height: 400px; border: 1px solid var(--border-color); border-radius: 4px;"
                        ></iframe>
                    </div>
                `;
            } else {
                contentContainer.innerHTML = `
                    <div class="resource-viewer">
                        <h4>Resource Content:</h4>
                        <pre>${escapeHtml(content.text || '')}</pre>
                    </div>
                `;
            }
        } else {
            contentContainer.innerHTML = `
                <div class="result-error">
                    <h4>Error:</h4>
                    <p>${escapeHtml(data.error || 'No content available')}</p>
                </div>
            `;
        }

    } catch (error) {
        console.error('Failed to view resource:', error);
        contentContainer.innerHTML = `
            <div class="result-error">
                <h4>Error:</h4>
                <p>${escapeHtml(error.message)}</p>
            </div>
        `;
    }
}

// ============================================================================
// Prompts Functions
// ============================================================================

/**
 * Fetch all prompts from the MCP server
 */
async function fetchPrompts() {
    console.log('Fetching prompts...');

    try {
        const response = await fetch('/api/prompts');

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Prompts received:', data);

        promptsList = data.prompts || [];
        renderPrompts();

    } catch (error) {
        console.error('Failed to fetch prompts:', error);
        showError(`Failed to load prompts: ${error.message}`);
    }
}

/**
 * Render prompts in the prompts tab
 */
function renderPrompts() {
    const promptsContainer = document.getElementById('prompts-tab');
    if (!promptsContainer) return;

    if (promptsList.length === 0) {
        promptsContainer.innerHTML = '<div class="placeholder"><h2>No Prompts Available</h2><p>This server has no prompts defined.</p></div>';
        return;
    }

    let html = '<div class="prompts-header"><h2>Prompts</h2></div><div class="prompts-list">';

    promptsList.forEach((prompt, index) => {
        html += `
            <div class="tool-card prompt-card" id="prompt-${index}">
                <div class="tool-header">
                    <h3>${escapeHtml(prompt.name)}</h3>
                </div>
                ${prompt.description ? `<p class="tool-description">${escapeHtml(prompt.description)}</p>` : ''}

                <div class="tool-params">
                    ${renderPromptArgs(prompt.arguments || [], index)}
                </div>

                <button class="button-primary" onclick="executePrompt(${index})">Get Prompt</button>
                <div id="prompt-result-${index}" class="tool-result hidden"></div>
            </div>
        `;
    });

    html += '</div>';
    promptsContainer.innerHTML = html;
}

/**
 * Render prompt arguments as form inputs
 */
function renderPromptArgs(args, promptIndex) {
    if (!args || args.length === 0) {
        return '<p class="no-params">No arguments</p>';
    }

    let html = '<div class="param-form">';

    args.forEach((arg, argIndex) => {
        const isRequired = arg.required || false;
        const inputId = `prompt-${promptIndex}-arg-${argIndex}`;

        html += `
            <div class="param-field">
                <label for="${inputId}">
                    ${escapeHtml(arg.name)}
                    ${isRequired ? '<span class="required">*</span>' : '<span class="optional">(optional)</span>'}
                </label>
                ${arg.description ? `<p class="param-description">${escapeHtml(arg.description)}</p>` : ''}
                <input
                    type="text"
                    id="${inputId}"
                    class="param-input"
                    data-arg-name="${escapeHtml(arg.name)}"
                    ${isRequired ? 'required' : ''}
                />
            </div>
        `;
    });

    html += '</div>';
    return html;
}

/**
 * Execute a prompt with provided arguments
 */
async function executePrompt(promptIndex) {
    const prompt = promptsList[promptIndex];
    if (!prompt) {
        console.error('Prompt not found:', promptIndex);
        return;
    }

    console.log('Executing prompt:', prompt.name);

    // Get result container
    const resultContainer = document.getElementById(`prompt-result-${promptIndex}`);
    if (!resultContainer) return;

    // Collect argument values
    const args = {};
    const argInputs = document.querySelectorAll(`#prompt-${promptIndex} .param-input`);

    argInputs.forEach(input => {
        const argName = input.getAttribute('data-arg-name');
        const value = input.value.trim();
        if (value) {
            args[argName] = value;
        }
    });

    // Show loading state
    resultContainer.innerHTML = '<div class="loading-spinner">Executing prompt...</div>';
    resultContainer.classList.remove('hidden');

    try {
        const response = await fetch(`/api/prompts/${encodeURIComponent(prompt.name)}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ args }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.error || `HTTP error! Status: ${response.status}`);
        }

        // Display result
        const messages = data.messages || [];
        let messagesHtml = '';

        messages.forEach((msg, idx) => {
            const role = msg.role || 'unknown';

            // Handle different content formats
            let content = '';
            if (typeof msg.content === 'string') {
                content = msg.content;
            } else if (msg.content && msg.content.type === 'text' && msg.content.text) {
                content = msg.content.text;
            } else if (msg.content) {
                content = JSON.stringify(msg.content, null, 2);
            } else {
                content = 'No content';
            }

            messagesHtml += `
                <div class="prompt-message">
                    <strong>Message ${idx + 1} (${role}):</strong>
                    <pre>${escapeHtml(content)}</pre>
                </div>
            `;
        });

        resultContainer.innerHTML = `
            <div class="result-success">
                <h4>Result:</h4>
                ${messagesHtml || '<p>No messages returned</p>'}
            </div>
        `;

    } catch (error) {
        console.error('Failed to execute prompt:', error);
        resultContainer.innerHTML = `
            <div class="result-error">
                <h4>Error:</h4>
                <p>${escapeHtml(error.message)}</p>
            </div>
        `;
    }
}

// ============================================================================
// UI Update Functions
// ============================================================================

/**
 * Update the server information display
 * @param {Object} info - Server information object
 * @param {string} info.name - Server name
 * @param {string} info.status - Server status (running/stopped/error)
 * @param {number|string} info.port - MCP port number
 */
function updateServerInfo(info) {
    // Update server name
    if (elements.serverName && info.name) {
        elements.serverName.textContent = info.name;
    }

    // Update server status
    if (elements.serverStatus && elements.statusText && info.status) {
        const status = info.status.toLowerCase();
        elements.statusText.textContent = capitalizeFirst(status);

        // Remove existing status classes
        elements.serverStatus.classList.remove('running', 'stopped', 'error');

        // Add appropriate status class
        if (status === 'running') {
            elements.serverStatus.classList.add('running');
        } else if (status === 'stopped') {
            elements.serverStatus.classList.add('stopped');
        }
    }

    // Update MCP port
    if (elements.mcpPort && info.port) {
        elements.mcpPort.textContent = info.port;
    }
}

/**
 * Switch to a different tab
 * @param {string} tabName - Name of the tab to switch to
 */
function switchTab(tabName) {
    if (!tabName) {
        console.warn('No tab name provided');
        return;
    }

    console.log(`Switching to tab: ${tabName}`);
    currentTab = tabName;

    // Update tab buttons - remove active class from all, add to clicked
    elements.tabButtons.forEach(button => {
        const buttonTab = button.getAttribute('data-tab');
        if (buttonTab === tabName) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });

    // Update tab content - hide all, show selected
    elements.tabContents.forEach(content => {
        const contentId = content.id;
        const contentTab = contentId.replace('-tab', '');

        if (contentTab === tabName) {
            content.classList.add('active');
        } else {
            content.classList.remove('active');
        }
    });

    // Lazy load data for certain tabs
    if (tabName === 'metrics') {
        fetchMetrics();
    } else if (tabName === 'config') {
        fetchConfig();
    } else if (tabName === 'prompts') {
        fetchPrompts();
    }
}

// ============================================================================
// Loading Indicator Functions
// ============================================================================

/**
 * Show the loading indicator
 */
function showLoading() {
    if (elements.loadingIndicator) {
        elements.loadingIndicator.classList.remove('hidden');
    }
}

/**
 * Hide the loading indicator
 */
function hideLoading() {
    if (elements.loadingIndicator) {
        elements.loadingIndicator.classList.add('hidden');
    }
}

// ============================================================================
// Error Message Functions
// ============================================================================

/**
 * Show an error message
 * @param {string} message - Error message to display
 */
function showError(message) {
    if (elements.errorBanner && elements.errorText) {
        elements.errorText.textContent = message;
        elements.errorBanner.classList.remove('hidden');
    }
}

/**
 * Hide the error message
 */
function hideError() {
    if (elements.errorBanner) {
        elements.errorBanner.classList.add('hidden');
    }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Setup UI Preview tab
 */
function setupUIPreview() {
    const uiPreviewContainer = document.getElementById('ui-preview-tab');
    if (!uiPreviewContainer) return;

    // Wait for resources to be loaded, then render UI resources
    const checkResources = setInterval(() => {
        if (resourcesList.length > 0) {
            clearInterval(checkResources);
            renderUIPreview();
        }
    }, 100);

    // Timeout after 5 seconds
    setTimeout(() => clearInterval(checkResources), 5000);
}

/**
 * Render UI Preview tab
 */
function renderUIPreview() {
    const uiPreviewContainer = document.getElementById('ui-preview-tab');
    if (!uiPreviewContainer) return;

    // Filter for UI resources
    const uiResources = resourcesList.filter(r => r.uri && r.uri.startsWith('ui://'));

    if (uiResources.length === 0) {
        uiPreviewContainer.innerHTML = '<div class="placeholder">No UI resources available</div>';
        return;
    }

    // Render UI resource selector and iframe
    let html = '<div class="ui-preview-header"><h2>UI Preview</h2></div>';

    if (uiResources.length > 1) {
        html += '<div class="ui-selector"><label>Select UI Resource:</label><select id="ui-resource-selector" onchange="loadUIResource(this.value)">';
        uiResources.forEach((resource, index) => {
            html += `<option value="${index}">${escapeHtml(resource.name || resource.uri)}</option>`;
        });
        html += '</select></div>';
    }

    // Get MCP port from server info
    const mcpPort = serverInfo?.mcpPort || 3100;
    const firstResource = uiResources[0];
    const resourcePath = firstResource.uri.replace('ui://', '');

    html += `
        <div class="ui-preview-container">
            <div class="ui-preview-info">
                <strong>Resource:</strong> ${escapeHtml(firstResource.uri)}<br>
                <strong>Name:</strong> ${escapeHtml(firstResource.name || 'N/A')}<br>
                <strong>Description:</strong> ${escapeHtml(firstResource.description || 'N/A')}
            </div>
            <iframe
                id="ui-preview-iframe"
                src="http://localhost:${mcpPort}/ui/${resourcePath}"
                sandbox="allow-scripts allow-same-origin"
                style="width: 100%; height: 600px; border: 1px solid var(--border-color); border-radius: 8px; background: white;"
            ></iframe>
        </div>
    `;

    uiPreviewContainer.innerHTML = html;
}

/**
 * Load a different UI resource
 */
function loadUIResource(index) {
    const uiResources = resourcesList.filter(r => r.uri && r.uri.startsWith('ui://'));
    const resource = uiResources[parseInt(index, 10)];
    if (!resource) return;

    const iframe = document.getElementById('ui-preview-iframe');
    const mcpPort = serverInfo?.mcpPort || 3100;
    const resourcePath = resource.uri.replace('ui://', '');

    if (iframe) {
        iframe.src = `http://localhost:${mcpPort}/ui/${resourcePath}`;
    }

    // Update info
    const infoDiv = document.querySelector('.ui-preview-info');
    if (infoDiv) {
        infoDiv.innerHTML = `
            <strong>Resource:</strong> ${escapeHtml(resource.uri)}<br>
            <strong>Name:</strong> ${escapeHtml(resource.name || 'N/A')}<br>
            <strong>Description:</strong> ${escapeHtml(resource.description || 'N/A')}
        `;
    }
}

/**
 * Fetch and render Metrics tab
 */
async function fetchMetrics() {
    console.log('Fetching metrics...');
    const metricsContainer = document.getElementById('metrics-tab');
    if (!metricsContainer) return;

    try {
        const response = await fetch('/api/metrics');
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Metrics received:', data);

        let html = '<div class="metrics-header"><h2>Server Metrics</h2></div>';
        html += '<div class="metrics-grid">';

        html += `
            <div class="metric-card">
                <h3>Tools</h3>
                <div class="metric-value">${data.tools || 0}</div>
            </div>
            <div class="metric-card">
                <h3>Resources</h3>
                <div class="metric-value">${data.resources || 0}</div>
            </div>
            <div class="metric-card">
                <h3>Prompts</h3>
                <div class="metric-value">${data.prompts || 0}</div>
            </div>
            <div class="metric-card">
                <h3>Routers</h3>
                <div class="metric-value">${data.routers || 0}</div>
            </div>
        `;

        html += '</div>';
        metricsContainer.innerHTML = html;

    } catch (error) {
        console.error('Failed to fetch metrics:', error);
        metricsContainer.innerHTML = `<div class="placeholder">Failed to load metrics: ${escapeHtml(error.message)}</div>`;
    }
}

/**
 * Fetch and render Config tab
 */
async function fetchConfig() {
    console.log('Fetching config...');
    const configContainer = document.getElementById('config-tab');
    if (!configContainer) return;

    try {
        const response = await fetch('/api/config');
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Config received:', data);

        let html = '<div class="config-header"><h2>Server Configuration</h2></div>';
        html += '<div class="config-list">';

        html += `
            <div class="config-item">
                <label>Server Name:</label>
                <span>${escapeHtml(data.serverName || 'N/A')}</span>
            </div>
            <div class="config-item">
                <label>Server Version:</label>
                <span>${escapeHtml(data.serverVersion || 'N/A')}</span>
            </div>
            <div class="config-item">
                <label>Server File:</label>
                <span class="code">${escapeHtml(data.serverFile || 'N/A')}</span>
            </div>
            <div class="config-item">
                <label>UI Port:</label>
                <span>${data.uiPort || 'N/A'}</span>
            </div>
            <div class="config-item">
                <label>MCP Port:</label>
                <span>${data.mcpPort || 'N/A'}</span>
            </div>
            <div class="config-item">
                <label>Mock Context:</label>
                <span>${data.mockContext ? 'Enabled' : 'Disabled'}</span>
            </div>
            <div class="config-item">
                <label>Verbose Logging:</label>
                <span>${data.verbose ? 'Enabled' : 'Disabled'}</span>
            </div>
        `;

        html += '</div>';
        configContainer.innerHTML = html;

    } catch (error) {
        console.error('Failed to fetch config:', error);
        configContainer.innerHTML = `<div class="placeholder">Failed to load config: ${escapeHtml(error.message)}</div>`;
    }
}

/**
 * Capitalize the first letter of a string
 * @param {string} str - String to capitalize
 * @returns {string} Capitalized string
 */
function capitalizeFirst(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Escape HTML special characters to prevent XSS
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeHtml(str) {
    if (typeof str !== 'string') return str;
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ============================================================================
// Export for testing (if needed)
// ============================================================================

// Make functions available globally for testing purposes
if (typeof window !== 'undefined') {
    window.testHarness = {
        switchTab,
        showLoading,
        hideLoading,
        showError,
        hideError,
        updateServerInfo,
        fetchServerInfo,
    };
}
