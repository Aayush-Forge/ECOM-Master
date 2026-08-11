'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { currentUser } from '@/lib/mock-user'
import { 
  SidebarProvider, 
  Sidebar, 
  SidebarContent, 
  SidebarHeader, 
  SidebarMenu, 
  SidebarMenuItem, 
  SidebarMenuButton, 
  SidebarGroup, 
  SidebarGroupLabel, 
  SidebarGroupContent, 
  SidebarInset, 
  SidebarTrigger, 
  SidebarRail, 
  SidebarFooter 
} from '@/components/ui/sidebar'
import { ClipboardList, CreditCard, Store } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import Link from 'next/link'

export default function StaffLayout({ children }) {
  const router = useRouter()
  const pathname = usePathname()
  const [authorized, setAuthorized] = useState(false)

  useEffect(() => {
    if (currentUser.role !== 'employee' && currentUser.role !== 'admin') {
      router.push('/account/orders')
    } else {
      setAuthorized(true)
    }
  }, [router])

  if (!authorized) return null

  return (
    <SidebarProvider>
      <Sidebar className="bg-[#0D0D0D] text-gray-300 border-r-0 border-gray-800 font-inter">
        <SidebarHeader className="flex flex-row items-center justify-between p-4 bg-[#0D0D0D]">
          <span className="font-display text-xl text-white">Sridattam</span>
          <Badge variant="outline" className="bg-gray-800 text-white border-gray-700 capitalize">
            {currentUser.role}
          </Badge>
        </SidebarHeader>
        <SidebarContent className="bg-[#0D0D0D]">
          <SidebarGroup>
            <SidebarGroupLabel className="text-gray-500 uppercase text-xs">Operations</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    asChild 
                    isActive={pathname.startsWith('/staff/orders')} 
                    className="data-[active=true]:bg-saffron/10 data-[active=true]:text-saffron hover:bg-gray-800 hover:text-white transition-colors"
                  >
                    <Link href="/staff/orders">
                      <ClipboardList className="mr-2 h-4 w-4" /> 
                      Orders
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    asChild 
                    isActive={pathname.startsWith('/staff/payments')} 
                    className="data-[active=true]:bg-saffron/10 data-[active=true]:text-saffron hover:bg-gray-800 hover:text-white transition-colors"
                  >
                    <Link href="/staff/payments">
                      <CreditCard className="mr-2 h-4 w-4" /> 
                      Payments
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="p-4 bg-[#0D0D0D]">
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-white px-2">{currentUser.name}</p>
            <SidebarMenuButton asChild className="bg-gray-800/80 text-white border border-gray-700 hover:bg-gray-700 hover:text-white font-semibold">
              <Link href="/">
                <Store className="mr-2 h-4 w-4 text-saffron" /> 
                <span className="text-white font-semibold">Back to Store</span>
              </Link>
            </SidebarMenuButton>
          </div>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SidebarInset className="bg-gray-50">
        <header className="flex h-14 items-center gap-2 border-b bg-white px-4">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-4" />
          <h2 className="font-semibold font-inter text-gray-900">Staff Panel</h2>
        </header>
        <main className="p-6 flex-1 min-h-[calc(100vh-3.5rem)] font-inter text-gray-900">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
