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
  Star,
  Users,
  ScrollText,
  Mail,
  Truck,
  LogOut,
  Building2,
  Loader2,
  Sparkles,
  Shield,
} from 'lucide-react'

const ICON_MAP = {
  LayoutDashboard,
  ClipboardList,
  CreditCard,
  Package,
  FolderTree,
  Tags,
  Star,
  Users,
  ScrollText,
  Mail,
  Truck,
  Shield,
  Building2,
  Sparkles,
}

export default function DashboardLayout({ children }) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, isAuthenticated, loading, logout } = useAuth()
  const [authorized, setAuthorized] = useState(false)

  useEffect(() => {
    // If still reading session from local storage, wait
    if (loading) return

    // 1. Not authenticated or missing role: redirect to login
    if (!isAuthenticated || !user?.role) {
      if (typeof window !== 'undefined') {
        window.location.replace('/login')
      } else {
        router.replace('/login')
      }
      return
    }

    const role = (user.role || '').toLowerCase()

    // 2. Customer trying to access admin portal: kick out
    if (role === 'customer') {
      if (typeof window !== 'undefined') {
        window.location.replace('/login?error=unauthorized')
      } else {
        router.replace('/login?error=unauthorized')
      }
      return
    }

    // 3. Check role-based route permissions
    const redirect = getRedirectForRole(user.role, pathname)
    if (redirect && redirect !== pathname) {
      router.replace(redirect)
      return
    }

    setAuthorized(true)
  }, [loading, isAuthenticated, user, pathname, router])

  // Fallback safety timeout: if authorization state takes longer than 3.5s, force evaluate or redirect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!authorized) {
        const raw = typeof window !== 'undefined' ? localStorage.getItem('auth_session') : null
        if (!raw) {
          window.location.replace('/login')
        }
      }
    }, 3500)
    return () => clearTimeout(timer)
  }, [authorized])

  if (!authorized || loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 text-stone-500 max-w-sm text-center">
          <Loader2 className="animate-spin text-[#FF6B00]" size={32} />
          <span className="text-sm font-medium text-stone-700">Verifying authorization...</span>
          <p className="text-xs text-stone-400">If this screen does not disappear within a few seconds, click below to re-authenticate.</p>
          <div className="flex items-center gap-3 mt-1">
            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  localStorage.removeItem('auth_session')
                  window.location.href = '/login'
                }
              }}
              className="text-xs text-[#FF6B00] hover:underline font-semibold cursor-pointer"
            >
              Sign In Again
            </button>
            <span className="text-stone-300">•</span>
            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.location.reload()
                }
              }}
              className="text-xs text-stone-600 hover:underline font-medium cursor-pointer"
            >
              Reload Page
            </button>
          </div>
        </div>
      </div>
    )
  }

  const role = (user?.role || '').toLowerCase()
  const navItems = ROLE_NAV_ITEMS[role] || []
  const displayName =
    user?.name ||
    (user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user?.email || 'Staff')

  const groups = {}
  navItems.forEach((item) => {
    const group = item.group || 'General'
    if (!groups[group]) groups[group] = []
    groups[group].push(item)
  })

  const isItemActive = (href) => {
    if (href === '/overview' && (pathname === '/' || pathname === '/overview')) return true
    return pathname === href || (href !== '/' && href !== '/overview' && pathname.startsWith(href))
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-slate-50 text-slate-900 font-sans">
        <Sidebar className="bg-stone-900 border-r border-stone-800 text-stone-200">
          <SidebarHeader className="p-4 border-b border-stone-800 bg-stone-950">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-[#FF6B00] text-white p-2 rounded-lg shadow-sm">
                  <Shield size={20} />
                </div>
                <div className="flex flex-col">
                  <span className="text-base font-bold text-white tracking-wide leading-tight">
                    SRIDATTAM
                  </span>
                  <span className="font-mono text-[10px] text-[#FF6B00] tracking-widest uppercase font-semibold">
                    Admin Portal
                  </span>
                </div>
              </div>
            </div>
          </SidebarHeader>

          <SidebarContent className="px-2 py-3 space-y-4 bg-stone-900">
            {Object.entries(groups).map(([groupName, items]) => (
              <SidebarGroup key={groupName}>
                <SidebarGroupLabel className="text-[10px] uppercase font-mono tracking-wider text-stone-400 px-3 py-1 font-semibold">
                  {groupName}
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu className="space-y-0.5">
                    {items.map((item) => {
                      const IconComponent = ICON_MAP[item.icon] || LayoutDashboard
                      const active = isItemActive(item.href)
                      return (
                        <SidebarMenuItem key={item.href}>
                          <SidebarMenuButton
                            asChild
                            isActive={active}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                              active
                                ? 'bg-[#FF6B00] text-white font-semibold shadow-sm'
                                : 'text-stone-300 hover:bg-stone-800 hover:text-white'
                            }`}
                          >
                            <Link href={item.href}>
                              <IconComponent size={18} className={active ? 'text-white' : 'text-stone-400'} />
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

          <SidebarFooter className="p-3 border-t border-stone-800 bg-stone-950 mt-auto">
            <div className="flex flex-col gap-2">
              <div className="px-3 py-2 bg-stone-900 rounded-lg border border-stone-800 flex items-center justify-between">
                <div className="min-w-0 pr-2">
                  <p className="text-xs font-semibold text-white truncate">{displayName}</p>
                  <p className="text-[10px] text-stone-400 truncate">{user?.email}</p>
                </div>
                <Badge
                  variant="outline"
                  className="shrink-0 text-[10px] px-1.5 py-0.2 bg-[#FF6B00]/10 text-[#FF6B00] border-[#FF6B00]/30 font-medium"
                >
                  {getRoleLabel(user?.role)}
                </Badge>
              </div>

              <Button
                variant="ghost"
                onClick={() => {
                  logout()
                  router.push('/login')
                }}
                className="w-full flex items-center justify-start gap-2.5 px-3 py-2 text-stone-400 hover:text-red-400 hover:bg-red-950/30 text-xs rounded-lg transition-colors"
              >
                <LogOut size={16} />
                <span>Sign Out</span>
              </Button>
            </div>
          </SidebarFooter>
          <SidebarRail />
        </Sidebar>

        <SidebarInset className="flex-1 flex flex-col min-w-0 bg-slate-50">
          <header className="h-14 border-b border-stone-200 bg-white sticky top-0 z-30 flex items-center justify-between px-5 shadow-xs">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="text-stone-600 hover:text-stone-900" />
              <Separator orientation="vertical" className="h-5 bg-stone-200" />
              <h1 className="text-sm font-semibold text-stone-900 tracking-tight">
                Operations & Management
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <Badge
                variant="secondary"
                className="text-xs bg-stone-100 border-stone-200 text-stone-700 font-mono font-normal"
              >
                {getRoleLabel(user?.role)}
              </Badge>
            </div>
          </header>

          <main className="flex-1 p-6 overflow-y-auto bg-slate-50 text-slate-900">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
