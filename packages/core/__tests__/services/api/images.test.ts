/**
 * 图片上传 API 单元测试
 */

import { describe, it, expect } from 'vitest';
import * as imagesApi from '../../../services/api/images';

describe('Images API', () => {
  describe('API Exports', () => {
    it('should export uploadProductImages function', () => {
      expect(typeof imagesApi.uploadProductImages).toBe('function');
    });

    it('should export uploadImage function', () => {
      expect(typeof imagesApi.uploadImage).toBe('function');
    });

    it('should export uploadAvatarImage function', () => {
      expect(typeof imagesApi.uploadAvatarImage).toBe('function');
    });

    it('should export uploadHeaderImage function', () => {
      expect(typeof imagesApi.uploadHeaderImage).toBe('function');
    });

    it('should export fileToBase64 utility function', () => {
      expect(typeof imagesApi.fileToBase64).toBe('function');
    });
  });

  describe('imageFromUploadResponse', () => {
    it('maps /v1/media/images { hash } to Image with all sizes set to CID', () => {
      const img = imagesApi.imageFromUploadResponse({
        name: 'evidence.png',
        hash: 'QmEvidenceCid123',
      });
      expect(img?.small).toBe('QmEvidenceCid123');
      expect(img?.original).toBe('QmEvidenceCid123');
    });

    it('passes through full Image from product-images', () => {
      const img = imagesApi.imageFromUploadResponse({
        tiny: 'QmT',
        small: 'QmS',
        medium: 'QmM',
        large: 'QmL',
        original: 'QmO',
      });
      expect(img?.small).toBe('QmS');
    });
  });

  describe('fileToBase64', () => {
    it('should be a function that returns a Promise', () => {
      // 创建一个简单的 mock File
      const mockFile = new File(['test content'], 'test.txt', {
        type: 'text/plain',
      });

      const result = imagesApi.fileToBase64(mockFile);
      expect(result).toBeInstanceOf(Promise);
    });
  });
});
