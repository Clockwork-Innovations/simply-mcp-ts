/**
 * Sampling Interface Compiler
 *
 * Compiles ISampling interfaces into ParsedSampling metadata for runtime use.
 */

import * as ts from 'typescript';
import type { ParsedSampling } from '../types.js';
import { extractStaticData } from '../compiler-helpers.js';

export function compileSamplingInterface(node: ts.InterfaceDeclaration, sourceFile: ts.SourceFile): ParsedSampling | null {
  const interfaceName = node.name.text;
  let name = interfaceName; // Use interface name as identifier
  let messagesType = 'any';
  let optionsType: string | undefined;
  let isStatic = false;
  let messages: any = undefined;
  let options: any = undefined;

  // Parse interface members
  for (const member of node.members) {
    if (ts.isPropertySignature(member) && member.name) {
      const memberName = member.name.getText(sourceFile);

      if (memberName === 'messages' && member.type) {
        messagesType = member.type.getText(sourceFile);
        // Try to extract static messages data
        messages = extractStaticData(member.type, sourceFile);
        if (messages !== undefined) {
          isStatic = true;
        }
      } else if (memberName === 'options' && member.type) {
        optionsType = member.type.getText(sourceFile);
        // Try to extract static options data
        options = extractStaticData(member.type, sourceFile);
      }
    }
  }

  return {
    interfaceName,
    name,
    messagesType,
    optionsType,
    isStatic,
    messages,
    options,
  };
}

/**
 * Parse an IElicit interface
 */
