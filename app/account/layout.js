'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { currentUser } from '@/lib/mock-user';
import { cn } from '@/lib/utils';
import { ArrowLeft, User } from 'lucide-react';

export default function AccountLayout({ children }) {
  const pathname = usePathname();

  const navLinks = [
    { name: 'Orders', href: '/account/orders' },
    { name: 'Profile', href: '/account/profile' },
    { name: 'Addresses', href: '/account/addresses' },
  ];

  const isAccountHome = pathname === '/account';

  return (
    <div className="relative z-10 min-h-screen bg-[#FAF7F2] text-stone-900 font-body">
      {/* Top Nav Bar */}
      <header className="bg-white border-b border-stone-200/80 shadow-2xs sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 gap-4">
            
            {/* Left: Back to Store + Clickable "My Account" */}
            <div className="flex items-center gap-3 sm:gap-5">
              <Link
                href="/"
                className="inline-flex items-center text-xs sm:text-sm font-inter text-stone-600 hover:text-saffron transition-colors font-medium shrink-0"
              >
                <ArrowLeft className="w-4 h-4 mr-1.5 shrink-0" />
                <span className="hidden sm:inline">Back to Store</span>
                <span className="sm:hidden">Store</span>
              </Link>

              <div className="h-4 w-px bg-stone-200 shrink-0" />

              <Link
                href="/account"
                className={cn(
                  'text-base sm:text-lg font-display font-bold tracking-tight transition-colors shrink-0',
                  isAccountHome ? 'text-saffron' : 'text-stone-900 hover:text-saffron'
                )}
              >
                My Account
              </Link>
            </div>

            {/* Middle: Navigation Links */}
            <nav className="flex space-x-1 sm:space-x-4">
              {navLinks.map((link) => {
                const isActive = pathname.startsWith(link.href);
                return (
                  <Link
                    key={link.name}
                    href={link.href}
                    className={cn(
                      'inline-flex items-center px-2.5 sm:px-3.5 py-1.5 text-xs sm:text-sm font-inter font-medium rounded-lg transition-colors',
                      isActive
                        ? 'bg-saffron/10 text-saffron font-semibold'
                        : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                    )}
                  >
                    {link.name}
                  </Link>
                );
              })}
            </nav>

            {/* Right: User Name Badge */}
            <div className="flex items-center shrink-0">
              <div className="flex items-center gap-2 bg-stone-100/80 px-3 py-1.5 rounded-full border border-stone-200/60">
                <User className="w-3.5 h-3.5 text-stone-600" />
                <span className="text-xs sm:text-sm font-inter text-stone-800 font-medium hidden md:inline truncate max-w-[120px]">
                  {currentUser?.name || 'User'}
                </span>
              </div>
            </div>

          </div>
        </div>
      </header>

      {/* Main Content Container with Uniform Max-Width */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
