// app/admin/layout.js
'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { currentUser } from '@/lib/mock-user'
import { hasRole, getRoleLabel } from '@/lib/roles'
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
import { LayoutDashboard, ClipboardList, CreditCard, Package, Tags, Users, LogOut } from 'lucide-react'

export default function AdminLayout({ children }) {
  const router = useRouter()
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    if (currentUser.role === 'admin') {
      setMounted(true)
    } else if (hasRole(currentUser, 'read_only')) {
      router.push('/staff/orders')
    } else if (currentUser.role === 'customer') {
      router.push('/account/orders')
    } else {
      router.push('/')
    }
  }, [router])

  if (!mounted) return null

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
          <SidebarGroup>
            <SidebarGroupLabel className="text-gray-500 font-inter text-xs">Overview</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    asChild 
                    isActive={pathname.startsWith('/admin/overview')}
                    className="data-[active=true]:bg-saffron/20 data-[active=true]:text-saffron hover:bg-gray-800 hover:text-white"
                  >
                    <Link href="/admin/overview">
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      <span>Dashboard</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel className="text-gray-500 font-inter text-xs">Operations</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    asChild 
                    isActive={pathname.startsWith('/admin/orders')}
                    className="data-[active=true]:bg-saffron/20 data-[active=true]:text-saffron hover:bg-gray-800 hover:text-white"
                  >
                    <Link href="/admin/orders">
                      <ClipboardList className="mr-2 h-4 w-4" />
                      <span>Orders</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    asChild 
                    isActive={pathname.startsWith('/admin/payments')}
                    className="data-[active=true]:bg-saffron/20 data-[active=true]:text-saffron hover:bg-gray-800 hover:text-white"
                  >
                    <Link href="/admin/payments">
                      <CreditCard className="mr-2 h-4 w-4" />
                      <span>Payments</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel className="text-gray-500 font-inter text-xs">Catalog</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    asChild 
                    isActive={pathname.startsWith('/admin/products')}
                    className="data-[active=true]:bg-saffron/20 data-[active=true]:text-saffron hover:bg-gray-800 hover:text-white"
                  >
                    <Link href="/admin/products">
                      <Package className="mr-2 h-4 w-4" />
                      <span>Products</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    asChild 
                    isActive={pathname.startsWith('/admin/discounts')}
                    className="data-[active=true]:bg-saffron/20 data-[active=true]:text-saffron hover:bg-gray-800 hover:text-white"
                  >
                    <Link href="/admin/discounts">
                      <Tags className="mr-2 h-4 w-4" />
                      <span>Discounts</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel className="text-gray-500 font-inter text-xs">Management</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    asChild 
                    isActive={pathname.startsWith('/admin/users')}
                    className="data-[active=true]:bg-saffron/20 data-[active=true]:text-saffron hover:bg-gray-800 hover:text-white"
                  >
                    <Link href="/admin/users">
                      <Users className="mr-2 h-4 w-4" />
                      <span>Users</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="p-4 bg-midnight border-t border-gray-800">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-saffron flex items-center justify-center text-white font-bold">
                {currentUser.name.charAt(0)}
              </div>
              <div className="flex flex-col flex-1 overflow-hidden">
                <span className="text-sm font-medium text-cream truncate">{currentUser.name}</span>
                <span className="text-xs text-gray-400 truncate">{currentUser.email}</span>
              </div>
              <Badge variant="outline" className="bg-saffron/20 text-saffron border-saffron/30">
                {getRoleLabel(currentUser.role)}
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
          <h1 className="font-display text-lg">Admin Panel</h1>
        </header>
        <main className="flex-1 overflow-auto p-6 font-inter bg-gray-50 text-slate-900">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
