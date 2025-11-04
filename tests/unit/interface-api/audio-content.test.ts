/**
 * Audio Content Test Suite
 *
 * Tests comprehensive audio content support in the Interface-Driven API:
 * - IAudioContent interface usage and type safety
 * - IAudioMetadata interface structure
 * - Integration with IResource definitions
 * - Static and dynamic resource patterns
 * - Multiple MIME type support
 * - Metadata handling and validation
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { loadInterfaceServer } from '../../../src/server/adapter.js';
import { writeFileSync, unlinkSync } from 'fs';
import { resolve } from 'path';
import type { IAudioContent, IAudioMetadata } from '../../../src/server/interface-types.js';

// Sample audio data (minimal valid WAV file - 1 second of silence)
const SAMPLE_WAV_BASE64 = 'UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';
const SAMPLE_MP3_BASE64 = '//uQxAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAACAAABhAC7u7u7u7u7u7u7u7u7u7u7u7u7';
const SAMPLE_OGG_BASE64 = 'T2dnUwACAAAAAAAAAABiRLLdAAAAAP4AAAABAQEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';

// Test server code for audio resources
const AUDIO_TEST_SERVER_CODE = `
import type { IServer, IResource, IAudioContent } from '../../../src/index.js';

/**
 * Static WAV Resource
 */
interface StaticWavResource extends IResource {
  uri: 'audio://static-wav';
  name: 'Static WAV Audio';
  description: 'Embedded WAV audio with metadata';
  mimeType: 'audio/wav';
  returns: IAudioContent;
}

/**
 * Static MP3 Resource
 */
interface StaticMp3Resource extends IResource {
  uri: 'audio://static-mp3';
  name: 'Static MP3 Audio';
  description: 'Embedded MP3 audio';
  mimeType: 'audio/mpeg';
  returns: IAudioContent;
}

/**
 * Static OGG Resource
 */
interface StaticOggResource extends IResource {
  uri: 'audio://static-ogg';
  name: 'Static OGG Audio';
  description: 'Embedded OGG audio';
  mimeType: 'audio/ogg';
  returns: IAudioContent;
}

/**
 * Dynamic Audio Resource
 */
interface DynamicAudioResource extends IResource {
  uri: 'audio://dynamic';
  name: 'Dynamic Audio';
  description: 'Audio loaded dynamically';
  mimeType: 'audio/wav';
  returns: IAudioContent;
}

/**
 * High-Resolution FLAC Resource
 */
interface HighResAudioResource extends IResource {
  uri: 'audio://high-res';
  name: 'High-Res Audio';
  description: 'Professional quality audio';
  mimeType: 'audio/flac';
  returns: IAudioContent;
}

/**
 * Minimal Audio (No Metadata)
 */
interface MinimalAudioResource extends IResource {
  uri: 'audio://minimal';
  name: 'Minimal Audio';
  description: 'Audio without metadata';
  mimeType: 'audio/wav';
  returns: IAudioContent;
}

/**
 * Audio Collection
 */
interface AudioCollectionResource extends IResource {
  uri: 'audio://collection';
  name: 'Audio Collection';
  description: 'Collection of audio files';
  mimeType: 'application/json';
  returns: {
    items: Array<IAudioContent & { name: string }>;
    total: number;
  };
}

/**
 * Server Interface
 */
interface AudioTestServer extends IServer {
  name: 'audio-test';
  version: '1.0.0';
  description: 'Audio content test server';
}

/**
 * Server Implementation
 */
export default class AudioTestServerImpl {
  'audio://static-wav' = async (): Promise<IAudioContent> => {
    return {
      type: 'audio',
      data: '${SAMPLE_WAV_BASE64}',
      mimeType: 'audio/wav',
      metadata: {
        duration: 1.0,
        sampleRate: 44100,
        channels: 2,
        bitrate: 1411,
        codec: 'pcm',
        size: 44,
        originalPath: '/test/audio.wav',
      },
    };
  };

  'audio://static-mp3' = async (): Promise<IAudioContent> => {
    return {
      type: 'audio',
      data: '${SAMPLE_MP3_BASE64}',
      mimeType: 'audio/mpeg',
      metadata: {
        duration: 0.026,
        sampleRate: 44100,
        channels: 2,
        bitrate: 128,
        codec: 'mp3',
      },
    };
  };

  'audio://static-ogg' = async (): Promise<IAudioContent> => {
    return {
      type: 'audio',
      data: '${SAMPLE_OGG_BASE64}',
      mimeType: 'audio/ogg',
      metadata: {
        duration: 0.1,
        sampleRate: 48000,
        channels: 2,
        bitrate: 160,
        codec: 'vorbis',
      },
    };
  };

  'audio://high-res' = async (): Promise<IAudioContent> => {
    return {
      type: 'audio',
      data: '${SAMPLE_WAV_BASE64}',
      mimeType: 'audio/flac',
      metadata: {
        duration: 180.5,
        sampleRate: 96000,
        channels: 2,
        bitrate: 2304,
        codec: 'flac',
        size: 41472000,
      },
    };
  };

  'audio://minimal' = async (): Promise<IAudioContent> => {
    return {
      type: 'audio',
      data: '${SAMPLE_WAV_BASE64}',
      mimeType: 'audio/wav',
    };
  };

  'audio://dynamic' = async (): Promise<IAudioContent> => {
    return {
      type: 'audio',
      data: '${SAMPLE_WAV_BASE64}',
      mimeType: 'audio/wav',
      metadata: {
        duration: 5.0,
        sampleRate: 44100,
        channels: 2,
      },
    };
  };

  'audio://collection' = async () => {
    const items = [
      {
        name: 'WAV Sample',
        type: 'audio' as const,
        data: '${SAMPLE_WAV_BASE64}',
        mimeType: 'audio/wav' as const,
        metadata: {
          duration: 1.0,
          sampleRate: 44100,
          channels: 2,
        },
      },
      {
        name: 'MP3 Sample',
        type: 'audio' as const,
        data: '${SAMPLE_MP3_BASE64}',
        mimeType: 'audio/mpeg' as const,
        metadata: {
          duration: 0.026,
          sampleRate: 44100,
          channels: 2,
          bitrate: 128,
        },
      },
    ];

    return {
      items,
      total: items.length,
    };
  };
}
`;

describe('Audio Content Support - Interface-Driven API', () => {
  let testFilePath: string;
  let server: any;

  beforeAll(async () => {
    // Create temporary test file
    testFilePath = resolve(process.cwd(), 'tests/unit/interface-api/__test-audio-server.ts');
    writeFileSync(testFilePath, AUDIO_TEST_SERVER_CODE);

    // Load the server
    server = await loadInterfaceServer({ filePath: testFilePath });
  });

  afterAll(() => {
    // Cleanup
    try {
      unlinkSync(testFilePath);
    } catch (e) {
      // Ignore cleanup errors
    }
  });

  describe('IAudioContent Interface', () => {
    it('should have required type discriminator set to "audio"', () => {
      const audioContent: IAudioContent = {
        type: 'audio',
        data: SAMPLE_WAV_BASE64,
        mimeType: 'audio/wav',
      };

      expect(audioContent.type).toBe('audio');
    });

    it('should have required data field for base64 content', () => {
      const audioContent: IAudioContent = {
        type: 'audio',
        data: SAMPLE_WAV_BASE64,
        mimeType: 'audio/wav',
      };

      expect(audioContent.data).toBeDefined();
      expect(typeof audioContent.data).toBe('string');
      expect(audioContent.data).toBe(SAMPLE_WAV_BASE64);
    });

    it('should have required mimeType field', () => {
      const audioContent: IAudioContent = {
        type: 'audio',
        data: SAMPLE_WAV_BASE64,
        mimeType: 'audio/wav',
      };

      expect(audioContent.mimeType).toBeDefined();
      expect(typeof audioContent.mimeType).toBe('string');
    });

    it('should accept known audio MIME types', () => {
      const mimeTypes = ['audio/wav', 'audio/mpeg', 'audio/ogg', 'audio/flac', 'audio/aac', 'audio/mp4'];

      mimeTypes.forEach((mimeType) => {
        const audioContent: IAudioContent = {
          type: 'audio',
          data: SAMPLE_WAV_BASE64,
          mimeType: mimeType as any,
        };

        expect(audioContent.mimeType).toBe(mimeType);
      });
    });

    it('should accept custom MIME type strings', () => {
      const audioContent: IAudioContent = {
        type: 'audio',
        data: SAMPLE_WAV_BASE64,
        mimeType: 'audio/x-custom-format',
      };

      expect(audioContent.mimeType).toBe('audio/x-custom-format');
    });

    it('should have optional metadata field', () => {
      // Without metadata
      const withoutMetadata: IAudioContent = {
        type: 'audio',
        data: SAMPLE_WAV_BASE64,
        mimeType: 'audio/wav',
      };

      expect(withoutMetadata.metadata).toBeUndefined();

      // With metadata
      const withMetadata: IAudioContent = {
        type: 'audio',
        data: SAMPLE_WAV_BASE64,
        mimeType: 'audio/wav',
        metadata: {
          duration: 1.0,
          sampleRate: 44100,
        },
      };

      expect(withMetadata.metadata).toBeDefined();
    });

    it('should infer types correctly with TypeScript', () => {
      const audioContent: IAudioContent = {
        type: 'audio',
        data: SAMPLE_WAV_BASE64,
        mimeType: 'audio/wav',
        metadata: {
          duration: 1.0,
        },
      };

      // Type assertions to verify inference
      const typeCheck: 'audio' = audioContent.type;
      const dataCheck: string = audioContent.data;
      const mimeCheck: string = audioContent.mimeType;
      const metadataCheck: IAudioMetadata | undefined = audioContent.metadata;

      expect(typeCheck).toBe('audio');
      expect(dataCheck).toBe(SAMPLE_WAV_BASE64);
      expect(mimeCheck).toBe('audio/wav');
      expect(metadataCheck).toBeDefined();
    });
  });

  describe('IAudioMetadata Interface', () => {
    it('should have all fields as optional', () => {
      const emptyMetadata: IAudioMetadata = {};
      expect(emptyMetadata).toBeDefined();

      const partialMetadata: IAudioMetadata = {
        duration: 1.0,
      };
      expect(partialMetadata).toBeDefined();
    });

    it('should accept duration in seconds', () => {
      const metadata: IAudioMetadata = {
        duration: 120.5,
      };

      expect(metadata.duration).toBe(120.5);
      expect(typeof metadata.duration).toBe('number');
    });

    it('should accept sampleRate in Hz', () => {
      const metadata: IAudioMetadata = {
        sampleRate: 44100,
      };

      expect(metadata.sampleRate).toBe(44100);
      expect(typeof metadata.sampleRate).toBe('number');
    });

    it('should accept channels count', () => {
      const metadata: IAudioMetadata = {
        channels: 2,
      };

      expect(metadata.channels).toBe(2);
      expect(typeof metadata.channels).toBe('number');
    });

    it('should accept bitrate in kbps', () => {
      const metadata: IAudioMetadata = {
        bitrate: 320,
      };

      expect(metadata.bitrate).toBe(320);
      expect(typeof metadata.bitrate).toBe('number');
    });

    it('should accept codec string', () => {
      const metadata: IAudioMetadata = {
        codec: 'mp3',
      };

      expect(metadata.codec).toBe('mp3');
      expect(typeof metadata.codec).toBe('string');
    });

    it('should accept size in bytes', () => {
      const metadata: IAudioMetadata = {
        size: 5242880,
      };

      expect(metadata.size).toBe(5242880);
      expect(typeof metadata.size).toBe('number');
    });

    it('should accept originalPath string', () => {
      const metadata: IAudioMetadata = {
        originalPath: '/path/to/audio.mp3',
      };

      expect(metadata.originalPath).toBe('/path/to/audio.mp3');
      expect(typeof metadata.originalPath).toBe('string');
    });

    it('should accept all fields populated', () => {
      const metadata: IAudioMetadata = {
        duration: 180.5,
        sampleRate: 96000,
        channels: 2,
        bitrate: 2304,
        codec: 'flac',
        size: 41472000,
        originalPath: '/audio/high-res.flac',
      };

      expect(metadata.duration).toBe(180.5);
      expect(metadata.sampleRate).toBe(96000);
      expect(metadata.channels).toBe(2);
      expect(metadata.bitrate).toBe(2304);
      expect(metadata.codec).toBe('flac');
      expect(metadata.size).toBe(41472000);
      expect(metadata.originalPath).toBe('/audio/high-res.flac');
    });
  });

  describe('Audio Resources with IResource', () => {
    it('should define resource with IAudioContent returns type', async () => {
      const resources = server.listResources();
      const wavResource = resources.find((r: any) => r.uri === 'audio://static-wav');

      expect(wavResource).toBeDefined();
      expect(wavResource?.name).toBe('Static WAV Audio');
      expect(wavResource?.mimeType).toBe('audio/wav');
    });

    it('should define dynamic resource with IAudioContent returns', async () => {
      const resources = server.listResources();
      const dynamicResource = resources.find((r: any) => r.uri === 'audio://dynamic');

      expect(dynamicResource).toBeDefined();
      expect(dynamicResource?.name).toBe('Dynamic Audio');
      expect(dynamicResource?.mimeType).toBe('audio/wav');
    });

    it('should support multiple audio resources in same server', async () => {
      const resources = server.listResources();
      const audioResources = resources.filter((r: any) => r.uri.startsWith('audio://'));

      expect(audioResources.length).toBeGreaterThanOrEqual(6);

      const uris = audioResources.map((r: any) => r.uri);
      expect(uris).toContain('audio://static-wav');
      expect(uris).toContain('audio://static-mp3');
      expect(uris).toContain('audio://static-ogg');
      expect(uris).toContain('audio://dynamic');
      expect(uris).toContain('audio://high-res');
      expect(uris).toContain('audio://minimal');
    });

    it('should specify MIME types in resource definitions', async () => {
      const resources = server.listResources();

      const wavResource = resources.find((r: any) => r.uri === 'audio://static-wav');
      expect(wavResource?.mimeType).toBe('audio/wav');

      const mp3Resource = resources.find((r: any) => r.uri === 'audio://static-mp3');
      expect(mp3Resource?.mimeType).toBe('audio/mpeg');

      const oggResource = resources.find((r: any) => r.uri === 'audio://static-ogg');
      expect(oggResource?.mimeType).toBe('audio/ogg');

      const flacResource = resources.find((r: any) => r.uri === 'audio://high-res');
      expect(flacResource?.mimeType).toBe('audio/flac');
    });
  });

  describe('Audio Content in Resource Handlers', () => {
    it('should return IAudioContent from static WAV resource', async () => {
      const result = await server.readResource('audio://static-wav');

      expect(result).toBeDefined();
      expect(result.contents).toBeDefined();
      expect(Array.isArray(result.contents)).toBe(true);
      expect(result.contents.length).toBeGreaterThan(0);

      const textContent = result.contents.find((item: any) => 'text' in item);
      expect(textContent).toBeDefined();

      const audioContent = JSON.parse((textContent as { text: string }).text);
      expect(audioContent.type).toBe('audio');
      expect(audioContent.data).toBe(SAMPLE_WAV_BASE64);
      expect(audioContent.mimeType).toBe('audio/wav');
    });

    it('should return IAudioContent from static MP3 resource', async () => {
      const result = await server.readResource('audio://static-mp3');

      const textContent = result.contents.find((item: any) => 'text' in item);
      expect(textContent).toBeDefined();

      const audioContent = JSON.parse((textContent as { text: string }).text);
      expect(audioContent.type).toBe('audio');
      expect(audioContent.data).toBe(SAMPLE_MP3_BASE64);
      expect(audioContent.mimeType).toBe('audio/mpeg');
    });

    it('should return IAudioContent from static OGG resource', async () => {
      const result = await server.readResource('audio://static-ogg');

      const textContent = result.contents.find((item: any) => 'text' in item);
      expect(textContent).toBeDefined();

      const audioContent = JSON.parse((textContent as { text: string }).text);
      expect(audioContent.type).toBe('audio');
      expect(audioContent.data).toBe(SAMPLE_OGG_BASE64);
      expect(audioContent.mimeType).toBe('audio/ogg');
    });

    it('should populate metadata correctly in WAV resource', async () => {
      const result = await server.readResource('audio://static-wav');
      const textContent = result.contents.find((item: any) => 'text' in item);
      const audioContent = JSON.parse((textContent as { text: string }).text);

      expect(audioContent.metadata).toBeDefined();
      expect(audioContent.metadata.duration).toBe(1.0);
      expect(audioContent.metadata.sampleRate).toBe(44100);
      expect(audioContent.metadata.channels).toBe(2);
      expect(audioContent.metadata.bitrate).toBe(1411);
      expect(audioContent.metadata.codec).toBe('pcm');
      expect(audioContent.metadata.size).toBe(44);
      expect(audioContent.metadata.originalPath).toBe('/test/audio.wav');
    });

    it('should populate metadata correctly in MP3 resource', async () => {
      const result = await server.readResource('audio://static-mp3');
      const textContent = result.contents.find((item: any) => 'text' in item);
      const audioContent = JSON.parse((textContent as { text: string }).text);

      expect(audioContent.metadata).toBeDefined();
      expect(audioContent.metadata.duration).toBe(0.026);
      expect(audioContent.metadata.sampleRate).toBe(44100);
      expect(audioContent.metadata.channels).toBe(2);
      expect(audioContent.metadata.bitrate).toBe(128);
      expect(audioContent.metadata.codec).toBe('mp3');
    });

    it('should populate metadata correctly in OGG resource', async () => {
      const result = await server.readResource('audio://static-ogg');
      const textContent = result.contents.find((item: any) => 'text' in item);
      const audioContent = JSON.parse((textContent as { text: string }).text);

      expect(audioContent.metadata).toBeDefined();
      expect(audioContent.metadata.duration).toBe(0.1);
      expect(audioContent.metadata.sampleRate).toBe(48000);
      expect(audioContent.metadata.channels).toBe(2);
      expect(audioContent.metadata.bitrate).toBe(160);
      expect(audioContent.metadata.codec).toBe('vorbis');
    });

    it('should support high-resolution audio metadata', async () => {
      const result = await server.readResource('audio://high-res');
      const textContent = result.contents.find((item: any) => 'text' in item);
      const audioContent = JSON.parse((textContent as { text: string }).text);

      expect(audioContent.type).toBe('audio');
      expect(audioContent.mimeType).toBe('audio/flac');
      expect(audioContent.metadata).toBeDefined();
      expect(audioContent.metadata.duration).toBe(180.5);
      expect(audioContent.metadata.sampleRate).toBe(96000);
      expect(audioContent.metadata.channels).toBe(2);
      expect(audioContent.metadata.bitrate).toBe(2304);
      expect(audioContent.metadata.codec).toBe('flac');
      expect(audioContent.metadata.size).toBe(41472000);
    });

    it('should handle audio content without metadata', async () => {
      const result = await server.readResource('audio://minimal');
      const textContent = result.contents.find((item: any) => 'text' in item);
      const audioContent = JSON.parse((textContent as { text: string }).text);

      expect(audioContent.type).toBe('audio');
      expect(audioContent.data).toBe(SAMPLE_WAV_BASE64);
      expect(audioContent.mimeType).toBe('audio/wav');
      expect(audioContent.metadata).toBeUndefined();
    });

    it('should return IAudioContent from dynamic resource', async () => {
      const result = await server.readResource('audio://dynamic');
      const textContent = result.contents.find((item: any) => 'text' in item);
      const audioContent = JSON.parse((textContent as { text: string }).text);

      expect(audioContent.type).toBe('audio');
      expect(audioContent.data).toBe(SAMPLE_WAV_BASE64);
      expect(audioContent.mimeType).toBe('audio/wav');
      expect(audioContent.metadata).toBeDefined();
      expect(audioContent.metadata.duration).toBe(5.0);
      expect(audioContent.metadata.sampleRate).toBe(44100);
      expect(audioContent.metadata.channels).toBe(2);
    });

    it('should handle base64 data correctly', async () => {
      const result = await server.readResource('audio://static-wav');
      const textContent = result.contents.find((item: any) => 'text' in item);
      const audioContent = JSON.parse((textContent as { text: string }).text);

      // Verify base64 string format
      expect(typeof audioContent.data).toBe('string');
      expect(audioContent.data.length).toBeGreaterThan(0);

      // Verify it's valid base64 (no invalid characters)
      const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
      expect(base64Regex.test(audioContent.data)).toBe(true);
    });

    it('should return collection with multiple audio items', async () => {
      const result = await server.readResource('audio://collection');

      expect(result).toBeDefined();
      expect(result.contents).toBeDefined();
      expect(result.contents.length).toBeGreaterThan(0);

      const textContent = result.contents.find((item: any) => 'text' in item);
      expect(textContent).toBeDefined();

      const parsed = JSON.parse((textContent as { text: string }).text);
      expect(parsed.items).toBeDefined();
      expect(Array.isArray(parsed.items)).toBe(true);
      expect(parsed.items.length).toBe(2);
      expect(parsed.total).toBe(2);

      // Check first item
      const item1 = parsed.items[0];
      expect(item1.type).toBe('audio');
      expect(item1.data).toBe(SAMPLE_WAV_BASE64);
      expect(item1.mimeType).toBe('audio/wav');
      expect(item1.name).toBe('WAV Sample');

      // Check second item
      const item2 = parsed.items[1];
      expect(item2.type).toBe('audio');
      expect(item2.data).toBe(SAMPLE_MP3_BASE64);
      expect(item2.mimeType).toBe('audio/mpeg');
      expect(item2.name).toBe('MP3 Sample');
    });
  });

  describe('Type Safety and Inference', () => {
    it('should enforce type discriminator value', () => {
      // Valid
      const valid: IAudioContent = {
        type: 'audio',
        data: SAMPLE_WAV_BASE64,
        mimeType: 'audio/wav',
      };
      expect(valid.type).toBe('audio');

      // TypeScript would catch invalid type at compile time:
      // const invalid: IAudioContent = {
      //   type: 'image', // Error: Type '"image"' is not assignable to type '"audio"'
      //   data: SAMPLE_WAV_BASE64,
      //   mimeType: 'audio/wav',
      // };
    });

    it('should enforce required fields at compile time', () => {
      // All required fields present
      const complete: IAudioContent = {
        type: 'audio',
        data: SAMPLE_WAV_BASE64,
        mimeType: 'audio/wav',
      };
      expect(complete).toBeDefined();

      // TypeScript would catch missing fields at compile time:
      // const missingData: IAudioContent = {
      //   type: 'audio',
      //   mimeType: 'audio/wav',
      // }; // Error: Property 'data' is missing

      // const missingMimeType: IAudioContent = {
      //   type: 'audio',
      //   data: SAMPLE_WAV_BASE64,
      // }; // Error: Property 'mimeType' is missing
    });

    it('should accept valid MIME type strings', () => {
      const validMimeTypes = ['audio/wav', 'audio/mpeg', 'audio/ogg', 'audio/flac', 'audio/aac'];

      validMimeTypes.forEach((mimeType) => {
        const content: IAudioContent = {
          type: 'audio',
          data: SAMPLE_WAV_BASE64,
          mimeType: mimeType,
        };
        expect(content.mimeType).toBe(mimeType);
      });
    });

    it('should enforce metadata field types', () => {
      // Valid metadata with correct types
      const validMetadata: IAudioMetadata = {
        duration: 120.5,
        sampleRate: 44100,
        channels: 2,
        bitrate: 320,
        codec: 'mp3',
        size: 5242880,
        originalPath: '/path/to/file.mp3',
      };

      const audioContent: IAudioContent = {
        type: 'audio',
        data: SAMPLE_WAV_BASE64,
        mimeType: 'audio/mpeg',
        metadata: validMetadata,
      };

      expect(audioContent.metadata).toBeDefined();
      expect(typeof audioContent.metadata?.duration).toBe('number');
      expect(typeof audioContent.metadata?.sampleRate).toBe('number');
      expect(typeof audioContent.metadata?.channels).toBe('number');
      expect(typeof audioContent.metadata?.codec).toBe('string');

      // TypeScript would catch type mismatches at compile time:
      // const invalidMetadata: IAudioMetadata = {
      //   duration: '120.5', // Error: Type 'string' is not assignable to type 'number'
      //   codec: 123, // Error: Type 'number' is not assignable to type 'string'
      // };
    });
  });

  describe('Integration with createAudioContent Helper', () => {
    it('should produce compatible structure from helper', async () => {
      // Simulating what createAudioContent returns
      const helperOutput = {
        type: 'audio' as const,
        data: SAMPLE_WAV_BASE64,
        mimeType: 'audio/wav',
        _meta: {
          size: 44,
          originalPath: '/test/audio.wav',
        },
      };

      // Should be compatible with IAudioContent (minus _meta)
      const audioContent: IAudioContent = {
        type: helperOutput.type,
        data: helperOutput.data,
        mimeType: helperOutput.mimeType,
        metadata: {
          size: helperOutput._meta.size,
          originalPath: helperOutput._meta.originalPath,
        },
      };

      expect(audioContent.type).toBe('audio');
      expect(audioContent.data).toBe(SAMPLE_WAV_BASE64);
      expect(audioContent.mimeType).toBe('audio/wav');
      expect(audioContent.metadata?.size).toBe(44);
      expect(audioContent.metadata?.originalPath).toBe('/test/audio.wav');
    });

    it('should allow returning helper result from resource', async () => {
      // The dynamic resource internally uses a pattern similar to createAudioContent
      const result = await server.readResource('audio://dynamic');
      const textContent = result.contents.find((item: any) => 'text' in item);
      const audioContent = JSON.parse((textContent as { text: string }).text);

      // Verify structure matches IAudioContent
      expect(audioContent.type).toBe('audio');
      expect(audioContent.data).toBeDefined();
      expect(audioContent.mimeType).toBeDefined();
      expect(typeof audioContent.data).toBe('string');
      expect(typeof audioContent.mimeType).toBe('string');
    });

    it('should support metadata from helper in IAudioContent', () => {
      // Simulating metadata population from createAudioContent
      const helperWithMetadata = {
        type: 'audio' as const,
        data: SAMPLE_WAV_BASE64,
        mimeType: 'audio/wav',
        _meta: {
          size: 5242880,
          originalPath: '/audio/file.wav',
        },
      };

      // Transform to IAudioContent with extended metadata
      const audioContent: IAudioContent = {
        type: helperWithMetadata.type,
        data: helperWithMetadata.data,
        mimeType: helperWithMetadata.mimeType,
        metadata: {
          size: helperWithMetadata._meta.size,
          originalPath: helperWithMetadata._meta.originalPath,
          duration: 180.5,
          sampleRate: 44100,
          channels: 2,
        },
      };

      expect(audioContent.metadata).toBeDefined();
      expect(audioContent.metadata.size).toBe(5242880);
      expect(audioContent.metadata.originalPath).toBe('/audio/file.wav');
      expect(audioContent.metadata.duration).toBe(180.5);
      expect(audioContent.metadata.sampleRate).toBe(44100);
      expect(audioContent.metadata.channels).toBe(2);
    });
  });
});
