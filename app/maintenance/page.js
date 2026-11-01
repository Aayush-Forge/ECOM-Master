import Link from 'next/link';

async function getMaintenanceData() {
  try {
    const backendUrl =
      process.env.INTERNAL_BACKEND_URL ||
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      'http://localhost:5000';

    const res = await fetch(`${backendUrl}/site-status`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(2000),
    });

    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Graceful fallback
  }

  return { isMaintenance: true, message: null };
}

export const metadata = {
  title: 'Under Maintenance | Sridattam',
  robots: {
    index: false,
    follow: false,
  },
};

export default async function MaintenancePage() {
  const data = await getMaintenanceData();
  const notice =
    data?.message ||
    'We are currently performing routine catalog maintenance and upgrades to serve you better. We will be back online shortly.';

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4 py-16">
      <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl p-8 sm:p-10 text-center border border-stone-200">
        <div className="mx-auto w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 mb-6">
          <svg
            className="w-8 h-8"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900 tracking-tight mb-4">
          Under Maintenance
        </h1>

        <div className="bg-stone-50 border border-stone-200/80 rounded-xl p-4 mb-6 text-stone-700 text-sm sm:text-base leading-relaxed whitespace-pre-line text-left">
          {notice}
        </div>

        <p className="text-xs text-stone-500 mb-6">
          Existing in-flight orders and payments are unaffected. Thank you for your patience!
        </p>

        <div className="pt-4 border-t border-stone-100 flex items-center justify-center gap-4 text-xs text-stone-500">
          <span>&copy; {new Date().getFullYear()} Sridattam</span>
        </div>
      </div>
    </div>
  );
}
