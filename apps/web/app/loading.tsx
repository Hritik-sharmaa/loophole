import { PageLoader } from '@/components/page-loader';

// Shown while the next page's code loads, for every route.
export default function Loading() {
  return <PageLoader fill />;
}
