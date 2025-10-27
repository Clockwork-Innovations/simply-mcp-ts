/**
 * Example handler: Greeting function
 *
 * This demonstrates a simple file-based handler
 */

export default async function greetHandler(args: { name: string }) {
  const greeting = `Hello, ${args.name}! Welcome to the MCP framework.`;

  return {
    content: [
      {
        type: 'text',
        text: greeting,
      },
    ],
  };
}