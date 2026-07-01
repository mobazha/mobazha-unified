/**
 * next/image 兼容层
 * 将 Next.js 的 Image 组件映射到普通 img 标签
 */
import { forwardRef, type ImgHTMLAttributes, type CSSProperties } from 'react';

interface ImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'width' | 'height'> {
  src: string | { src: string; height?: number; width?: number };
  alt: string;
  width?: number | string;
  height?: number | string;
  fill?: boolean;
  priority?: boolean;
  quality?: number;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
  loader?: (props: { src: string; width: number; quality?: number }) => string;
  unoptimized?: boolean;
  sizes?: string;
}

const Image = forwardRef<HTMLImageElement, ImageProps>(
  (
    {
      src,
      alt,
      width,
      height,
      fill,
      priority,
      quality: _quality,
      placeholder: _placeholder,
      blurDataURL: _blurDataURL,
      loader: _loader,
      unoptimized: _unoptimized,
      sizes: _sizes,
      style,
      className,
      ...props
    },
    ref
  ) => {
    // 处理 src 对象
    const imgSrc = typeof src === 'object' ? src.src : src;
    const imgWidth = typeof src === 'object' ? src.width : width;
    const imgHeight = typeof src === 'object' ? src.height : height;

    // 构建样式
    const imageStyle: CSSProperties = fill
      ? {
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          ...style,
        }
      : style || {};

    return (
      <img
        ref={ref}
        src={imgSrc}
        alt={alt}
        width={imgWidth}
        height={imgHeight}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        style={imageStyle}
        className={className}
        {...props}
      />
    );
  }
);

Image.displayName = 'Image';

export default Image;
