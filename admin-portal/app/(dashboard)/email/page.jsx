'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  Mail,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowUpDown,
  FileText,
  Edit,
  RotateCcw,
  AlertCircle,
  Loader2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Copy,
} from 'lucide-react'

import {
  getEmailLogs,
  getEmailStats,
  retryEmailLog,
  getEmailTemplates,
  updateEmailTemplate,
  previewEmailTemplate,
} from '@/lib/api/admin-email'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

const TEMPLATE_LABELS = {
  order_confirmation: 'Order Confirmation',
  status_processing: 'Order Processing',
  status_shipped: 'Order Shipped',
  status_delivered: 'Order Delivered',
  order_cancelled: 'Order Cancelled',
  refund_processed: 'Refund Processed',
  internal_new_order: 'Internal Alert (New Order)',
}

function EmailPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeTab = searchParams.get('tab') || 'logs'

  // Logs state
  const [logs, setLogs] = useState([])
  const [meta, setMeta] = useState({ page: 1, perPage: 20, total: 0, totalPages: 1 })
  const [stats, setStats] = useState({
    totalSent: 0,
    totalFailed: 0,
    sentLast24h: 0,
    failureRatePercent: 0,
  })
  const [loadingLogs, setLoadingLogs] = useState(false)
  const [loadingStats, setLoadingStats] = useState(false)
  const [retryingIds, setRetryingIds] = useState(new Set())

  // Filters state
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [templateFilter, setTemplateFilter] = useState('all')
  const [sortFilter, setSortFilter] = useState('newest')
  const [currentPage, setCurrentPage] = useState(1)

  // Templates state
  const [templates, setTemplates] = useState([])
  const [loadingTemplates, setLoadingTemplates] = useState(false)

  // Edit Drawer state
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [formData, setFormData] = useState({
    subject: '',
    heading: '',
    intro: '',
    footer: '',
  })
  const [previewHtml, setPreviewHtml] = useState('')
  const [previewLoading, setPreviewLoading] = useState(false)
  const [savingTemplate, setSavingTemplate] = useState(false)

  const handleTabChange = (val) => {
    router.push(`/email?tab=${val}`, { scroll: false })
  }

  // Load stats
  const fetchStats = useCallback(async () => {
    try {
      setLoadingStats(true)
      const data = await getEmailStats()
      setStats(data)
    } catch (err) {
      toast.error('Failed to load email statistics')
    } finally {
      setLoadingStats(false)
    }
  }, [])

  // Load logs
  const fetchLogs = useCallback(async () => {
    try {
      setLoadingLogs(true)
      const res = await getEmailLogs({
        page: currentPage,
        perPage: 20,
        search: search.trim() || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
        templateKey: templateFilter === 'all' ? undefined : templateFilter,
        sort: sortFilter,
      })
      setLogs(res.data || [])
      setMeta(res.meta || { page: 1, perPage: 20, total: 0, totalPages: 1 })
    } catch (err) {
      toast.error(err.message || 'Failed to fetch email logs')
    } finally {
      setLoadingLogs(false)
    }
  }, [currentPage, search, statusFilter, templateFilter, sortFilter])

  // Load templates
  const fetchTemplates = useCallback(async () => {
    try {
      setLoadingTemplates(true)
      const data = await getEmailTemplates()
      setTemplates(data || [])
    } catch (err) {
      toast.error(err.message || 'Failed to fetch email templates')
    } finally {
      setLoadingTemplates(false)
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'logs') {
      fetchStats()
      fetchLogs()
    } else if (activeTab === 'templates') {
      fetchTemplates()
    }
  }, [activeTab, fetchStats, fetchLogs, fetchTemplates])

  // Retry log handler
  const handleRetry = async (logId) => {
    if (retryingIds.has(logId)) return
    try {
      setRetryingIds((prev) => new Set(prev).add(logId))
      await retryEmailLog(logId)
      toast.success('Email re-sent successfully')
      fetchLogs()
      fetchStats()
    } catch (err) {
      toast.error(err.message || 'Failed to retry email send')
    } finally {
      setRetryingIds((prev) => {
        const next = new Set(prev)
        next.delete(logId)
        return next
      })
    }
  }

  // Open edit drawer
  const handleOpenEdit = async (tpl) => {
    setSelectedTemplate(tpl)
    const initialForm = {
      subject: tpl.overrides?.subject || tpl.defaults?.subject || '',
      heading: tpl.overrides?.heading || tpl.defaults?.heading || '',
      intro: tpl.overrides?.intro || tpl.defaults?.intro || '',
      footer: tpl.overrides?.footer || tpl.defaults?.footer || '',
    }
    setFormData(initialForm)
    setIsDrawerOpen(true)
    loadPreview(tpl.key, initialForm)
  }

  // Load live preview
  const loadPreview = async (templateKey, data) => {
    try {
      setPreviewLoading(true)
      const res = await previewEmailTemplate(templateKey, data)
      setPreviewHtml(res.html || '')
    } catch (err) {
      toast.error('Preview error: ' + (err.message || 'Failed to generate preview'))
    } finally {
      setPreviewLoading(false)
    }
  }

  const handleFieldChange = (field, value) => {
    const updated = { ...formData, [field]: value }
    setFormData(updated)
  }

  const handleRefreshPreview = () => {
    if (selectedTemplate) {
      loadPreview(selectedTemplate.key, formData)
    }
  }

  const handleResetToDefault = () => {
    if (!selectedTemplate) return
    const defaultForm = {
      subject: selectedTemplate.defaults?.subject || '',
      heading: selectedTemplate.defaults?.heading || '',
      intro: selectedTemplate.defaults?.intro || '',
      footer: selectedTemplate.defaults?.footer || '',
    }
    setFormData(defaultForm)
    loadPreview(selectedTemplate.key, defaultForm)
    toast.info('Reset input fields to default wording. Click Save to apply.')
  }

  const handleInsertPlaceholder = (placeholder) => {
    navigator.clipboard.writeText(placeholder)
    toast.success(`Copied "${placeholder}" to clipboard`)
  }

  const handleSaveTemplate = async () => {
    if (!selectedTemplate) return
    try {
      setSavingTemplate(true)
      await updateEmailTemplate(selectedTemplate.key, formData)
      toast.success(`Template "${selectedTemplate.label}" wording updated`)
      setIsDrawerOpen(false)
      fetchTemplates()
    } catch (err) {
      toast.error(err.message || 'Failed to save template wording')
    } finally {
      setSavingTemplate(false)
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Mail className="w-6 h-6 text-primary" />
            Email Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Monitor transactional email delivery logs and customize customer email wording.
          </p>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full max-w-xs grid-cols-2">
          <TabsTrigger value="logs">Logs & Stats</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        {/* LOGS TAB */}
        <TabsContent value="logs" className="space-y-6 mt-4">
          {/* Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Sent
                </CardTitle>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loadingStats ? <Loader2 className="w-5 h-5 animate-spin" /> : stats.totalSent.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Successfully delivered</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Failed
                </CardTitle>
                <XCircle className="w-4 h-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loadingStats ? <Loader2 className="w-5 h-5 animate-spin" /> : stats.totalFailed.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Delivery errors or bounces</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Sent (Last 24h)
                </CardTitle>
                <Clock className="w-4 h-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loadingStats ? <Loader2 className="w-5 h-5 animate-spin" /> : stats.sentLast24h.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Recent activity</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Failure Rate
                </CardTitle>
                <AlertCircle className={`w-4 h-4 ${stats.failureRatePercent > 5 ? 'text-destructive' : 'text-muted-foreground'}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loadingStats ? <Loader2 className="w-5 h-5 animate-spin" /> : `${stats.failureRatePercent}%`}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Overall failure ratio</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters Bar */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="relative w-full sm:w-80">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search recipient or order #..."
                    className="pl-9"
                    maxLength={100}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        setCurrentPage(1)
                        fetchLogs()
                      }
                    }}
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  <Select
                    value={statusFilter}
                    onValueChange={(val) => {
                      setStatusFilter(val)
                      setCurrentPage(1)
                    }}
                  >
                    <SelectTrigger className="w-[120px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="sent">Sent</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={templateFilter}
                    onValueChange={(val) => {
                      setTemplateFilter(val)
                      setCurrentPage(1)
                    }}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Template" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Templates</SelectItem>
                      {Object.entries(TEMPLATE_LABELS).map(([k, label]) => (
                        <SelectItem key={k} value={k}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={sortFilter}
                    onValueChange={(val) => {
                      setSortFilter(val)
                      setCurrentPage(1)
                    }}
                  >
                    <SelectTrigger className="w-[140px]">
                      <ArrowUpDown className="w-3.5 h-3.5 mr-1" />
                      <SelectValue placeholder="Sort" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">Newest First</SelectItem>
                      <SelectItem value="oldest">Oldest First</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      fetchLogs()
                      fetchStats()
                    }}
                    title="Refresh Logs"
                  >
                    <RefreshCw className={`w-4 h-4 ${loadingLogs ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Logs Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Template</TableHead>
                    <TableHead>Order #</TableHead>
                    <TableHead>Sent At</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Error Details</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingLogs ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                        Loading email logs...
                      </TableCell>
                    </TableRow>
                  ) : logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                        No email logs found matching the current filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    logs.map((log) => {
                      const isFailed = log.status === 'failed'
                      const isRetrying = retryingIds.has(log.id)
                      const templateLabel = TEMPLATE_LABELS[log.templateKey] || log.templateKey

                      return (
                        <TableRow key={log.id}>
                          <TableCell className="font-mono text-xs">{log.recipient}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-normal text-xs">
                              {templateLabel}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {log.orderId ? (
                              <Link
                                href={`/orders/${log.orderId}`}
                                className="text-primary hover:underline font-mono text-xs inline-flex items-center gap-1"
                              >
                                #{log.orderNumber || log.orderId.slice(0, 8)}
                                <ExternalLink className="w-3 h-3" />
                              </Link>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {log.sentAt ? new Date(log.sentAt).toLocaleString() : '—'}
                          </TableCell>
                          <TableCell>
                            {log.status === 'sent' ? (
                              <Badge variant="success" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                                Sent
                              </Badge>
                            ) : (
                              <Badge variant="destructive">
                                Failed
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="max-w-xs">
                            {isFailed && log.error ? (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="truncate text-xs text-destructive cursor-help">
                                      {log.error}
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="max-w-sm text-xs bg-popover text-popover-foreground">
                                    {log.error}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {isFailed ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 gap-1 text-xs border-amber-300 hover:bg-amber-50 text-amber-800"
                                disabled={isRetrying}
                                onClick={() => handleRetry(log.id)}
                              >
                                {isRetrying ? (
                                  <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    Retrying...
                                  </>
                                ) : (
                                  <>
                                    <RotateCcw className="w-3.5 h-3.5" />
                                    Retry
                                  </>
                                )}
                              </Button>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Pagination Controls */}
          {meta.totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div>
                Showing page {meta.page} of {meta.totalPages} ({meta.total} total logs)
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={meta.page <= 1 || loadingLogs}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={meta.page >= meta.totalPages || loadingLogs}
                  onClick={() => setCurrentPage((p) => Math.min(meta.totalPages, p + 1))}
                >
                  Next <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* TEMPLATES TAB */}
        <TabsContent value="templates" className="space-y-6 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Customer Notification Templates</CardTitle>
              <CardDescription>
                Customize customer-facing wording. The structural HTML layout is maintained in code for design integrity.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Template Name</TableHead>
                    <TableHead>Key</TableHead>
                    <TableHead>Wording Status</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingTemplates ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                        Loading templates...
                      </TableCell>
                    </TableRow>
                  ) : templates.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                        No editable templates found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    templates.map((tpl) => {
                      const hasOverrides =
                        !!tpl.overrides?.subject ||
                        !!tpl.overrides?.heading ||
                        !!tpl.overrides?.intro ||
                        !!tpl.overrides?.footer

                      return (
                        <TableRow key={tpl.key}>
                          <TableCell className="font-semibold">{tpl.label}</TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {tpl.key}
                          </TableCell>
                          <TableCell>
                            {hasOverrides ? (
                              <Badge className="bg-amber-100 text-amber-900 border-amber-300">
                                Customized
                              </Badge>
                            ) : (
                              <Badge variant="secondary">
                                Default Code Wording
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {tpl.updatedAt ? new Date(tpl.updatedAt).toLocaleString() : '—'}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1.5 text-xs"
                              onClick={() => handleOpenEdit(tpl)}
                            >
                              <Edit className="w-3.5 h-3.5" />
                              Edit Wording
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* EDIT DRAWER (SHEET) */}
      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto p-6 space-y-6">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Edit {selectedTemplate?.label} Wording
            </SheetTitle>
            <SheetDescription>
              Plain text only. HTML tags (&lt; and &gt;) are strictly rejected. Empty fields automatically revert to code defaults.
            </SheetDescription>
          </SheetHeader>

          {/* Placeholder Cheatsheet */}
          <div className="bg-muted/40 p-3 rounded-lg border text-xs space-y-1.5">
            <div className="font-semibold text-foreground flex items-center justify-between">
              <span>Allowed Placeholders:</span>
              <span className="text-[11px] font-normal text-muted-foreground">Click to copy</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {['{{orderNumber}}', '{{customerName}}', '{{brandName}}'].map((ph) => (
                <button
                  key={ph}
                  type="button"
                  onClick={() => handleInsertPlaceholder(ph)}
                  className="bg-background border rounded px-2 py-0.5 font-mono text-[11px] hover:bg-accent flex items-center gap-1"
                >
                  {ph}
                  <Copy className="w-2.5 h-2.5 opacity-60" />
                </button>
              ))}
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            {/* Subject */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <label className="font-medium">Subject Line</label>
                <span className="text-muted-foreground">{formData.subject.length}/150</span>
              </div>
              <Input
                value={formData.subject}
                maxLength={150}
                placeholder={selectedTemplate?.defaults?.subject || 'Default subject'}
                onChange={(e) => handleFieldChange('subject', e.target.value)}
                onBlur={handleRefreshPreview}
              />
            </div>

            {/* Heading */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <label className="font-medium">Email Heading</label>
                <span className="text-muted-foreground">{formData.heading.length}/100</span>
              </div>
              <Input
                value={formData.heading}
                maxLength={100}
                placeholder={selectedTemplate?.defaults?.heading || 'Default heading'}
                onChange={(e) => handleFieldChange('heading', e.target.value)}
                onBlur={handleRefreshPreview}
              />
            </div>

            {/* Intro */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <label className="font-medium">Introduction / Lead Paragraph</label>
                <span className="text-muted-foreground">{formData.intro.length}/500</span>
              </div>
              <Textarea
                rows={4}
                value={formData.intro}
                maxLength={500}
                placeholder={selectedTemplate?.defaults?.intro || 'Default introduction paragraph'}
                onChange={(e) => handleFieldChange('intro', e.target.value)}
                onBlur={handleRefreshPreview}
              />
              <p className="text-[11px] text-muted-foreground">
                Newlines render as separate paragraphs in the email body.
              </p>
            </div>

            {/* Footer */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <label className="font-medium">Sign-Off / Footer Line</label>
                <span className="text-muted-foreground">{formData.footer.length}/300</span>
              </div>
              <Textarea
                rows={3}
                value={formData.footer}
                maxLength={300}
                placeholder={selectedTemplate?.defaults?.footer || 'Warm regards,\nTeam {{brandName}}'}
                onChange={(e) => handleFieldChange('footer', e.target.value)}
                onBlur={handleRefreshPreview}
              />
              <p className="text-[11px] text-muted-foreground">
                Replaces only the closing sign-off line. Support info and copyright remain intact.
              </p>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleResetToDefault}
              className="text-xs"
            >
              Reset to Defaults
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleRefreshPreview}
              className="text-xs gap-1"
            >
              <RefreshCw className={`w-3 h-3 ${previewLoading ? 'animate-spin' : ''}`} />
              Update Preview
            </Button>
          </div>

          {/* Sandbox Preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Sandboxed HTML Preview
              </span>
              <Badge variant="outline" className="bg-amber-50 text-amber-800 text-[10px] font-mono border-amber-200">
                Sample data
              </Badge>
            </div>
            <div className="border rounded-md overflow-hidden bg-white shadow-inner">
              {previewLoading ? (
                <div className="h-[360px] flex items-center justify-center text-xs text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Rendering sample preview...
                </div>
              ) : (
                <iframe
                  sandbox=""
                  srcDoc={previewHtml}
                  title="Template Preview"
                  className="w-full h-[360px] border-0"
                />
              )}
            </div>
          </div>

          <SheetFooter className="pt-4 border-t flex flex-row items-center justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => setIsDrawerOpen(false)}
              disabled={savingTemplate}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveTemplate}
              disabled={savingTemplate}
              className="min-w-[120px]"
            >
              {savingTemplate ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}

export default function AdminEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 flex items-center justify-center text-sm text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading Email Portal...
        </div>
      }
    >
      <EmailPageContent />
    </Suspense>
  )
}
