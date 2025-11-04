# useUIActions Hook - Test Plan

## Test Coverage

### 1. Message Validation Tests

#### Test 1.1: Valid CALL_TOOL Message
```typescript
const validMessage = {
  type: 'MCP_UI_ACTION',
  action: {
    type: 'CALL_TOOL',
    toolName: 'echo',
    args: { message: 'test' },
    callbackId: 'test_123'
  }
};

// Expected: Should process successfully
// Expected: Should call mcpClient.executeTool('echo', { message: 'test' })
// Expected: Should return { success: true, data: <tool result> }
```

#### Test 1.2: Invalid Message Format
```typescript
const invalidMessage = {
  type: 'INVALID_TYPE',
  action: {}
};

// Expected: Should return { success: false, error: 'Invalid UI action message format' }
// Expected: Should set lastError state
```

#### Test 1.3: Missing Action Field
```typescript
const missingAction = {
  type: 'MCP_UI_ACTION'
};

// Expected: Should return { success: false, error: 'Invalid UI action message format' }
```

### 2. CALL_TOOL Action Tests

#### Test 2.1: Successful Tool Execution
```typescript
// Mock: mcpClient.isConnected() returns true
// Mock: mcpClient.executeTool() returns { content: 'tool result' }

const message = {
  type: 'MCP_UI_ACTION',
  action: {
    type: 'CALL_TOOL',
    toolName: 'test_tool',
    args: { param: 'value' }
  }
};

// Expected: Should return { success: true, data: 'tool result' }
// Expected: isProcessing should be false after completion
```

#### Test 2.2: Tool Execution - Not Connected
```typescript
// Mock: mcpClient.isConnected() returns false

const message = {
  type: 'MCP_UI_ACTION',
  action: {
    type: 'CALL_TOOL',
    toolName: 'test_tool',
    args: {}
  }
};

// Expected: Should return { success: false, error: 'Not connected to MCP server' }
// Expected: Should set lastError
```

#### Test 2.3: Tool Execution Error
```typescript
// Mock: mcpClient.isConnected() returns true
// Mock: mcpClient.executeTool() throws Error('Tool not found')

const message = {
  type: 'MCP_UI_ACTION',
  action: {
    type: 'CALL_TOOL',
    toolName: 'nonexistent',
    args: {}
  }
};

// Expected: Should return { success: false, error: 'Tool not found' }
// Expected: Should set lastError to 'Tool not found'
```

### 3. SUBMIT_PROMPT Action Tests

#### Test 3.1: Prompt Submission
```typescript
const message = {
  type: 'MCP_UI_ACTION',
  action: {
    type: 'SUBMIT_PROMPT',
    prompt: 'What is the weather?',
    context: { source: 'test' }
  }
};

// Expected: Should return { success: true, data: { message: 'Prompt received', ... } }
// Expected: Should log the prompt
```

#### Test 3.2: Prompt Without Context
```typescript
const message = {
  type: 'MCP_UI_ACTION',
  action: {
    type: 'SUBMIT_PROMPT',
    prompt: 'Simple prompt'
  }
};

// Expected: Should return { success: true }
// Expected: Should handle missing context gracefully
```

### 4. NOTIFY Action Tests

#### Test 4.1: Info Notification
```typescript
const message = {
  type: 'MCP_UI_ACTION',
  action: {
    type: 'NOTIFY',
    level: 'info',
    message: 'Test notification',
    title: 'Test'
  }
};

// Expected: Should return { success: true, data: { level: 'info', ... } }
// Expected: Should log notification
```

#### Test 4.2: Error Notification
```typescript
const message = {
  type: 'MCP_UI_ACTION',
  action: {
    type: 'NOTIFY',
    level: 'error',
    message: 'Error occurred'
  }
};

// Expected: Should return { success: true }
// Expected: Should handle missing title
```

### 5. NAVIGATE Action Tests

#### Test 5.1: Navigate to New Tab
```typescript
// Mock: window.open

const message = {
  type: 'MCP_UI_ACTION',
  action: {
    type: 'NAVIGATE',
    url: 'https://example.com',
    target: '_blank'
  }
};

// Expected: Should call window.open('https://example.com', '_blank')
// Expected: Should return { success: true, data: { url: '...', target: '_blank' } }
```

#### Test 5.2: Navigate to Current Window
```typescript
// Mock: window.location.href setter

const message = {
  type: 'MCP_UI_ACTION',
  action: {
    type: 'NAVIGATE',
    url: 'https://example.com',
    target: '_self'
  }
};

// Expected: Should set window.location.href
// Expected: Should return { success: true }
```

#### Test 5.3: Navigation Error
```typescript
// Mock: window.open throws error

const message = {
  type: 'MCP_UI_ACTION',
  action: {
    type: 'NAVIGATE',
    url: 'invalid://url',
    target: '_blank'
  }
};

// Expected: Should return { success: false, error: 'Navigation failed: ...' }
```

### 6. State Management Tests

#### Test 6.1: isProcessing State
```typescript
// Before action: isProcessing should be false
// During action: isProcessing should be true
// After action: isProcessing should be false
```

#### Test 6.2: lastError State
```typescript
// Initially: lastError should be null
// On error: lastError should contain error message
// On success: lastError should be reset to null
```

#### Test 6.3: Multiple Sequential Actions
```typescript
// Execute action 1 (success)
// Execute action 2 (error)
// Verify lastError is from action 2
// Execute action 3 (success)
// Verify lastError is null
```

### 7. Unknown Action Type Test

#### Test 7.1: Unknown Action Type
```typescript
const message = {
  type: 'MCP_UI_ACTION',
  action: {
    type: 'UNKNOWN_ACTION',
    data: {}
  }
};

// Expected: Should return { success: false, error: 'Unknown action type: UNKNOWN_ACTION' }
```

## Manual Testing Checklist

### Integration Testing with Iframe

1. **Setup**: Create test HTML page with MCP UI script
2. **Test Tool Call**:
   - Click button in iframe
   - Verify postMessage sent
   - Verify tool executed
   - Verify result received
3. **Test Error Handling**:
   - Call nonexistent tool
   - Verify error returned to iframe
   - Verify error displayed in UI
4. **Test Notification**:
   - Send notification action
   - Verify logged to console
   - (Future) Verify toast appears
5. **Test Navigation**:
   - Request navigation
   - Verify new tab opened
   - Verify URL correct

### Performance Testing

1. **Rapid Actions**: Send multiple actions quickly
2. **Large Payloads**: Send tool call with large args object
3. **Memory Leaks**: Create/destroy component multiple times
4. **Event Listener Cleanup**: Verify listeners removed on unmount

### Security Testing

1. **Origin Validation**: Test messages from different origins
2. **Malformed Data**: Send malformed JSON
3. **XSS Attempts**: Send malicious scripts in args
4. **Tool Name Validation**: Try to call system tools

## Test Implementation Example

```typescript
import { renderHook, act } from '@testing-library/react';
import { useUIActions } from './useUIActions';
import { mcpClient } from '@/lib/mcp';

// Mock MCP client
jest.mock('@/lib/mcp', () => ({
  mcpClient: {
    isConnected: jest.fn(),
    executeTool: jest.fn(),
  }
}));

describe('useUIActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should handle valid CALL_TOOL action', async () => {
    // Arrange
    (mcpClient.isConnected as jest.Mock).mockReturnValue(true);
    (mcpClient.executeTool as jest.Mock).mockResolvedValue({
      content: 'tool result'
    });

    const { result } = renderHook(() => useUIActions());

    const message = {
      type: 'MCP_UI_ACTION' as const,
      action: {
        type: 'CALL_TOOL' as const,
        toolName: 'echo',
        args: { message: 'test' }
      }
    };

    // Act
    let actionResult;
    await act(async () => {
      actionResult = await result.current.handleUIAction(message);
    });

    // Assert
    expect(actionResult).toEqual({
      success: true,
      data: 'tool result'
    });
    expect(mcpClient.executeTool).toHaveBeenCalledWith('echo', { message: 'test' });
    expect(result.current.isProcessing).toBe(false);
    expect(result.current.lastError).toBe(null);
  });

  test('should handle tool execution error', async () => {
    // Arrange
    (mcpClient.isConnected as jest.Mock).mockReturnValue(true);
    (mcpClient.executeTool as jest.Mock).mockRejectedValue(
      new Error('Tool not found')
    );

    const { result } = renderHook(() => useUIActions());

    const message = {
      type: 'MCP_UI_ACTION' as const,
      action: {
        type: 'CALL_TOOL' as const,
        toolName: 'nonexistent',
        args: {}
      }
    };

    // Act
    let actionResult;
    await act(async () => {
      actionResult = await result.current.handleUIAction(message);
    });

    // Assert
    expect(actionResult).toEqual({
      success: false,
      error: 'Tool not found'
    });
    expect(result.current.lastError).toBe('Tool not found');
  });

  test('should reject invalid message format', async () => {
    // Arrange
    const { result } = renderHook(() => useUIActions());

    const invalidMessage = {
      type: 'INVALID' as any,
      action: {}
    };

    // Act
    let actionResult;
    await act(async () => {
      actionResult = await result.current.handleUIAction(invalidMessage);
    });

    // Assert
    expect(actionResult).toEqual({
      success: false,
      error: 'Invalid UI action message format'
    });
  });
});
```

## Coverage Goals

- **Line Coverage**: > 90%
- **Branch Coverage**: > 85%
- **Function Coverage**: 100%
- **Action Type Coverage**: 100% (all 4 action types tested)

## CI/CD Integration

```bash
# Run tests
npm test -- useUIActions.test

# Run with coverage
npm test -- --coverage useUIActions.test

# Run in watch mode during development
npm test -- --watch useUIActions.test
```

## Test Status

- [ ] Unit tests implemented
- [ ] Integration tests implemented
- [ ] E2E tests implemented
- [ ] Performance tests conducted
- [ ] Security tests conducted
- [ ] All tests passing
- [ ] Coverage goals met
