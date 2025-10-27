# Completions Guide - Autocomplete for Prompts

**Implementation requirement:** ✅ Always required - custom completion functions for each context type

**Method naming:** snake_case → camelCase (e.g., `list_completions` → `listCompletions`)

---

Learn how to provide autocomplete suggestions for prompt arguments using the completions capability.

**What are Completions?** A server-side capability that provides autocomplete suggestions for prompt arguments, enhancing user experience by helping users fill in values as they type.

**See working examples:**
- Foundation: [examples/interface-completions-foundation.ts](../../examples/interface-completions-foundation.ts)
- Advanced: [examples/interface-completions.ts](../../examples/interface-completions.ts)
- Comprehensive: [examples/interface-protocol-comprehensive.ts](../../examples/interface-protocol-comprehensive.ts)

---

## Overview

The completion protocol enables servers to suggest values for prompt arguments. This is useful when:
- **Dynamic Suggestions**: Provide context-aware suggestions based on current state
- **Data Discovery**: Help users discover available options (file names, IDs, categories)
- **Input Validation**: Guide users toward valid values
- **UX Enhancement**: Reduce typing and prevent errors
- **External Data**: Suggest values from APIs, databases, or file systems

Completions work as users type:
1. User starts typing in a prompt argument field
2. Client requests completions from server with partial value
3. Server returns list of matching suggestions
4. Client displays suggestions to user

---

## ICompletion Interface

The completion interface defines autocomplete handlers:

```typescript
import type { ICompletion } from 'simply-mcp';

/**
 * Completion definition
 */
interface ICompletion<TArg = any, TSuggestions = any> {
  /**
   * Name identifier for this completion handler
   */
  name: string;

  /**
   * Description of what this completion provides
   */
  description: string;

  /**
   * Reference to what is being completed (e.g., prompt argument name)
   */
  ref: TArg;

  /**
   * Completion function that generates suggestions
   * @param value - Current partial value being typed
   * @param context - Optional context (argument name, other argument values, etc.)
   * @returns Array of completion suggestions
   */
  complete: (value: string, context?: any) => TSuggestions | Promise<TSuggestions>;
}
```

**Completion Reference Structure:**
```typescript
interface CompletionRef {
  /**
   * What is being completed
   */
  type: 'argument' | 'resource' | 'custom';

  /**
   * Name of the argument or resource
   */
  name: string;
}
```

---

## Basic Usage

### Simple Autocomplete

Provide basic string completions:

```typescript
import type { ICompletion, IPrompt, IServer } from 'simply-mcp';

// Prompt with an argument that needs completion
interface SearchPrompt extends IPrompt {
  name: 'search';
  description: 'Search for items';
  args: {
    /** Category to search in */
    category: string;
    /** Search query */
    query: string;
  };
  template: 'Search for {query} in {category}';
}

// Completion for the category argument
interface CategoryCompletion extends ICompletion {
  name: 'category_autocomplete';
  description: 'Autocomplete category names';
  ref: {
    type: 'argument';
    name: 'category';
  };
  complete: (value: string) => string[];
}

interface MyServer extends IServer {
  name: 'search-service';
  version: '1.0.0';
}

export default class MyServerImpl implements MyServer {
  private categories = ['electronics', 'books', 'clothing', 'food', 'toys'];

  // Implement completion handler
  categoryAutocomplete: CategoryCompletion = (value) => {
    // Filter categories based on partial input
    const lowerValue = value.toLowerCase();

    return this.categories.filter(cat =>
      cat.toLowerCase().startsWith(lowerValue)
    );
  };
}
```

**Key points:**
- Completion name should be descriptive (e.g., `category_autocomplete`)
- The `ref` field indicates which prompt argument this completes
- Return array of suggestion strings
- Filter based on partial input value

---

## Dynamic Completions

### Context-aware Suggestions

Use external data to provide completions:

```typescript
interface FileCompletion extends ICompletion {
  name: 'file_autocomplete';
  description: 'Autocomplete file names in project';
  ref: {
    type: 'argument';
    name: 'filename';
  };
  complete: (value: string) => Promise<string[]>;
}

export default class FileServer implements IServer {
  fileAutocomplete: FileCompletion = async (value) => {
    // Get available files
    const files = await this.listProjectFiles();

    // Filter based on input
    return files
      .filter(file => file.includes(value))
      .slice(0, 10);  // Limit to 10 suggestions
  };

  private async listProjectFiles(): Promise<string[]> {
    // Implementation - scan project directory
    return ['index.ts', 'server.ts', 'types.ts', 'config.json'];
  }
}
```

### Database-backed Completions

Suggest values from a database:

```typescript
interface UserCompletion extends ICompletion {
  name: 'user_autocomplete';
  description: 'Autocomplete user names';
  ref: {
    type: 'argument';
    name: 'username';
  };
  complete: (value: string) => Promise<string[]>;
}

export default class UserServer implements IServer {
  userAutocomplete: UserCompletion = async (value) => {
    if (value.length < 2) {
      // Don't search until at least 2 characters
      return [];
    }

    // Query database
    const users = await this.searchUsers(value);

    // Return usernames
    return users.map(u => u.username).slice(0, 20);
  };

  private async searchUsers(query: string): Promise<Array<any>> {
    // Implementation - database query
    // SELECT username FROM users WHERE username LIKE ?
    return [];
  }
}
```

---

## Integration with Prompts

### Multi-argument Completion

Provide completions for multiple arguments:

```typescript
interface SearchPrompt extends IPrompt {
  name: 'advanced_search';
  description: 'Advanced search with filters';
  args: {
    /** Search category */
    category: string;
    /** Search tags */
    tags: string;
    /** Sort order */
    sortBy: string;
  };
  template: 'Search in {category} with tags {tags}, sorted by {sortBy}';
}

// Completion for category
interface CategoryCompletion extends ICompletion {
  name: 'category_complete';
  description: 'Suggest categories';
  ref: { type: 'argument'; name: 'category' };
  complete: (value: string) => string[];
}

// Completion for tags
interface TagsCompletion extends ICompletion {
  name: 'tags_complete';
  description: 'Suggest tags';
  ref: { type: 'argument'; name: 'tags' };
  complete: (value: string) => Promise<string[]>;
}

// Completion for sort order
interface SortCompletion extends ICompletion {
  name: 'sort_complete';
  description: 'Suggest sort options';
  ref: { type: 'argument'; name: 'sortBy' };
  complete: (value: string) => string[];
}

export default class SearchServer implements IServer {
  private categories = ['news', 'blogs', 'videos', 'images'];
  private sortOptions = ['relevance', 'date', 'popularity', 'title'];

  categoryComplete: CategoryCompletion = (value) => {
    return this.categories.filter(c => c.includes(value));
  };

  tagsComplete: TagsCompletion = async (value) => {
    // Fetch available tags from database
    const tags = await this.getAvailableTags();
    return tags.filter(t => t.includes(value));
  };

  sortComplete: SortCompletion = (value) => {
    return this.sortOptions.filter(s => s.includes(value));
  };

  private async getAvailableTags(): Promise<string[]> {
    // Implementation
    return ['tech', 'news', 'tutorial', 'review'];
  }
}
```

### Contextual Completions

Use context to provide smarter suggestions:

```typescript
interface DeployPrompt extends IPrompt {
  name: 'deploy';
  description: 'Deploy application';
  args: {
    /** Target environment */
    environment: string;
    /** Application version */
    version: string;
  };
  template: 'Deploy version {version} to {environment}';
}

interface VersionCompletion extends ICompletion {
  name: 'version_complete';
  description: 'Suggest available versions';
  ref: { type: 'argument'; name: 'version' };
  complete: (value: string, context?: any) => Promise<string[]>;
}

export default class DeployServer implements IServer {
  versionComplete: VersionCompletion = async (value, context) => {
    // Get environment from context if available
    const environment = context?.environment || 'production';

    // Fetch versions compatible with this environment
    const versions = await this.getCompatibleVersions(environment);

    return versions.filter(v => v.startsWith(value));
  };

  private async getCompatibleVersions(env: string): Promise<string[]> {
    // Implementation - return versions suitable for environment
    return env === 'production'
      ? ['1.0.0', '1.1.0', '1.2.0']
      : ['1.0.0', '1.1.0', '1.2.0', '2.0.0-beta'];
  }
}
```

---

## Best Practices

### Fast Completion Responses

Keep completions fast to avoid UI lag:

```typescript
// Good: Fast local filtering
categoryComplete: CategoryCompletion = (value) => {
  return this.categories.filter(c => c.includes(value));
};

// Good: Cached API results
cityComplete: CityCompletion = async (value) => {
  if (this.cache.has(value)) {
    return this.cache.get(value)!;
  }

  const results = await this.fetchCities(value);
  this.cache.set(value, results);
  return results;
};

// Bad: Slow uncached API call
slowComplete: SlowCompletion = async (value) => {
  // Every keystroke triggers API call
  return await fetch(`https://slow-api.com?q=${value}`);
};
```

### Caching Strategies

Implement intelligent caching:

```typescript
export default class CachedCompletionServer implements IServer {
  private cache = new Map<string, { data: string[]; expires: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  productComplete: ProductCompletion = async (value) => {
    // Check cache
    const cached = this.cache.get(value);

    if (cached && cached.expires > Date.now()) {
      return cached.data;
    }

    // Fetch fresh data
    const products = await this.searchProducts(value);

    // Cache with expiration
    this.cache.set(value, {
      data: products,
      expires: Date.now() + this.CACHE_TTL
    });

    return products;
  };

  private async searchProducts(query: string): Promise<string[]> {
    // Implementation
    return [];
  }
}
```

### Limiting Results

Limit the number of suggestions:

```typescript
fileComplete: FileCompletion = async (value) => {
  const allFiles = await this.listFiles();

  return allFiles
    .filter(f => f.includes(value))
    .sort()                    // Sort alphabetically
    .slice(0, 10);             // Limit to 10 suggestions
};
```

### Minimum Input Length

Don't search until user types enough characters:

```typescript
userComplete: UserCompletion = async (value) => {
  // Require at least 2 characters
  if (value.length < 2) {
    return [];
  }

  return await this.searchUsers(value);
};
```

### Error Handling

Handle errors gracefully:

```typescript
apiComplete: ApiCompletion = async (value) => {
  try {
    const results = await this.fetchFromApi(value);
    return results;
  } catch (error) {
    console.error('Completion failed:', error.message);

    // Return empty array on error (don't crash)
    return [];
  }
};
```

---

## Error Handling

### API Failures

Handle external API failures:

```typescript
cityComplete: CityCompletion = async (value) => {
  try {
    const response = await fetch(
      `https://api.example.com/cities?q=${value}`,
      { timeout: 5000 }  // 5 second timeout
    );

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    // Log error but return empty results
    console.error('City completion failed:', error.message);
    return [];
  }
};
```

### Invalid Input

Validate input before processing:

```typescript
fileComplete: FileCompletion = async (value) => {
  // Validate input
  if (!value || typeof value !== 'string') {
    return [];
  }

  // Remove potentially dangerous characters
  const sanitized = value.replace(/[<>:"|?*]/g, '');

  if (sanitized !== value) {
    console.warn('Invalid characters removed from completion input');
  }

  return await this.searchFiles(sanitized);
};
```

### Timeout Handling

Implement timeouts for slow operations:

```typescript
async function completionWithTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number = 3000
): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Completion timeout')), timeoutMs)
    )
  ]);
}

// Usage
dbComplete: DbCompletion = async (value) => {
  try {
    return await completionWithTimeout(
      () => this.searchDatabase(value),
      2000  // 2 second timeout
    );
  } catch (error) {
    if (error.message === 'Completion timeout') {
      console.warn('Database completion timed out');
    }
    return [];
  }
};
```

---

## Integration Examples

See `examples/interface-protocol-comprehensive.ts` for integration patterns combining multiple protocol features.

---

## Examples

**See working examples:**
- Foundation: [examples/interface-completions-foundation.ts](../../examples/interface-completions-foundation.ts)
- Advanced: [examples/interface-completions.ts](../../examples/interface-completions.ts)
- Comprehensive: [examples/interface-protocol-comprehensive.ts](../../examples/interface-protocol-comprehensive.ts)

---

## Next Steps

- **Request LLM completions?** See [SAMPLING.md](./SAMPLING.md)
- **Request user input?** See [ELICITATION.md](./ELICITATION.md)
- **List client roots?** See [ROOTS.md](./ROOTS.md)
- **Add subscriptions?** See [SUBSCRIPTIONS.md](./SUBSCRIPTIONS.md)
- **Learn more about Interface API?** See [API_PROTOCOL.md](./API_PROTOCOL.md)

---

**Need help?** Check [docs/README.md](../README.md) for the full documentation index.
