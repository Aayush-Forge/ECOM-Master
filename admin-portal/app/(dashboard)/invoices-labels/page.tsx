'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function InvoicesLabelsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/orders');
  }, [router]);

  return (
    <div className="flex h-[50vh] items-center justify-center text-sm text-stone-500">
      Redirecting to Orders &amp; Fulfillment...
    </div>
  );
}
