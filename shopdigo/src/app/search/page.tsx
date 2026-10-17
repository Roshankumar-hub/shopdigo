import { Suspense } from 'react';
import SearchClient from './SearchClient';
import { Loading } from '@/components/ui';

export const metadata = { title: 'Search & Browse' };

export default function SearchPage() {
  return <Suspense fallback={<Loading />}><SearchClient /></Suspense>;
}
