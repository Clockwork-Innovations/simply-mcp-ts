// File with various edge cases

export class EdgeCases {
  /**
   * Method with any type parameter
   */
  anyType(param: any): void {
    console.log(param);
  }

  /**
   * Method with complex generic type
   */
  complexGeneric<T extends Record<string, any>>(data: T): T {
    return data;
  }

  /**
   * Method with default values
   */
  withDefaults(a: string = 'default', b: number = 42): void {
    console.log(a, b);
  }

  /**
   * Method with array and object types
   */
  arrayAndObject(arr: string[], obj: Record<string, number>): boolean {
    return arr.length > 0 && Object.keys(obj).length > 0;
  }

  /**
   * Method with Date type
   */
  dateMethod(date: Date): string {
    return date.toISOString();
  }

  /**
   * Method with optional parameters
   */
  optionalParams(required: string, optional?: number, withDefault: boolean = true): string {
    return `${required}-${optional}-${withDefault}`;
  }
}
