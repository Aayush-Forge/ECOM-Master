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
  FolderTree,
  Tags,
  Users,
  ScrollText,
  LogOut,
  ExternalLink,
  MapPin,
  User,
} from 'lucide-react'

// Map icon string names from ROLE_NAV_ITEMS to actual Lucide components
const ICON_MAP = {
  LayoutDashboard,
  ClipboardList,
  CreditCard,
  Package,
  FolderTree,
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
  const [isSubdomain, setIsSubdomain] = useState(false)
  const [storefrontUrl, setStorefrontUrl] = useState('/')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const { hostname, protocol, port } = window.location
      const isSub =
        hostname.startsWith('admin.') ||
        hostname.startsWith('admin-') ||
        hostname.split(':')[0] === 'admin'
      setIsSubdomain(isSub)
      if (isSub) {
        const rootHost = hostname.replace(/^admin\./, '')
        setStorefrontUrl(`${protocol}//${rootHost}${port ? `:${port}` : ''}/`)
      } else {
        setStorefrontUrl(process.env.NEXT_PUBLIC_STOREFRONT_URL || '/')
      }
      document.title = 'Sridattam Admin Portal'
    }
  }, [])

  useEffect(() => {
    if (loading) return

    if (!isAuthenticated || !user?.role) {
      router.push('/login')
      return
    }

    const redirect = getRedirectForRole(user.role, pathname)
    if (redirect) {
      router.push(redirect)
      return
    }

    setAuthorized(true)
  }, [loading, isAuthenticated, user, pathname, router])

  if (!authorized || loading) return null

  const navItems = ROLE_NAV_ITEMS[user.role] || []
  const displayName = user?.name || (user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user?.email || 'Admin')
  
  const groups = {}
  navItems.forEach(item => {
    const group = item.group || 'General'
    if (!groups[group]) groups[group] = []
    groups[group].push(item)
  })

  const isItemActive = (itemHref) => {
    const cleanHref = itemHref.replace(/^\/admin/, '') || '/'
    return (
      pathname === itemHref ||
      pathname.startsWith(itemHref + '/') ||
      pathname === cleanHref ||
      (cleanHref !== '/' && pathname.startsWith(cleanHref + '/')) ||
      (pathname === '/' && (itemHref === '/admin/overview' || cleanHref === '/overview'))
    )
  }

  const getItemHref = (itemHref) => {
    if (isSubdomain) {
      return itemHref.replace(/^\/admin/, '') || '/'
    }
    return itemHref
  }

  return (
    <SidebarProvider>
      <Sidebar className="bg-midnight text-cream border-r-0 border-stone-800">
        <SidebarHeader className="p-4 bg-midnight border-b border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="bg-saffron text-white p-1.5 rounded-lg shadow-sm">
                <LayoutDashboard size={18} />
              </div>
              <div className="flex flex-col">
                <span className="font-display text-lg text-saffron tracking-wider font-semibold leading-tight">Sridattam</span>
                <span className="font-mono text-[10px] text-stone-400 tracking-widest uppercase">Admin Portal</span>
              </div>
            </div>
            {isSubdomain && (
              <Badge variant="outline" className="text-[9px] px-1.5 py-0.5 bg-saffron/10 text-saffron border-saffron/30 font-mono">
                SUBDOMAIN
              </Badge>
            )}
          </div>
        </SidebarHeader>
        
        <SidebarContent className="bg-midnight text-gray-300">
          {Object.entries(groups).map(([groupName, items]) => (
            <SidebarGroup key={groupName}>
              <SidebarGroupLabel className="text-stone-400 font-inter text-[11px] uppercase tracking-wider font-medium">{groupName}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {items.map(item => {
                    const IconComponent = ICON_MAP[item.icon] || LayoutDashboard
                    const active = isItemActive(item.href)
                    const targetHref = getItemHref(item.href)
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton 
                          asChild 
                          isActive={active}
                          className="data-[active=true]:bg-saffron/20 data-[active=true]:text-saffron hover:bg-gray-800/80 hover:text-white transition-colors"
                        >
                          <Link href={targetHref}>
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

        <SidebarFooter className="p-4 bg-midnight border-t border-gray-800/80">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-saffron flex items-center justify-center text-white font-bold text-xs shadow-xs">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col flex-1 overflow-hidden">
                <span className="text-sm font-medium text-cream truncate">{displayName}</span>
                <span className="text-xs text-gray-400 truncate">{user?.email || ''}</span>
              </div>
              <Badge variant="outline" className="bg-saffron/20 text-saffron border-saffron/30 text-[10px]">
                {getRoleLabel(user?.role || 'admin')}
              </Badge>
            </div>
            <Button variant="outline" className="w-full justify-start text-white bg-gray-800/80 border-gray-700 hover:bg-gray-700 hover:text-white font-medium text-xs h-9" asChild>
              <a href={storefrontUrl}>
                <ExternalLink className="mr-2 h-3.5 w-3.5 text-saffron" />
                <span>Back to Store</span>
              </a>
            </Button>
          </div>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset className="bg-slate-50">
        <header className="flex h-14 shrink-0 items-center justify-between border-b bg-white px-5 shadow-xs">
          <div className="flex items-center gap-2.5">
            <SidebarTrigger />
            <Separator orientation="vertical" className="h-5" />
            <h1 className="font-display text-base text-stone-900 font-semibold tracking-wide">
              {user?.role === 'admin' ? 'Admin Portal' : 'Editor & Catalog Panel'}
            </h1>
            {isSubdomain && (
              <Badge variant="outline" className="ml-2 font-mono text-[10px] text-stone-500 border-stone-200">
                admin.sridattam.com
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-stone-500 font-inter">
            <span className="hidden sm:inline font-mono text-stone-600">{displayName}</span>
            <Badge variant="secondary" className="bg-stone-100 text-stone-700 border-stone-200 text-[11px] font-normal">
              {getRoleLabel(user?.role || 'admin')}
            </Badge>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6 font-inter bg-slate-50 text-slate-900">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
