/**
 * Example handler: Calculator function
 *
 * Performs basic arithmetic operations
 */

interface CalculateArgs {
  operation: 'add' | 'subtract' | 'multiply' | 'divide';
  a: number;
  b: number;
}

export default async function calculateHandler(args: CalculateArgs) {
  const { operation, a, b } = args;

  let result: number;

  switch (operation) {
    case 'add':
      result = a + b;
      break;
    case 'subtract':
      result = a - b;
      break;
    case 'multiply':
      result = a * b;
      break;
    case 'divide':
      if (b === 0) {
        throw new Error('Division by zero is not allowed');
      }
      result = a / b;
      break;
    default:
      throw new Error(`Unknown operation: ${operation}`);
  }

  return {
    content: [
      {
        type: 'text',
        text: `Result: ${a} ${operation} ${b} = ${result}`,
      },
    ],
  };
}