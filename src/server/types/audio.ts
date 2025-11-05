/**
 * Audio content types for resources
 */

/**
 * Audio metadata for Interface-Driven API resources
 *
 * Optional metadata that can be included with audio content to provide
 * additional context about the audio file characteristics.
 *
 * @example
 * ```typescript
 * const metadata: IAudioMetadata = {
 *   duration: 120.5,
 *   sampleRate: 44100,
 *   channels: 2,
 *   bitrate: 320,
 *   codec: 'mp3',
 *   size: 5242880,
 *   originalPath: '/path/to/audio.mp3'
 * };
 * ```
 *
 * @since v4.2.0
 */
export interface IAudioMetadata {
  /**
   * Audio duration in seconds
   *
   * @example 120.5 // 2 minutes 0.5 seconds
   */
  duration?: number;

  /**
   * Sample rate in Hz
   *
   * Common values:
   * - 8000 (telephone quality)
   * - 22050 (radio quality)
   * - 44100 (CD quality)
   * - 48000 (professional audio)
   * - 96000 (high-resolution audio)
   *
   * @example 44100
   */
  sampleRate?: number;

  /**
   * Number of audio channels
   *
   * Common values:
   * - 1 (mono)
   * - 2 (stereo)
   * - 6 (5.1 surround)
   * - 8 (7.1 surround)
   *
   * @example 2
   */
  channels?: number;

  /**
   * Bitrate in kbps (kilobits per second)
   *
   * Common values:
   * - 128 (standard quality)
   * - 192 (high quality)
   * - 256 (very high quality)
   * - 320 (maximum MP3 quality)
   *
   * @example 320
   */
  bitrate?: number;

  /**
   * Audio codec identifier
   *
   * Common codecs:
   * - 'mp3' (MPEG Audio Layer 3)
   * - 'aac' (Advanced Audio Coding)
   * - 'opus' (Opus Interactive Audio Codec)
   * - 'flac' (Free Lossless Audio Codec)
   * - 'wav' (Waveform Audio File Format - uncompressed)
   * - 'vorbis' (Ogg Vorbis)
   *
   * @example 'mp3'
   */
  codec?: string;

  /**
   * File size in bytes
   *
   * @example 5242880 // 5 MB
   */
  size?: number;

  /**
   * Original file path (if loaded from file)
   *
   * Useful for debugging and tracking the source of the audio data.
   *
   * @example '/path/to/audio.mp3'
   */
  originalPath?: string;
}

/**
 * Audio content for Interface-Driven API resources
 *
 * Represents audio data in base64 encoding with MIME type information.
 * Use this interface as the `value` type for static audio resources or
 * the `returns` type for dynamic audio resources.
 *
 * The framework provides `createAudioContent()` helper from 'simply-mcp/core'
 * to simplify creating audio content from files or buffers.
 *
 * @example Static Audio Resource
 * ```typescript
 * interface AudioSampleResource extends IResource {
 *   uri: 'audio://sample';
 *   name: 'Audio Sample';
 *   description: 'Example audio file';
 *   mimeType: 'audio/wav';
 *   value: IAudioContent;
 * }
 *
 * export default class MyServer {
 *   'audio://sample': AudioSampleResource = {
 *     type: 'audio',
 *     data: 'UklGRiQAAABXQVZFZm10IBAAAAABAAEA...',
 *     mimeType: 'audio/wav',
 *     metadata: {
 *       duration: 5.0,
 *       sampleRate: 44100,
 *       channels: 2
 *     }
 *   };
 * }
 * ```
 *
 * @example Dynamic Audio Resource
 * ```typescript
 * import { createAudioContent } from 'simply-mcp/core';
 *
 * interface DynamicAudioResource extends IResource {
 *   uri: 'audio://dynamic';
 *   name: 'Dynamic Audio';
 *   description: 'Audio loaded from file';
 *   mimeType: 'audio/mp3';
 *   returns: IAudioContent;
 * }
 *
 * export default class MyServer {
 *   'audio://dynamic' = async () => {
 *     return await createAudioContent('./audio/sample.mp3');
 *   };
 * }
 * ```
 *
 * @example With Metadata
 * ```typescript
 * const audioContent: IAudioContent = {
 *   type: 'audio',
 *   data: 'base64-encoded-audio-data',
 *   mimeType: 'audio/mpeg',
 *   metadata: {
 *     duration: 180.5,
 *     sampleRate: 48000,
 *     channels: 2,
 *     bitrate: 320,
 *     codec: 'mp3'
 *   }
 * };
 * ```
 *
 * @since v4.2.0
 */
export interface IAudioContent {
  /**
   * Content type discriminator
   *
   * Must always be 'audio' to identify this as audio content.
   */
  type: 'audio';

  /**
   * Base64-encoded audio data
   *
   * The audio file content encoded as a base64 string. This allows
   * binary audio data to be transmitted as text in JSON.
   *
   * @example 'UklGRiQAAABXQVZFZm10IBAAAAABAAEA...'
   */
  data: string;

  /**
   * Audio MIME type
   *
   * Specifies the format of the audio data. The framework supports
   * standard audio formats with specific literal types for common formats
   * and a fallback string type for custom or less common formats.
   *
   * Common MIME types:
   * - 'audio/mpeg' - MP3 audio
   * - 'audio/wav' - WAV audio (uncompressed)
   * - 'audio/ogg' - Ogg Vorbis audio
   * - 'audio/webm' - WebM audio
   * - 'audio/mp4' - M4A/MP4 audio
   * - 'audio/aac' - AAC audio
   * - 'audio/flac' - FLAC audio (lossless)
   *
   * Custom formats can use any valid audio MIME type string.
   *
   * @example 'audio/mpeg'
   * @example 'audio/wav'
   * @example 'audio/flac'
   */
  mimeType: 'audio/mpeg' | 'audio/wav' | 'audio/ogg' | 'audio/webm' | 'audio/mp4' | 'audio/aac' | 'audio/flac' | string;

  /**
   * Optional audio metadata
   *
   * Additional information about the audio content such as duration,
   * sample rate, channels, bitrate, codec, file size, and original path.
   *
   * The `createAudioContent()` helper automatically populates some
   * metadata fields like `size` and `originalPath`.
   *
   * @example
   * ```typescript
   * {
   *   duration: 120.5,
   *   sampleRate: 44100,
   *   channels: 2,
   *   bitrate: 320,
   *   codec: 'mp3',
   *   size: 5242880
   * }
   * ```
   */
  metadata?: IAudioMetadata;
}
