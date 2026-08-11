'use client';

import Link from 'next/link';
import { currentUser } from '@/lib/mock-user';
import { getMyOrdersSync } from '@/lib/api/orders';
import { getAddressesSync } from '@/lib/api/addresses';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, Package, MapPin, ArrowRight } from 'lucide-react';

export default function AccountLandingPage() {
  const orders = getMyOrdersSync() || [];
  const addresses = getAddressesSync() || [];

  const defaultAddress = addresses.find((a) => a.isDefault) || addresses[0];
  const latestOrder = orders[0];
  const firstName = currentUser?.name ? currentUser.name.split(' ')[0] : 'Aayush';

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Minimal Header */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-stone-900 tracking-tight">
          Welcome back, {firstName}
        </h1>
        <p className="text-sm font-inter text-stone-500">
          Manage your account and orders.
        </p>
      </div>

      {/* 3 Minimal Cards Grid with Uniform Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Profile */}
        <Card className="bg-white border border-stone-200/80 shadow-2xs hover:border-stone-300 transition-all rounded-xl overflow-hidden flex flex-col justify-between">
          <CardContent className="p-6 space-y-6 flex-1 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-stone-100 text-stone-700">
                  <User className="w-5 h-5" />
                </div>
                <h2 className="font-display font-bold text-lg text-stone-900">
                  Profile
                </h2>
              </div>

              <div className="space-y-2 text-sm font-inter pt-2 border-t border-stone-100">
                <div>
                  <span className="text-xs text-stone-400 block font-medium">Name</span>
                  <span className="font-semibold text-stone-900">{currentUser?.name || 'Aayush Sharma'}</span>
                </div>
                <div>
                  <span className="text-xs text-stone-400 block font-medium">Email</span>
                  <span className="text-stone-700 font-medium truncate block">{currentUser?.email || 'aayush@sridattam.com'}</span>
                </div>
                <div>
                  <span className="text-xs text-stone-400 block font-medium">Phone</span>
                  <span className="text-stone-700 font-medium">{currentUser?.phone || '+91 98765 43210'}</span>
                </div>
              </div>
            </div>

            <Button
              asChild
              variant="outline"
              className="w-full font-inter font-semibold text-xs border-stone-200 text-stone-800 hover:bg-stone-50 hover:text-stone-900 mt-4"
            >
              <Link href="/account/profile" className="flex items-center justify-center gap-1.5">
                Edit Profile <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Card 2: Orders */}
        <Card className="bg-white border border-stone-200/80 shadow-2xs hover:border-stone-300 transition-all rounded-xl overflow-hidden flex flex-col justify-between">
          <CardContent className="p-6 space-y-6 flex-1 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-stone-100 text-stone-700">
                  <Package className="w-5 h-5" />
                </div>
                <h2 className="font-display font-bold text-lg text-stone-900">
                  Orders
                </h2>
              </div>

              <div className="space-y-2 text-sm font-inter pt-2 border-t border-stone-100">
                <div>
                  <span className="text-xs text-stone-400 block font-medium">Total Orders</span>
                  <span className="font-semibold text-stone-900">{orders.length} orders placed</span>
                </div>
                {latestOrder ? (
                  <div>
                    <span className="text-xs text-stone-400 block font-medium">Latest Order</span>
                    <span className="text-stone-700 font-medium capitalize block">
                      #{latestOrder.orderNumber || latestOrder.id} • {latestOrder.status}
                    </span>
                  </div>
                ) : (
                  <div>
                    <span className="text-xs text-stone-400 block font-medium">Latest Order</span>
                    <span className="text-stone-500 font-medium">No orders yet</span>
                  </div>
                )}
              </div>
            </div>

            <Button
              asChild
              variant="outline"
              className="w-full font-inter font-semibold text-xs border-stone-200 text-stone-800 hover:bg-stone-50 hover:text-stone-900 mt-4"
            >
              <Link href="/account/orders" className="flex items-center justify-center gap-1.5">
                View Orders <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Card 3: Addresses */}
        <Card className="bg-white border border-stone-200/80 shadow-2xs hover:border-stone-300 transition-all rounded-xl overflow-hidden flex flex-col justify-between">
          <CardContent className="p-6 space-y-6 flex-1 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-stone-100 text-stone-700">
                  <MapPin className="w-5 h-5" />
                </div>
                <h2 className="font-display font-bold text-lg text-stone-900">
                  Addresses
                </h2>
              </div>

              <div className="space-y-2 text-sm font-inter pt-2 border-t border-stone-100">
                <div>
                  <span className="text-xs text-stone-400 block font-medium">Saved Addresses</span>
                  <span className="font-semibold text-stone-900">{addresses.length} saved</span>
                </div>
                {defaultAddress ? (
                  <div>
                    <span className="text-xs text-stone-400 block font-medium">Default Address</span>
                    <span className="text-stone-700 font-medium truncate block">
                      {defaultAddress.line1 || defaultAddress.addressLine1}, {defaultAddress.city}
                    </span>
                  </div>
                ) : (
                  <div>
                    <span className="text-xs text-stone-400 block font-medium">Default Address</span>
                    <span className="text-stone-500 font-medium">No address set</span>
                  </div>
                )}
              </div>
            </div>

            <Button
              asChild
              variant="outline"
              className="w-full font-inter font-semibold text-xs border-stone-200 text-stone-800 hover:bg-stone-50 hover:text-stone-900 mt-4"
            >
              <Link href="/account/addresses" className="flex items-center justify-center gap-1.5">
                Manage Addresses <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
