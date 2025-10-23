import type { PingTool } from './interface-static-resource.js';

export default class StaticResourceFixture {
  ping(params: PingTool['params']): Promise<PingTool['result']>;
}
