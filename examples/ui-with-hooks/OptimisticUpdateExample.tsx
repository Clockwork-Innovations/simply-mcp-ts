/**
 * Optimistic Update Example - React Query-Style Pattern
 *
 * Demonstrates best practices for optimistic updates with context passing:
 * - onMutate returns context with snapshot of previous state
 * - onError receives context for rollback
 * - No memory leaks (mounted ref prevents updates after unmount)
 * - Type-safe context passing
 */

import React, { useState } from 'react';
import { useMCPTool } from '../../src/client/hooks/index.js';

// ============================================================================
// Mock UI Components
// ============================================================================

const Button = ({ children, onClick, disabled, variant = 'default' }: any) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      padding: '0.5rem 1rem',
      background: variant === 'outline' ? 'transparent' : '#0066cc',
      color: variant === 'outline' ? '#0066cc' : 'white',
      border: variant === 'outline' ? '1px solid #0066cc' : 'none',
      borderRadius: '6px',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      fontWeight: 500,
      marginRight: '0.5rem',
    }}
  >
    {children}
  </button>
);

const Card = ({ children, optimistic }: any) => (
  <div
    style={{
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      padding: '1rem',
      marginBottom: '0.5rem',
      opacity: optimistic ? 0.6 : 1,
      transition: 'opacity 0.2s',
    }}
  >
    {children}
  </div>
);

// ============================================================================
// Types
// ============================================================================

interface Todo {
  id: string;
  text: string;
  completed: boolean;
}

interface TodoContext {
  previousTodos: Todo[];
  tempId?: string;
}

// ============================================================================
// Optimistic Update Example
// ============================================================================

export default function OptimisticUpdateExample() {
  const [todos, setTodos] = useState<Todo[]>([
    { id: '1', text: 'Learn MCP UI', completed: true },
    { id: '2', text: 'Build awesome UIs', completed: false },
  ]);
  const [newTodoText, setNewTodoText] = useState('');

  // ✅ BEST PRACTICE: Context passing for automatic rollback
  const addTodo = useMCPTool<Todo, TodoContext>('add_todo', {
    onMutate: (params) => {
      // 1. Snapshot current state
      const previousTodos = [...todos];

      // 2. Create temp todo with optimistic ID
      const tempId = `temp-${Date.now()}`;
      const optimisticTodo: Todo = {
        id: tempId,
        text: params.text,
        completed: false,
      };

      // 3. Optimistically update UI
      setTodos([...todos, optimisticTodo]);

      // 4. Return context for potential rollback
      return { previousTodos, tempId };
    },
    onSuccess: (serverTodo, result) => {
      // Replace temp todo with server-confirmed todo
      setTodos((prev) =>
        prev.map((todo) =>
          todo.id.startsWith('temp-') ? serverTodo : todo
        )
      );
      setNewTodoText('');
      window.notify('success', 'Todo added!');
    },
    onError: (error, params, context) => {
      // ✅ Automatic rollback using context
      if (context?.previousTodos) {
        setTodos(context.previousTodos);
      }
      window.notify('error', `Failed to add todo: ${error.message}`);
    },
  });

  const deleteTodo = useMCPTool<void, TodoContext>('delete_todo', {
    onMutate: (params) => {
      // Snapshot and optimistically remove
      const previousTodos = [...todos];
      setTodos((prev) => prev.filter((t) => t.id !== params.todoId));

      return { previousTodos };
    },
    onSuccess: () => {
      window.notify('success', 'Todo deleted!');
    },
    onError: (error, params, context) => {
      // Rollback on error
      if (context?.previousTodos) {
        setTodos(context.previousTodos);
      }
      window.notify('error', `Failed to delete: ${error.message}`);
    },
  });

  const toggleTodo = useMCPTool<Todo, TodoContext>('toggle_todo', {
    onMutate: (params) => {
      // Snapshot and optimistically toggle
      const previousTodos = [...todos];
      setTodos((prev) =>
        prev.map((t) =>
          t.id === params.todoId ? { ...t, completed: !t.completed } : t
        )
      );

      return { previousTodos };
    },
    onSuccess: (updatedTodo) => {
      // Replace with server-confirmed state
      setTodos((prev) =>
        prev.map((t) => (t.id === updatedTodo.id ? updatedTodo : t))
      );
    },
    onError: (error, params, context) => {
      // Rollback on error
      if (context?.previousTodos) {
        setTodos(context.previousTodos);
      }
      window.notify('error', `Failed to toggle: ${error.message}`);
    },
  });

  const handleAddTodo = () => {
    if (!newTodoText.trim()) return;
    addTodo.execute({ text: newTodoText });
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '2rem', fontFamily: 'system-ui' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem' }}>
        Optimistic Updates Example
      </h1>
      <p style={{ color: '#666', marginBottom: '2rem' }}>
        Demonstrates React Query-style optimistic updates with context passing for automatic rollback.
      </p>

      {/* Add Todo Form */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="text"
            value={newTodoText}
            onChange={(e) => setNewTodoText(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddTodo()}
            placeholder="Enter new todo..."
            style={{
              flex: 1,
              padding: '0.5rem',
              border: '1px solid #ddd',
              borderRadius: '6px',
            }}
          />
          <Button onClick={handleAddTodo} disabled={addTodo.loading || !newTodoText.trim()}>
            {addTodo.loading ? 'Adding...' : 'Add Todo'}
          </Button>
        </div>
      </div>

      {/* Todo List */}
      <div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>
          Your Todos ({todos.length})
        </h2>

        {todos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>
            No todos yet. Add one above!
          </div>
        ) : (
          todos.map((todo) => (
            <Card key={todo.id} optimistic={todo.id.startsWith('temp-')}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                  <input
                    type="checkbox"
                    checked={todo.completed}
                    onChange={() => toggleTodo.execute({ todoId: todo.id })}
                    disabled={toggleTodo.loading}
                    style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                  />
                  <span
                    style={{
                      textDecoration: todo.completed ? 'line-through' : 'none',
                      color: todo.completed ? '#999' : '#000',
                      flex: 1,
                    }}
                  >
                    {todo.text}
                    {todo.id.startsWith('temp-') && (
                      <span style={{ marginLeft: '0.5rem', fontSize: '0.875rem', color: '#0066cc' }}>
                        (saving...)
                      </span>
                    )}
                  </span>
                </div>
                <Button
                  onClick={() => deleteTodo.execute({ todoId: todo.id })}
                  disabled={deleteTodo.loading}
                  variant="outline"
                >
                  {deleteTodo.loading ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Technical Info */}
      <div
        style={{
          marginTop: '3rem',
          padding: '1rem',
          background: '#f9fafb',
          borderRadius: '8px',
          fontSize: '0.875rem',
          color: '#374151',
        }}
      >
        <strong>How Optimistic Updates Work:</strong>
        <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
          <li>
            <strong>onMutate:</strong> Snapshots current state, updates UI immediately, returns context
          </li>
          <li>
            <strong>onSuccess:</strong> Replaces optimistic data with server-confirmed data
          </li>
          <li>
            <strong>onError:</strong> Receives context from onMutate and rolls back to snapshot
          </li>
          <li>
            <strong>No Memory Leaks:</strong> Hook checks if component is mounted before setState
          </li>
          <li>
            <strong>Type-Safe:</strong> Context is typed with TypeScript generics
          </li>
        </ul>

        <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#fff', borderRadius: '4px' }}>
          <strong>Pattern:</strong>
          <pre style={{ margin: '0.5rem 0', fontSize: '0.8125rem', overflow: 'auto' }}>
{`const tool = useMCPTool<Data, Context>('tool', {
  onMutate: (params) => {
    const previous = snapshot();
    optimisticallyUpdate();
    return { previous }; // Context
  },
  onError: (err, params, context) => {
    rollback(context.previous); // Auto rollback
  }
});`}
          </pre>
        </div>
      </div>
    </div>
  );
}
