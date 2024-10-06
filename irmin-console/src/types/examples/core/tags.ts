import { Tag } from '@/types/core/Tag';

/**
 * Example tags for testing
 * {@link Tag}
 */
export const tags: () => Tag[] = () => [
  {
    name: 'v1-release',
    ref: '03053df277a5ab5bc574c2b458954c0c0c930413e7964e51aa029059068713ce',
  },
  {
    name: 'v1.1-release',
    ref: '87790dad5cae2da0965bb273c5dd280db4c10f12fbce4c6a342b8d4f4672a1e5',
  },
  {
    name: 'v2-preview',
    ref: '85cb9fcfc9227d1f49f6935e418cb92f23f514338a132ee5a1856c0863c7cfca',
  },
];
