/**
 * Next.js 兼容层导出
 */

// next/link
export { default as Link } from './link';

// next/navigation
export {
  useRouter,
  useParams,
  useSearchParams,
  usePathname,
  redirect,
  notFound,
} from './navigation';

// next/image
export { default as Image } from './image';
