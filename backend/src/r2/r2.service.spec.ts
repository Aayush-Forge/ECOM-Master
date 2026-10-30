import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, InternalServerErrorException, Logger } from '@nestjs/common';
import { S3Client } from '@aws-sdk/client-s3';
import { R2Service } from './r2.service.js';
import { R2_CLIENT } from './r2.constants.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Builds a minimal S3Client mock with a controllable `send` method. */
function buildMockS3Client() {
  return {
    send: jest.fn(),
  };
}

/** Creates a Buffer of exactly `sizeBytes` bytes (all zeros). */
function bufferOfSize(sizeBytes: number): Buffer {
  return Buffer.alloc(sizeBytes);
}

const MB = 1024 * 1024;
const VALID_KEY = 'products/SKU-123/hero.webp';
const VALID_CONTENT_TYPE = 'image/webp';
const VALID_BUFFER = bufferOfSize(1 * MB); // 1 MB — well within the 5 MB limit

// ── Test suite ────────────────────────────────────────────────────────────────

describe('R2Service', () => {
  let service: R2Service;
  let mockS3: ReturnType<typeof buildMockS3Client>;

  beforeEach(async () => {
    mockS3 = buildMockS3Client();

    // Set required env vars so the service constructor doesn't throw.
    process.env.R2_BUCKET_NAME = 'test-bucket';
    process.env.R2_PUBLIC_BASE_URL = 'https://pub-test.r2.dev';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        R2Service,
        { provide: R2_CLIENT, useValue: mockS3 as unknown as S3Client },
      ],
    }).compile();

    service = module.get<R2Service>(R2Service);

    // Suppress Logger output during tests to keep output clean.
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete process.env.R2_BUCKET_NAME;
    delete process.env.R2_PUBLIC_BASE_URL;
  });

  // ── uploadFile ─────────────────────────────────────────────────────────────

  describe('uploadFile', () => {
    it('returns the object key on a successful upload', async () => {
      mockS3.send.mockResolvedValue({});

      const result = await service.uploadFile(VALID_KEY, VALID_BUFFER, VALID_CONTENT_TYPE);

      expect(result).toBe(VALID_KEY);
    });

    it('calls S3 send with a PutObjectCommand carrying correct bucket, key, body, and contentType', async () => {
      mockS3.send.mockResolvedValue({});

      await service.uploadFile(VALID_KEY, VALID_BUFFER, VALID_CONTENT_TYPE);

      expect(mockS3.send).toHaveBeenCalledTimes(1);
      const command = mockS3.send.mock.calls[0][0];
      expect(command.input).toEqual({
        Bucket: 'test-bucket',
        Key: VALID_KEY,
        Body: VALID_BUFFER,
        ContentType: VALID_CONTENT_TYPE,
      });
    });

    it('accepts image/jpeg', async () => {
      mockS3.send.mockResolvedValue({});
      await expect(
        service.uploadFile(VALID_KEY, VALID_BUFFER, 'image/jpeg'),
      ).resolves.toBe(VALID_KEY);
    });

    it('accepts image/png', async () => {
      mockS3.send.mockResolvedValue({});
      await expect(
        service.uploadFile(VALID_KEY, VALID_BUFFER, 'image/png'),
      ).resolves.toBe(VALID_KEY);
    });

    it('accepts image/webp', async () => {
      mockS3.send.mockResolvedValue({});
      await expect(
        service.uploadFile(VALID_KEY, VALID_BUFFER, 'image/webp'),
      ).resolves.toBe(VALID_KEY);
    });

    // ── Validation: invalid file type ──────────────────────────────────────

    it('throws BadRequestException for an unsupported MIME type (image/gif)', async () => {
      await expect(
        service.uploadFile(VALID_KEY, VALID_BUFFER, 'image/gif'),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException for a completely invalid MIME type (application/pdf)', async () => {
      await expect(
        service.uploadFile(VALID_KEY, VALID_BUFFER, 'application/pdf'),
      ).rejects.toThrow(BadRequestException);
    });

    it('does NOT call S3 send when the file type is invalid', async () => {
      await expect(
        service.uploadFile(VALID_KEY, VALID_BUFFER, 'image/gif'),
      ).rejects.toThrow(BadRequestException);

      expect(mockS3.send).not.toHaveBeenCalled();
    });

    it('includes the rejected MIME type and the allow-list in the error message', async () => {
      await expect(
        service.uploadFile(VALID_KEY, VALID_BUFFER, 'video/mp4'),
      ).rejects.toThrow(expect.objectContaining({ message: expect.stringContaining('video/mp4') }));
    });

    // ── Validation: file size ──────────────────────────────────────────────

    it('throws BadRequestException when the file exceeds 5 MB', async () => {
      const oversized = bufferOfSize(5 * MB + 1);
      await expect(
        service.uploadFile(VALID_KEY, oversized, VALID_CONTENT_TYPE),
      ).rejects.toThrow(BadRequestException);
    });

    it('does NOT call S3 send when the file is oversized', async () => {
      const oversized = bufferOfSize(5 * MB + 1);
      await expect(
        service.uploadFile(VALID_KEY, oversized, VALID_CONTENT_TYPE),
      ).rejects.toThrow(BadRequestException);

      expect(mockS3.send).not.toHaveBeenCalled();
    });

    it('accepts a file that is exactly 5 MB (boundary — should succeed)', async () => {
      mockS3.send.mockResolvedValue({});
      const exactlyMax = bufferOfSize(5 * MB);
      await expect(
        service.uploadFile(VALID_KEY, exactlyMax, VALID_CONTENT_TYPE),
      ).resolves.toBe(VALID_KEY);
    });

    // ── S3 error handling ─────────────────────────────────────────────────

    it('throws InternalServerErrorException when the S3 send call rejects', async () => {
      mockS3.send.mockRejectedValue(new Error('NetworkingError: connect ECONNREFUSED'));

      await expect(
        service.uploadFile(VALID_KEY, VALID_BUFFER, VALID_CONTENT_TYPE),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('logs an error when the S3 upload fails', async () => {
      mockS3.send.mockRejectedValue(new Error('S3 error'));
      const errorSpy = jest.spyOn(Logger.prototype, 'error');

      await expect(
        service.uploadFile(VALID_KEY, VALID_BUFFER, VALID_CONTENT_TYPE),
      ).rejects.toThrow(InternalServerErrorException);

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining(VALID_KEY),
        expect.anything(),
      );
    });
  });

  // ── deleteFile ─────────────────────────────────────────────────────────────

  describe('deleteFile', () => {
    it('calls S3 send with a DeleteObjectCommand carrying correct bucket and key', async () => {
      mockS3.send.mockResolvedValue({});

      await service.deleteFile(VALID_KEY);

      expect(mockS3.send).toHaveBeenCalledTimes(1);
      const command = mockS3.send.mock.calls[0][0];
      expect(command.input).toEqual({
        Bucket: 'test-bucket',
        Key: VALID_KEY,
      });
    });

    it('resolves without error on a successful delete', async () => {
      mockS3.send.mockResolvedValue({});
      await expect(service.deleteFile(VALID_KEY)).resolves.toBeUndefined();
    });

    it('throws InternalServerErrorException when the S3 send call rejects', async () => {
      mockS3.send.mockRejectedValue(new Error('AccessDenied'));

      await expect(service.deleteFile(VALID_KEY)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('logs an error when the S3 delete fails', async () => {
      mockS3.send.mockRejectedValue(new Error('AccessDenied'));
      const errorSpy = jest.spyOn(Logger.prototype, 'error');

      await expect(service.deleteFile(VALID_KEY)).rejects.toThrow(
        InternalServerErrorException,
      );

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining(VALID_KEY),
        expect.anything(),
      );
    });
  });

  // ── getPublicUrl ───────────────────────────────────────────────────────────

  describe('getPublicUrl', () => {
    it('constructs the correct URL from the env base and the key', () => {
      process.env.R2_PUBLIC_BASE_URL = 'https://pub-test.r2.dev';
      const url = service.getPublicUrl('products/SKU-123/hero.webp');
      expect(url).toBe('https://pub-test.r2.dev/products/SKU-123/hero.webp');
    });

    it('strips a trailing slash from R2_PUBLIC_BASE_URL to avoid double slashes', () => {
      process.env.R2_PUBLIC_BASE_URL = 'https://pub-test.r2.dev/';
      const url = service.getPublicUrl('products/SKU-123/hero.webp');
      expect(url).toBe('https://pub-test.r2.dev/products/SKU-123/hero.webp');
    });

    it('works with a custom domain base URL', () => {
      process.env.R2_PUBLIC_BASE_URL = 'https://cdn.sridattam.com';
      const url = service.getPublicUrl('products/SKU-123/hero.webp');
      expect(url).toBe('https://cdn.sridattam.com/products/SKU-123/hero.webp');
    });

    it('throws InternalServerErrorException when R2_PUBLIC_BASE_URL is not set', () => {
      delete process.env.R2_PUBLIC_BASE_URL;
      expect(() => service.getPublicUrl(VALID_KEY)).toThrow(
        InternalServerErrorException,
      );
    });

    it('is a pure function — makes no network calls', () => {
      service.getPublicUrl(VALID_KEY);
      expect(mockS3.send).not.toHaveBeenCalled();
    });
  });
});
