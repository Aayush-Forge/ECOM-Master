// app/admin/layout.js
'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { getRedirectForRole, ROLE_NAV_ITEMS, getRoleLabel } from '@/lib/roles'
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarInset,
  SidebarTrigger,
  SidebarRail,
} from '@/components/ui/sidebar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  LayoutDashboard,
  ClipboardList,
  CreditCard,
  Package,
  Tags,
  Users,
  ScrollText,
  LogOut,
  MapPin,
  User,
} from 'lucide-react'

// Map icon string names from ROLE_NAV_ITEMS to actual Lucide components
const ICON_MAP = {
  LayoutDashboard,
  ClipboardList,
  CreditCard,
  Package,
  Tags,
  Users,
  ScrollText,
  MapPin,
  User,
}

export default function AdminLayout({ children }) {
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

  // Get nav items from single source of truth
  const navItems = ROLE_NAV_ITEMS[user.role] || []
  
  // Group nav items by their group property
  const groups = {}
  navItems.forEach(item => {
    const group = item.group || 'General'
    if (!groups[group]) groups[group] = []
    groups[group].push(item)
  })

  return (
    <SidebarProvider>
      <Sidebar className="bg-midnight text-cream border-r-0">
        <SidebarHeader className="p-4 bg-midnight">
          <div className="flex items-center gap-2">
            <div className="bg-saffron text-white p-1 rounded">
              <LayoutDashboard size={20} />
            </div>
            <span className="font-display text-xl text-saffron tracking-wider">Aayush Forge</span>
          </div>
        </SidebarHeader>
        
        <SidebarContent className="bg-midnight text-gray-300">
          {Object.entries(groups).map(([groupName, items]) => (
            <SidebarGroup key={groupName}>
              <SidebarGroupLabel className="text-gray-500 font-inter text-xs">{groupName}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {items.map(item => {
                    const IconComponent = ICON_MAP[item.icon] || LayoutDashboard
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton 
                          asChild 
                          isActive={pathname.startsWith(item.href)}
                          className="data-[active=true]:bg-saffron/20 data-[active=true]:text-saffron hover:bg-gray-800 hover:text-white"
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

        <SidebarFooter className="p-4 bg-midnight border-t border-gray-800">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-saffron flex items-center justify-center text-white font-bold">
                {(user?.name || 'A').charAt(0)}
              </div>
              <div className="flex flex-col flex-1 overflow-hidden">
                <span className="text-sm font-medium text-cream truncate">{user?.name || 'Admin'}</span>
                <span className="text-xs text-gray-400 truncate">{user?.email || ''}</span>
              </div>
              <Badge variant="outline" className="bg-saffron/20 text-saffron border-saffron/30">
                {getRoleLabel(user?.role || 'admin')}
              </Badge>
            </div>
            <Button variant="outline" className="w-full justify-start text-white bg-gray-800/80 border-gray-700 hover:bg-gray-700 hover:text-white font-semibold" asChild>
              <Link href="/">
                <LogOut className="mr-2 h-4 w-4 text-saffron" />
                <span className="text-white font-semibold">Back to Store</span>
              </Link>
            </Button>
          </div>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset className="bg-gray-50">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-white px-4 shadow-sm">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-6" />
          <h1 className="font-display text-lg">
            {user?.role === 'admin' ? 'Admin Management Panel' : 'Editor & Catalog Panel'}
          </h1>
        </header>
        <main className="flex-1 overflow-auto p-6 font-inter bg-gray-50 text-slate-900">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
