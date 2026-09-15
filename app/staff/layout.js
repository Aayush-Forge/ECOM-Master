'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { getRedirectForRole, ROLE_NAV_ITEMS, getRoleLabel } from '@/lib/roles'
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
import {
  LayoutDashboard,
  ClipboardList,
  CreditCard,
  Package,
  Tags,
  Store,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import Link from 'next/link'

const ICON_MAP = {
  LayoutDashboard,
  ClipboardList,
  CreditCard,
  Package,
  Tags,
}

export default function StaffLayout({ children }) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, isAuthenticated, loading } = useAuth()
  const [authorized, setAuthorized] = useState(false)

  useEffect(() => {
    if (loading) return

    if (!isAuthenticated || !user?.role) {
      router.push('/login')
      return
    }

    // Use centralized guard logic from roles.js
    const redirect = getRedirectForRole(user.role, pathname)
    if (redirect) {
      router.push(redirect)
      return
    }

    setAuthorized(true)
  }, [loading, isAuthenticated, user, pathname, router])

  if (!authorized || loading) return null

  const navItems = ROLE_NAV_ITEMS[user.role] || []

  // Group nav items by their group property (Overview, Operations, Catalog)
  const groups = {}
  navItems.forEach(item => {
    const group = item.group || 'Operations'
    if (!groups[group]) groups[group] = []
    groups[group].push(item)
  })

  return (
    <SidebarProvider>
      <Sidebar className="bg-[#0D0D0D] text-gray-300 border-r-0 border-gray-800 font-inter">
        <SidebarHeader className="flex flex-row items-center justify-between p-4 bg-[#0D0D0D]">
          <span className="font-display text-xl text-white">Sridattam</span>
          <Badge variant="outline" className="bg-gray-800 text-white border-gray-700 font-medium text-xs">
            {getRoleLabel(user?.role || 'read_only')}
          </Badge>
        </SidebarHeader>
        <SidebarContent className="bg-[#0D0D0D]">
          {Object.entries(groups).map(([groupName, items]) => (
            <SidebarGroup key={groupName}>
              <SidebarGroupLabel className="text-gray-500 uppercase text-xs">{groupName}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {items.map(item => {
                    const IconComponent = ICON_MAP[item.icon] || ClipboardList
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton 
                          asChild 
                          isActive={pathname.startsWith(item.href)} 
                          className="data-[active=true]:bg-saffron/10 data-[active=true]:text-saffron hover:bg-gray-800 hover:text-white transition-colors"
                        >
                          <Link href={item.href}>
                            <IconComponent className="mr-2 h-4 w-4" /> 
                            <span>{item.label}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>
        <SidebarFooter className="p-4 bg-[#0D0D0D]">
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-white px-2">{user?.name || 'Staff'}</p>
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
          <h2 className="font-semibold font-inter text-gray-900">
            {user?.role === 'editor' ? 'Editor & Catalog Panel' : 'Staff Operations Panel'}
          </h2>
        </header>
        <main className="p-6 flex-1 min-h-[calc(100vh-3.5rem)] font-inter text-gray-900">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
