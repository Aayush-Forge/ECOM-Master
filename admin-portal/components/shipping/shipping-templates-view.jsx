'use client'

import { useEffect, useState } from 'react'
import {
  getAllShippingTemplates,
  createShippingTemplate,
  updateShippingTemplate,
  deleteShippingTemplate,
  setDefaultShippingTemplate,
} from '@/lib/api/shipping'
import { toast } from 'sonner'
import {
  Truck,
  Plus,
  Edit,
  Trash2,
  CheckCircle2,
  Star,
  Info,
  Scale,
  IndianRupee,
  Loader2,
  PackageCheck,
  AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'

export default function ShippingTemplatesView() {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)

  // Dialog State
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState(null)
  const [saving, setSaving] = useState(false)

  // Delete State
  const [deletingId, setDeletingId] = useState(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

  // Form State
  const [formName, setFormName] = useState('')
  const [formRateType, setFormRateType] = useState('order_value')
  const [formFreeShipping, setFormFreeShipping] = useState('')
  const [formIsDefault, setFormIsDefault] = useState(false)
  const [formIsEnabled, setFormIsEnabled] = useState(true)
  const [formSlabs, setFormSlabs] = useState([
    { upTo: '499', charge: '49', isOpenEnded: false },
    { upTo: '', charge: '0', isOpenEnded: true },
  ])

  const loadTemplates = async () => {
    try {
      setLoading(true)
      const data = await getAllShippingTemplates(true)
      setTemplates(data || [])
    } catch (err) {
      console.error(err)
      toast.error('Failed to load shipping templates')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTemplates()
  }, [])

  const handleOpenCreate = () => {
    setEditingTemplate(null)
    setFormName('')
    setFormRateType('order_value')
    setFormFreeShipping('499')
    setFormIsDefault(templates.length === 0)
    setFormIsEnabled(true)
    setFormSlabs([
      { upTo: '499', charge: '49', isOpenEnded: false },
      { upTo: '', charge: '0', isOpenEnded: true },
    ])
    setDialogOpen(true)
  }

  const handleOpenEdit = (tmpl) => {
    setEditingTemplate(tmpl)
    setFormName(tmpl.name)
    setFormRateType(tmpl.rateType || 'order_value')
    setFormFreeShipping(
      tmpl.freeShippingThreshold !== null && tmpl.freeShippingThreshold !== undefined
        ? String(tmpl.freeShippingThreshold)
        : '',
    )
    setFormIsDefault(Boolean(tmpl.isDefault))
    setFormIsEnabled(Boolean(tmpl.isEnabled))

    const rawSlabs = Array.isArray(tmpl.slabs) ? tmpl.slabs : []
    const mappedSlabs = rawSlabs.map((s) => ({
      upTo: s.upTo !== null && s.upTo !== undefined ? String(s.upTo) : '',
      charge: s.charge !== null && s.charge !== undefined ? String(s.charge) : '0',
      isOpenEnded: s.upTo === null || s.upTo === undefined || s.upTo === '',
    }))

    if (mappedSlabs.length === 0) {
      mappedSlabs.push({ upTo: '1', charge: '50', isOpenEnded: false })
    }

    setFormSlabs(mappedSlabs)
    setDialogOpen(true)
  }

  const handleRateTypeChange = (val) => {
    setFormRateType(val)
    if (val === 'weight') {
      // Default weight slabs (kg)
      setFormSlabs([
        { upTo: '0.5', charge: '40', isOpenEnded: false },
        { upTo: '1.0', charge: '70', isOpenEnded: false },
        { upTo: '5.0', charge: '150', isOpenEnded: false },
      ])
    } else {
      // Default value slabs
      setFormSlabs([
        { upTo: '499', charge: '49', isOpenEnded: false },
        { upTo: '', charge: '0', isOpenEnded: true },
      ])
    }
  }

  const handleAddSlab = () => {
    if (formRateType === 'weight') {
      const lastUpTo = formSlabs.length > 0 ? Number(formSlabs[formSlabs.length - 1].upTo || 0) : 0
      const nextUpTo = (lastUpTo + 1.0).toFixed(1)
      setFormSlabs([...formSlabs, { upTo: String(nextUpTo), charge: '100', isOpenEnded: false }])
    } else {
      // For order value, if last was open-ended, turn last into capped and add open-ended
      const lastIndex = formSlabs.length - 1
      if (lastIndex >= 0 && formSlabs[lastIndex].isOpenEnded) {
        const updated = [...formSlabs]
        updated[lastIndex] = { ...updated[lastIndex], isOpenEnded: false, upTo: '999' }
        updated.push({ upTo: '', charge: '0', isOpenEnded: true })
        setFormSlabs(updated)
      } else {
        setFormSlabs([...formSlabs, { upTo: '', charge: '0', isOpenEnded: true }])
      }
    }
  }

  const handleRemoveSlab = (idx) => {
    if (formSlabs.length <= 1) {
      toast.error('At least one slab is required')
      return
    }
    const updated = formSlabs.filter((_, i) => i !== idx)
    setFormSlabs(updated)
  }

  const handleSlabChange = (idx, field, value) => {
    const updated = [...formSlabs]
    updated[idx] = { ...updated[idx], [field]: value }
    setFormSlabs(updated)
  }

  const handleToggleOpenEnded = (idx, checked) => {
    const updated = [...formSlabs]
    updated[idx] = {
      ...updated[idx],
      isOpenEnded: checked,
      upTo: checked ? '' : '500',
    }
    setFormSlabs(updated)
  }

  const handleSave = async (e) => {
    e.preventDefault()

    if (!formName.trim()) {
      toast.error('Template name is required')
      return
    }
    if (formSlabs.length === 0) {
      toast.error('At least one rate slab is required')
      return
    }

    // Format & validate slabs
    const formattedSlabs = []
    for (let i = 0; i < formSlabs.length; i++) {
      const s = formSlabs[i]
      const charge = parseFloat(s.charge)
      if (isNaN(charge) || charge < 0) {
        toast.error(`Slab #${i + 1} has an invalid charge amount`)
        return
      }

      if (formRateType === 'weight') {
        const upTo = parseFloat(s.upTo)
        if (isNaN(upTo) || upTo <= 0) {
          toast.error(`Weight slab #${i + 1} must specify an upper limit (kg) > 0`)
          return
        }
        formattedSlabs.push({ upTo, charge })
      } else {
        // order_value
        if (s.isOpenEnded) {
          if (i !== formSlabs.length - 1) {
            toast.error('Only the last slab in an order-value template can be open-ended ("and above")')
            return
          }
          formattedSlabs.push({ upTo: null, charge })
        } else {
          const upTo = parseFloat(s.upTo)
          if (isNaN(upTo) || upTo <= 0) {
            toast.error(`Order value slab #${i + 1} must specify a valid upper limit (₹)`)
            return
          }
          formattedSlabs.push({ upTo, charge })
        }
      }
    }

    // Check ascending order
    for (let i = 1; i < formattedSlabs.length; i++) {
      const prev = formattedSlabs[i - 1].upTo
      const curr = formattedSlabs[i].upTo
      if (curr !== null && prev !== null && curr <= prev) {
        toast.error(`Slab #${i + 1} upper limit must be greater than slab #${i}`)
        return
      }
    }

    const payload = {
      name: formName.trim(),
      rateType: formRateType,
      slabs: formattedSlabs,
      freeShippingThreshold:
        formFreeShipping.trim() !== '' ? parseFloat(formFreeShipping) : null,
      isDefault: formIsDefault,
      isEnabled: formIsEnabled,
    }

    try {
      setSaving(true)
      if (editingTemplate) {
        await updateShippingTemplate(editingTemplate.id, payload)
        toast.success('Shipping template updated successfully')
      } else {
        await createShippingTemplate(payload)
        toast.success('Shipping template created successfully')
      }
      setDialogOpen(false)
      loadTemplates()
    } catch (err) {
      console.error(err)
      toast.error(err.message || 'Failed to save shipping template')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleEnabled = async (tmpl) => {
    try {
      await updateShippingTemplate(tmpl.id, { isEnabled: !tmpl.isEnabled })
      toast.success(`Template ${!tmpl.isEnabled ? 'enabled' : 'disabled'}`)
      loadTemplates()
    } catch (err) {
      toast.error(err.message || 'Failed to update template status')
    }
  }

  const handleSetDefault = async (tmpl) => {
    try {
      await setDefaultShippingTemplate(tmpl.id)
      toast.success(`"${tmpl.name}" is now the default shipping template`)
      loadTemplates()
    } catch (err) {
      toast.error(err.message || 'Failed to set default template')
    }
  }

  const handleDelete = async () => {
    if (!deletingId) return
    try {
      await deleteShippingTemplate(deletingId)
      toast.success('Shipping template deleted')
      setDeleteConfirmOpen(false)
      setDeletingId(null)
      loadTemplates()
    } catch (err) {
      toast.error(err.message || 'Failed to delete template')
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900 flex items-center gap-2">
            <Truck className="h-6 w-6 text-maroon-700" /> Shipping Templates
          </h1>
          <p className="text-sm text-stone-500 mt-1">
            Configure delivery rules, rate slabs, and carrier settings for your catalog.
          </p>
        </div>
        <Button
          onClick={handleOpenCreate}
          className="bg-maroon-700 hover:bg-maroon-800 text-white flex items-center gap-2 shadow-sm"
        >
          <Plus className="h-4 w-4" /> Add Shipping Template
        </Button>
      </div>

      {/* Info Callout */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-xs text-amber-900 flex gap-3 items-start">
        <Info className="h-4 w-4 text-amber-700 mt-0.5 shrink-0" />
        <div className="space-y-1">
          <p className="font-semibold text-amber-950">How Shipping Calculations Work:</p>
          <p>
            • Each product can pick a shipping template (empty defaults to the template marked <strong>Default</strong>).
          </p>
          <p>
            • <strong>Weight-based slabs:</strong> Server computes total weight of items for that template. If weight exceeds the highest slab, checkout is blocked with an error.
          </p>
          <p>
            • <strong>Order-value slabs:</strong> Calculated on item value. The last slab can be open-ended (&quot;₹X and above&quot;).
          </p>
          <p>
            • <strong>Free shipping above ₹X:</strong> Checked against the whole cart subtotal. If the cart meets the threshold, shipping is ₹0.
          </p>
        </div>
      </div>

      {/* Templates List Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Active Templates</CardTitle>
          <CardDescription className="text-xs">
            Manage your delivery templates and carrier integrations.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-16 text-center text-stone-500 flex flex-col items-center justify-center gap-2 text-xs">
              <Loader2 className="h-6 w-6 animate-spin text-maroon-700" />
              Loading shipping templates...
            </div>
          ) : templates.length === 0 ? (
            <div className="py-16 text-center text-stone-500 text-xs">
              No shipping templates found. Create your first template to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-stone-50/70 hover:bg-stone-50/70 text-xs">
                  <TableHead className="font-semibold text-stone-700 w-1/3">Template Name</TableHead>
                  <TableHead className="font-semibold text-stone-700">Type</TableHead>
                  <TableHead className="font-semibold text-stone-700">Rate Slabs</TableHead>
                  <TableHead className="font-semibold text-stone-700">Free Shipping Above</TableHead>
                  <TableHead className="font-semibold text-stone-700 text-center">Status</TableHead>
                  <TableHead className="font-semibold text-stone-700 text-right pr-4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs">
                {templates.map((tmpl) => {
                  const isWeight = tmpl.rateType === 'weight'
                  const rawSlabs = Array.isArray(tmpl.slabs) ? tmpl.slabs : []

                  return (
                    <TableRow key={tmpl.id} className="hover:bg-stone-50/60">
                      <TableCell className="font-medium text-stone-900">
                        <div className="flex items-center gap-2">
                          <span>{tmpl.name}</span>
                          {tmpl.isDefault && (
                            <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200 text-[10px] font-semibold flex items-center gap-1">
                              <Star className="h-3 w-3 fill-emerald-600 text-emerald-600" /> Default
                            </Badge>
                          )}
                        </div>
                        {tmpl._count?.products !== undefined && (
                          <span className="text-[11px] text-stone-500 block mt-0.5">
                            {tmpl._count.products} {tmpl._count.products === 1 ? 'product' : 'products'} assigned
                          </span>
                        )}
                      </TableCell>

                      <TableCell>
                        {isWeight ? (
                          <Badge variant="outline" className="border-blue-200 text-blue-700 bg-blue-50/50 flex items-center gap-1 w-fit">
                            <Scale className="h-3 w-3" /> Weight (kg)
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-purple-200 text-purple-700 bg-purple-50/50 flex items-center gap-1 w-fit">
                            <IndianRupee className="h-3 w-3" /> Order Value (₹)
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell>
                        <div className="space-y-1">
                          {rawSlabs.map((s, idx) => (
                            <div key={idx} className="text-stone-600 text-[11px]">
                              {isWeight ? (
                                <>Up to {s.upTo} kg → <span className="font-semibold text-stone-800">₹{s.charge}</span></>
                              ) : s.upTo === null || s.upTo === undefined ? (
                                <>₹{rawSlabs[idx - 1]?.upTo || '0'} and above → <span className="font-semibold text-stone-800">{s.charge === 0 ? 'FREE' : `₹${s.charge}`}</span></>
                              ) : (
                                <>Up to ₹{s.upTo} → <span className="font-semibold text-stone-800">{s.charge === 0 ? 'FREE' : `₹${s.charge}`}</span></>
                              )}
                            </div>
                          ))}
                        </div>
                      </TableCell>

                      <TableCell>
                        {tmpl.freeShippingThreshold !== null && tmpl.freeShippingThreshold !== undefined ? (
                          <span className="font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                            ₹{Number(tmpl.freeShippingThreshold).toLocaleString('en-IN')}
                          </span>
                        ) : (
                          <span className="text-stone-400">None</span>
                        )}
                      </TableCell>

                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          <Switch
                            checked={tmpl.isEnabled}
                            onCheckedChange={() => handleToggleEnabled(tmpl)}
                            disabled={tmpl.isDefault}
                          />
                          <span className="text-[10px] text-stone-500">
                            {tmpl.isEnabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="text-right pr-4">
                        <div className="flex items-center justify-end gap-1.5">
                          {!tmpl.isDefault && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSetDefault(tmpl)}
                              title="Make this the default shipping template"
                              className="h-8 px-2 text-stone-600 hover:text-stone-900 text-xs"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-emerald-600" /> Set Default
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenEdit(tmpl)}
                            className="h-8 px-2 text-stone-700 hover:bg-stone-100"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={tmpl.isDefault}
                            onClick={() => {
                              setDeletingId(tmpl.id)
                              setDeleteConfirmOpen(true)
                            }}
                            className="h-8 px-2 text-red-600 hover:bg-red-50 hover:text-red-700 disabled:opacity-30"
                            title={tmpl.isDefault ? 'Cannot delete default template' : 'Delete template'}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-stone-900 flex items-center gap-2">
              <Truck className="h-5 w-5 text-maroon-700" />
              {editingTemplate ? 'Edit Shipping Template' : 'New Shipping Template'}
            </DialogTitle>
            <DialogDescription className="text-xs text-stone-500">
              Configure rates and delivery pricing slabs for this template.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-stone-700">Template Name *</Label>
              <Input
                placeholder="e.g. Standard Delivery or Heavy / Fragile Items"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="h-9 text-xs"
                required
              />
            </div>

            <div className="space-y-1.5 border-t border-b border-stone-200 py-3">
              <Label className="text-xs font-semibold text-stone-700">Rate Basis</Label>
              <RadioGroup
                value={formRateType}
                onValueChange={handleRateTypeChange}
                className="grid grid-cols-2 gap-3 pt-1"
              >
                <div className={`flex items-center space-x-2 border rounded-md p-2.5 cursor-pointer ${formRateType === 'order_value' ? 'border-maroon-700 bg-maroon-50/30' : 'border-stone-200'}`}>
                  <RadioGroupItem value="order_value" id="rate-value" />
                  <Label htmlFor="rate-value" className="text-xs cursor-pointer font-medium flex items-center gap-1.5">
                    <IndianRupee className="h-3.5 w-3.5 text-purple-700" /> Order Value (₹)
                  </Label>
                </div>
                <div className={`flex items-center space-x-2 border rounded-md p-2.5 cursor-pointer ${formRateType === 'weight' ? 'border-maroon-700 bg-maroon-50/30' : 'border-stone-200'}`}>
                  <RadioGroupItem value="weight" id="rate-weight" />
                  <Label htmlFor="rate-weight" className="text-xs cursor-pointer font-medium flex items-center gap-1.5">
                    <Scale className="h-3.5 w-3.5 text-blue-700" /> Weight (kg)
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Slabs Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs font-semibold text-stone-800">Rate Slabs</Label>
                  <p className="text-[11px] text-stone-500">
                    {formRateType === 'weight'
                      ? 'Define charges based on package weight (kg). Orders exceeding the last slab are blocked.'
                      : 'Define charges based on order amount (₹). The last slab can be open-ended.'}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddSlab}
                  className="h-7 text-xs flex items-center gap-1 text-maroon-800 border-maroon-200"
                >
                  <Plus className="h-3 w-3" /> Add Slab
                </Button>
              </div>

              <div className="border rounded-md overflow-hidden bg-stone-50/50">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-stone-100/80 text-[11px]">
                      <TableHead className="h-8 font-semibold w-12">#</TableHead>
                      <TableHead className="h-8 font-semibold">
                        {formRateType === 'weight' ? 'Up to Weight (kg)' : 'Condition / Threshold (₹)'}
                      </TableHead>
                      <TableHead className="h-8 font-semibold w-32">Shipping Charge (₹)</TableHead>
                      <TableHead className="h-8 font-semibold w-12 text-center"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {formSlabs.map((slab, idx) => (
                      <TableRow key={idx} className="bg-white">
                        <TableCell className="text-[11px] font-mono text-stone-500 py-1.5">
                          {idx + 1}
                        </TableCell>
                        <TableCell className="py-1.5">
                          {formRateType === 'weight' ? (
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-stone-500">Up to</span>
                              <Input
                                type="number"
                                step="0.1"
                                min="0.01"
                                placeholder="e.g. 1.0"
                                value={slab.upTo}
                                onChange={(e) => handleSlabChange(idx, 'upTo', e.target.value)}
                                className="h-8 text-xs w-28 font-mono"
                                required
                              />
                              <span className="text-xs text-stone-500">kg</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 flex-wrap">
                              {slab.isOpenEnded ? (
                                <span className="text-xs font-medium text-emerald-800 bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                                  ₹{formSlabs[idx - 1]?.upTo || '0'} and above (Open-ended)
                                </span>
                              ) : (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs text-stone-500">Up to ₹</span>
                                  <Input
                                    type="number"
                                    step="1"
                                    min="0"
                                    placeholder="e.g. 499"
                                    value={slab.upTo}
                                    onChange={(e) => handleSlabChange(idx, 'upTo', e.target.value)}
                                    className="h-8 text-xs w-28 font-mono"
                                    required={!slab.isOpenEnded}
                                  />
                                </div>
                              )}

                              {idx === formSlabs.length - 1 && (
                                <div className="flex items-center gap-1.5 ml-2">
                                  <Checkbox
                                    id={`open-ended-${idx}`}
                                    checked={slab.isOpenEnded}
                                    onCheckedChange={(checked) => handleToggleOpenEnded(idx, checked)}
                                  />
                                  <Label htmlFor={`open-ended-${idx}`} className="text-[11px] cursor-pointer text-stone-600">
                                    Open-ended (&quot;and above&quot;)
                                  </Label>
                                </div>
                              )}
                            </div>
                          )}
                        </TableCell>

                        <TableCell className="py-1.5">
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-stone-500">₹</span>
                            <Input
                              type="number"
                              step="1"
                              min="0"
                              placeholder="0"
                              value={slab.charge}
                              onChange={(e) => handleSlabChange(idx, 'charge', e.target.value)}
                              className="h-8 text-xs w-24 font-mono font-medium"
                              required
                            />
                          </div>
                        </TableCell>

                        <TableCell className="py-1.5 text-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveSlab(idx)}
                            disabled={formSlabs.length <= 1}
                            className="h-7 w-7 p-0 text-stone-400 hover:text-red-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Free Shipping & Toggles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-stone-200">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-stone-700">Free shipping above (₹)</Label>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-stone-500">₹</span>
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    placeholder="e.g. 499 (leave blank for none)"
                    value={formFreeShipping}
                    onChange={(e) => setFormFreeShipping(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
                <p className="text-[11px] text-stone-500">
                  If cart subtotal reaches this amount, shipping becomes ₹0.
                </p>
              </div>

              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between border rounded-md p-2.5">
                  <div>
                    <Label htmlFor="default-toggle" className="text-xs font-semibold cursor-pointer">
                      Mark as Default Template
                    </Label>
                    <p className="text-[10px] text-stone-500">Used for products with no assigned template</p>
                  </div>
                  <Switch
                    id="default-toggle"
                    checked={formIsDefault}
                    onCheckedChange={setFormIsDefault}
                    disabled={editingTemplate?.isDefault}
                  />
                </div>

                <div className="flex items-center justify-between border rounded-md p-2.5">
                  <div>
                    <Label htmlFor="enabled-toggle" className="text-xs font-semibold cursor-pointer">
                      Enabled
                    </Label>
                    <p className="text-[10px] text-stone-500">Active and available for checkout calculations</p>
                  </div>
                  <Switch
                    id="enabled-toggle"
                    checked={formIsEnabled}
                    onCheckedChange={setFormIsEnabled}
                    disabled={formIsDefault}
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-stone-200">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-maroon-700 hover:bg-maroon-800 text-white"
                disabled={saving}
              >
                {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                {editingTemplate ? 'Update Template' : 'Create Template'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-stone-900 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" /> Delete Shipping Template?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-stone-600">
              Are you sure you want to delete this shipping template? Products using this template will automatically fallback to the default shipping template.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel size="sm">Cancel</AlertDialogCancel>
            <AlertDialogAction
              size="sm"
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
