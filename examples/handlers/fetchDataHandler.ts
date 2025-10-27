/**
 * Example handler: HTTP fetch
 *
 * Demonstrates making HTTP requests from a handler
 */

interface FetchDataArgs {
  url: string;
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
}

export default async function fetchDataHandler(args: FetchDataArgs) {
  const { url, method = 'GET', headers = {} } = args;

  try {
    const response = await fetch(url, {
      method,
      headers: {
        'User-Agent': 'MCP-Framework/1.0',
        ...headers,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    let data: any;

    if (contentType?.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    return {
      content: [
        {
          type: 'text',
          text: `Fetched data from ${url}:\n${JSON.stringify(data, null, 2)}`,
        },
      ],
      metadata: {
        status: response.status,
        contentType,
      },
    };
  } catch (error) {
    throw new Error(`Failed to fetch data: ${error instanceof Error ? error.message : String(error)}`);
  }
}