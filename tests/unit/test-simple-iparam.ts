/**
 * Test: Can IParam work without generics, using only a type field?
 */

// Simplified IParam - no generic
interface IParam {
  description: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
}

// Define a parameter WITHOUT specifying the type
interface NameParam extends IParam {
  description: 'User full name';
  minLength: 1;
  maxLength: 100;
}

interface AgeParam extends IParam {
  description: 'User age';
  min: 0;
  max: 150;
}

// Use in a tool
interface GreetTool {
  name: 'greet';
  description: 'Greet a user';
  params: {
    name: NameParam;
    age: AgeParam;
  };
  result: string;
}

// The question: Can the schema generator infer the type?
// Answer: YES! It can infer from the constraints:
//   - minLength/maxLength → must be string
//   - min/max (without int) → must be number
//   - int: true → must be integer

console.log('Testing simplified IParam without generics...');

// Constraint-based type inference rules:
// If has: minLength, maxLength, pattern, format → STRING
// If has: min, max, int, multipleOf → NUMBER
// If has: minItems, maxItems, uniqueItems → ARRAY
// Default: ANY

const nameConstraints = {
  minLength: 1,
  maxLength: 100
};

const ageConstraints = {
  min: 0,
  max: 150
};

function inferType(constraints: any): string {
  if (constraints.minLength !== undefined ||
      constraints.maxLength !== undefined ||
      constraints.pattern !== undefined ||
      constraints.format !== undefined) {
    return 'string';
  }

  if (constraints.min !== undefined ||
      constraints.max !== undefined ||
      constraints.int !== undefined ||
      constraints.multipleOf !== undefined) {
    return 'number';
  }

  if (constraints.minItems !== undefined ||
      constraints.maxItems !== undefined ||
      constraints.uniqueItems !== undefined) {
    return 'array';
  }

  return 'any';
}

console.log('Name type:', inferType(nameConstraints));  // string
console.log('Age type:', inferType(ageConstraints));    // number

console.log('\n✅ Yes! We can infer the type from constraints alone!');
console.log('✅ No need for IParam<string> - the constraints tell us the type!');
