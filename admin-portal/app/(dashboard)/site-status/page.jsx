'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { AlertTriangle, CheckCircle2, Loader2, Power } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'

export default function SiteStatusPage() {
  const { token } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isMaintenance, setIsMaintenance] = useState(false)
  const [message, setMessage] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [feedback, setFeedback] = useState({ type: '', text: '' })

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'

  useEffect(() => {
    async function loadStatus() {
      try {
        setLoading(true)
        const res = await fetch(`${backendUrl}/site-status`)
        if (res.ok) {
          const data = await res.json()
          setIsMaintenance(Boolean(data?.isMaintenance))
          setMessage(data?.message || '')
        }
      } catch {
        setFeedback({ type: 'error', text: 'Failed to fetch current site status' })
      } finally {
        setLoading(false)
      }
    }
    loadStatus()
  }, [backendUrl])

  const handleToggleClick = (checked) => {
    if (checked) {
      // Switching to Maintenance Mode requires confirmation
      setConfirmOpen(true)
    } else {
      // Direct turn off
      saveStatus(false, message)
    }
  }

  const saveStatus = async (targetMaintenance, targetMessage) => {
    try {
      setSaving(true)
      setFeedback({ type: '', text: '' })

      const res = await fetch(`${backendUrl}/admin/site-status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          isMaintenance: targetMaintenance,
          message: targetMessage.trim() || undefined,
        }),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData?.message || 'Failed to update site status')
      }

      const updated = await res.json()
      setIsMaintenance(Boolean(updated?.isMaintenance))
      setMessage(updated?.message || '')
      setFeedback({
        type: 'success',
        text: targetMaintenance
          ? 'Storefront has been taken OFFLINE into Maintenance Mode.'
          : 'Storefront is now LIVE and accessible to all visitors.',
      })
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Operation failed' })
    } finally {
      setSaving(false)
      setConfirmOpen(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-72 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-stone-400" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900">Site Maintenance Mode</h1>
        <p className="text-sm text-stone-500 mt-1">
          Control the availability of the public storefront during catalog updates or maintenance.
        </p>
      </div>

      {feedback.text && (
        <div
          className={`p-4 rounded-xl border flex items-center gap-3 text-sm font-medium ${
            feedback.type === 'error'
              ? 'bg-red-50 text-red-800 border-red-200'
              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
          }`}
        >
          {feedback.type === 'error' ? (
            <AlertTriangle className="h-5 w-5 shrink-0 text-red-600" />
          ) : (
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      <Card className="border-stone-200 shadow-xs">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg flex items-center gap-2">
                <Power className="h-5 w-5 text-stone-700" />
                Storefront Status
              </CardTitle>
              <CardDescription>
                When active, storefront traffic is rewritten to a branded maintenance screen. In-flight payments and webhooks are unaffected.
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`text-xs font-semibold uppercase px-2.5 py-1 rounded-full ${
                  isMaintenance
                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                }`}
              >
                {isMaintenance ? 'Offline (Maintenance)' : 'Online (Live)'}
              </span>
              <Switch
                checked={isMaintenance}
                onCheckedChange={handleToggleClick}
                disabled={saving}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 pt-2">
          <div className="space-y-2">
            <Label htmlFor="maintenance-message" className="text-xs font-medium text-stone-700">
              Customer Notice Message (Optional, max 500 characters)
            </Label>
            <Textarea
              id="maintenance-message"
              placeholder="e.g. We are currently performing routine catalog maintenance and upgrades to serve you better. We will be back online shortly."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={500}
              rows={4}
              className="resize-none text-sm text-stone-900 border-stone-300 focus:border-stone-900"
            />
            <p className="text-[11px] text-stone-400 text-right">
              {message.length} / 500 characters
            </p>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-stone-100">
            <p className="text-xs text-stone-500">
              Changes to the message take effect immediately for visitors.
            </p>
            <Button
              onClick={() => saveStatus(isMaintenance, message)}
              disabled={saving}
              className="bg-stone-900 hover:bg-stone-800 text-white font-medium text-xs px-4"
            >
              {saving && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
              Save Message
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Modal */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              Take Storefront Offline?
            </DialogTitle>
            <DialogDescription className="pt-2 text-stone-600 leading-relaxed text-sm">
              Activating Maintenance Mode will immediately present a maintenance screen to all storefront customers. New carts and checkouts will be blocked until you switch it back on.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 pt-4">
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              className="bg-amber-600 hover:bg-amber-700 text-white font-medium"
              onClick={() => saveStatus(true, message)}
              disabled={saving}
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Confirm & Take Offline
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
