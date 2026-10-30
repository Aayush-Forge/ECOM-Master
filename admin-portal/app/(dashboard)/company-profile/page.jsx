'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { fetchCompanyProfile, updateCompanyProfile, fetchCompanyDocuments, uploadCompanyDocument, deleteCompanyDocument } from '@/lib/api/company-profile-api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { toast } from 'sonner'
import {
  Building2,
  ShieldCheck,
  MapPin,
  Landmark,
  FileText,
  Save,
  Loader2,
  AlertCircle,
  HelpCircle,
  Plus,
  Trash2,
  ExternalLink,
  Download,
  FileSpreadsheet,
  File,
  UploadCloud,
} from 'lucide-react'

const INDIAN_STATES = [
  { code: '01', name: 'Jammu and Kashmir' },
  { code: '02', name: 'Himachal Pradesh' },
  { code: '03', name: 'Punjab' },
  { code: '04', name: 'Chandigarh' },
  { code: '05', name: 'Uttarakhand' },
  { code: '06', name: 'Haryana' },
  { code: '07', name: 'Delhi' },
  { code: '08', name: 'Rajasthan' },
  { code: '09', name: 'Uttar Pradesh' },
  { code: '10', name: 'Bihar' },
  { code: '11', name: 'Sikkim' },
  { code: '12', name: 'Arunachal Pradesh' },
  { code: '13', name: 'Nagaland' },
  { code: '14', name: 'Manipur' },
  { code: '15', name: 'Mizoram' },
  { code: '16', name: 'Tripura' },
  { code: '17', name: 'Meghalaya' },
  { code: '18', name: 'Assam' },
  { code: '19', name: 'West Bengal' },
  { code: '20', name: 'Jharkhand' },
  { code: '21', name: 'Odisha' },
  { code: '22', name: 'Chhattisgarh' },
  { code: '23', name: 'Madhya Pradesh' },
  { code: '24', name: 'Gujarat' },
  { code: '26', name: 'Dadra and Nagar Haveli and Daman and Diu' },
  { code: '27', name: 'Maharashtra' },
  { code: '28', name: 'Andhra Pradesh (Old)' },
  { code: '29', name: 'Karnataka' },
  { code: '30', name: 'Goa' },
  { code: '31', name: 'Lakshadweep' },
  { code: '32', name: 'Kerala' },
  { code: '33', name: 'Tamil Nadu' },
  { code: '34', name: 'Puducherry' },
  { code: '35', name: 'Andaman and Nicobar Islands' },
  { code: '36', name: 'Telangana' },
  { code: '37', name: 'Andhra Pradesh (New)' },
  { code: '38', name: 'Ladakh' },
]

export default function CompanyProfilePage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [documents, setDocuments] = useState([])
  const [docsLoading, setDocsLoading] = useState(false)
  const [isAddDocOpen, setIsAddDocOpen] = useState(false)
  const [uploadingDoc, setUploadingDoc] = useState(false)
  const [docTitle, setDocTitle] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const [deletingDocId, setDeletingDocId] = useState(null)
  const [formData, setFormData] = useState({
    legalName: '',
    tradeName: '',
    gstin: '',
    pan: '',
    cin: '',
    phone: '',
    email: '',
    website: '',
    logoUrl: '',
    signatureUrl: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: 'Karnataka',
    stateCode: '29',
    pincode: '',
    country: 'India',
    bankName: '',
    accountNumber: '',
    accountHolder: '',
    accountType: 'Current',
    ifscCode: '',
    branchName: '',
    upiId: '',
    invoicePrefix: 'SRI/26-27/',
    invoiceNotes: '',
    termsConditions: '',
  })

  useEffect(() => {
    if (authLoading) return

    if (user?.role !== 'admin') {
      toast.error('Access restricted to administrators.')
      router.replace('/overview')
      return
    }

    async function loadData() {
      try {
        setLoading(true)
        const [profile, docs] = await Promise.all([
          fetchCompanyProfile(),
          fetchCompanyDocuments().catch(() => []),
        ])
        if (profile) {
          setFormData({
            legalName: profile.legalName || '',
            tradeName: profile.tradeName || '',
            gstin: profile.gstin || '',
            pan: profile.pan || '',
            cin: profile.cin || '',
            phone: profile.phone || '',
            email: profile.email || '',
            website: profile.website || '',
            logoUrl: profile.logoUrl || '',
            signatureUrl: profile.signatureUrl || '',
            addressLine1: profile.addressLine1 || '',
            addressLine2: profile.addressLine2 || '',
            city: profile.city || '',
            state: profile.state || 'Karnataka',
            stateCode: profile.stateCode || '29',
            pincode: profile.pincode || '',
            country: profile.country || 'India',
            bankName: profile.bankName || '',
            accountNumber: profile.accountNumber || '',
            accountHolder: profile.accountHolder || '',
            accountType: profile.accountType || 'Current',
            ifscCode: profile.ifscCode || '',
            branchName: profile.branchName || '',
            upiId: profile.upiId || '',
            invoicePrefix: profile.invoicePrefix || 'SRI/26-27/',
            invoiceNotes: profile.invoiceNotes || '',
            termsConditions: profile.termsConditions || '',
          })
        }
        if (Array.isArray(docs)) {
          setDocuments(docs)
        }
      } catch (err) {
        toast.error(err.message || 'Failed to load company profile')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [authLoading, user, router])

  const handleChange = (e) => {
    const { name, value } = e.target

    if (name === 'gstin') {
      const cleanGst = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 15)
      let pan = formData.pan
      if (cleanGst.length >= 12) {
        pan = cleanGst.substring(2, 12)
      }
      let matchedState = formData.state
      let matchedCode = formData.stateCode
      if (cleanGst.length >= 2) {
        const prefix = cleanGst.substring(0, 2)
        const found = INDIAN_STATES.find((s) => s.code === prefix)
        if (found) {
          matchedCode = found.code
          matchedState = found.name
        }
      }
      setFormData((prev) => ({
        ...prev,
        gstin: cleanGst,
        pan,
        state: matchedState,
        stateCode: matchedCode,
      }))
      return
    }

    if (name === 'ifscCode') {
      setFormData((prev) => ({
        ...prev,
        ifscCode: value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11),
      }))
      return
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleStateSelect = (e) => {
    const selectedCode = e.target.value
    const found = INDIAN_STATES.find((s) => s.code === selectedCode)
    if (found) {
      setFormData((prev) => ({
        ...prev,
        stateCode: found.code,
        state: found.name,
      }))
    }
  }

  const handleUploadDocument = async (e) => {
    e.preventDefault()

    if (!docTitle.trim()) {
      toast.error('Please enter a document title.')
      return
    }

    if (!selectedFile) {
      toast.error('Please select a file to upload.')
      return
    }

    const maxBytes = 10 * 1024 * 1024
    if (selectedFile.size > maxBytes) {
      toast.error('File size exceeds the 10 MB limit.')
      return
    }

    const allowedMimes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
    if (!allowedMimes.includes(selectedFile.type)) {
      toast.error('Unsupported file format. Please upload a PDF, PNG, JPG, or WebP.')
      return
    }

    try {
      setUploadingDoc(true)
      const newDoc = await uploadCompanyDocument(docTitle.trim(), selectedFile)
      toast.success('Company document uploaded successfully.')
      setDocuments((prev) => [newDoc, ...prev])
      setIsAddDocOpen(false)
      setDocTitle('')
      setSelectedFile(null)
    } catch (err) {
      toast.error(err.message || 'Failed to upload document.')
    } finally {
      setUploadingDoc(false)
    }
  }

  const handleDeleteDocument = async (docId, title) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) {
      return
    }

    try {
      setDeletingDocId(docId)
      await deleteCompanyDocument(docId)
      toast.success('Document deleted successfully.')
      setDocuments((prev) => prev.filter((d) => d.id !== docId))
    } catch (err) {
      toast.error(err.message || 'Failed to delete document.')
    } finally {
      setDeletingDocId(null)
    }
  }

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.legalName?.trim()) {
      toast.error('Legal Business Name is required.')
      return
    }

    if (!formData.gstin || formData.gstin.length !== 15) {
      toast.error('A valid 15-character GSTIN is required.')
      return
    }

    if (!formData.phone?.trim() || !formData.email?.trim()) {
      toast.error('Official phone number and email are required.')
      return
    }

    if (!formData.addressLine1?.trim() || !formData.city?.trim() || !formData.pincode?.trim()) {
      toast.error('Principal address (Address Line 1, City, Pincode) is required.')
      return
    }

    try {
      setSaving(true)
      const updated = await updateCompanyProfile(formData)
      toast.success('Seller company profile saved successfully.')
      setFormData((prev) => ({
        ...prev,
        ...updated,
      }))
    } catch (err) {
      toast.error(err.message || 'Failed to update company configuration.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-amber-700" />
        <p className="text-xs text-stone-500 font-mono tracking-wider">Loading company configuration...</p>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-stone-200 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-amber-100/80 border border-amber-300/60 flex items-center justify-center text-amber-900 shadow-xs">
              <Building2 className="w-5 h-5 text-[#6B1024]" />
            </div>
            <div>
              <h1 className="text-xl font-bold font-display tracking-tight text-stone-900">
                Seller Company Configuration
              </h1>
              <p className="text-xs text-stone-500">
                Permanent business master used for all GST Rule 46 A4 Tax Invoices and system communications.
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="submit"
            form="company-profile-form"
            disabled={saving}
            className="bg-[#6B1024] hover:bg-[#520c1b] text-white text-xs font-semibold px-4 h-9 shadow-sm flex items-center gap-1.5"
          >
            {saving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving Changes...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Save Profile</span>
              </>
            )}
          </Button>
        </div>
      </div>

      <form id="company-profile-form" onSubmit={handleSubmit} className="space-y-6">
        {/* CARD 1: Legal Business Identity */}
        <Card className="border-stone-200 shadow-xs rounded-xl overflow-hidden bg-white">
          <div className="bg-stone-50/75 border-b border-stone-200 px-5 py-3.5 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-stone-700">
              Legal Business Identity
            </h2>
          </div>
          <CardContent className="p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-stone-700">
                  Legal Business Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  name="legalName"
                  value={formData.legalName}
                  onChange={handleChange}
                  placeholder="e.g. Sridattam Enterprises Pvt Ltd"
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-stone-700">
                  Trade Name (Optional)
                </Label>
                <Input
                  name="tradeName"
                  value={formData.tradeName}
                  onChange={handleChange}
                  placeholder="e.g. Sridattam"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-stone-700">
                  GSTIN (15 Digits) <span className="text-red-500">*</span>
                </Label>
                <Input
                  name="gstin"
                  value={formData.gstin}
                  onChange={handleChange}
                  placeholder="29AAACS1234F1Z5"
                  maxLength={15}
                  className="h-9 text-xs font-mono uppercase"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-stone-700">
                  PAN (Income Tax Permanent Account Number)
                </Label>
                <Input
                  name="pan"
                  value={formData.pan}
                  onChange={handleChange}
                  placeholder="AAACS1234F"
                  maxLength={10}
                  className="h-9 text-xs font-mono uppercase"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-stone-700">
                  Official Phone Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+91 98450 99887"
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-stone-700">
                  Official Support Email <span className="text-red-500">*</span>
                </Label>
                <Input
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="care@sridattam.com"
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-stone-700">
                  Corporate Website
                </Label>
                <Input
                  name="website"
                  value={formData.website}
                  onChange={handleChange}
                  placeholder="https://sridattam.in"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-stone-700">
                  CIN / Registration Number (Optional)
                </Label>
                <Input
                  name="cin"
                  value={formData.cin}
                  onChange={handleChange}
                  placeholder="U74999KA2026PTC123456"
                  className="h-9 text-xs font-mono uppercase"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CARD 2: Registered Principal Place of Business */}
        <Card className="border-stone-200 shadow-xs rounded-xl overflow-hidden bg-white">
          <div className="bg-stone-50/75 border-b border-stone-200 px-5 py-3.5 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-amber-700" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-stone-700">
              Registered Principal Place of Business
            </h2>
          </div>
          <CardContent className="p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5 md:col-span-1">
                <Label className="text-xs font-semibold text-stone-700">
                  Address Line 1 <span className="text-red-500">*</span>
                </Label>
                <Input
                  name="addressLine1"
                  value={formData.addressLine1}
                  onChange={handleChange}
                  placeholder="Building #45, 100 Feet Ring Road"
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5 md:col-span-1">
                <Label className="text-xs font-semibold text-stone-700">
                  Address Line 2 (Optional)
                </Label>
                <Input
                  name="addressLine2"
                  value={formData.addressLine2}
                  onChange={handleChange}
                  placeholder="Area, landmark..."
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-stone-700">
                  City / Town <span className="text-red-500">*</span>
                </Label>
                <Input
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="Bengaluru"
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-stone-700">
                  State & State Code <span className="text-red-500">*</span>
                </Label>
                <select
                  value={formData.stateCode}
                  onChange={handleStateSelect}
                  className="w-full h-9 px-3 rounded-md border border-stone-200 bg-white text-xs text-stone-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  {INDIAN_STATES.map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.code} — {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-stone-700">
                  Pincode <span className="text-red-500">*</span>
                </Label>
                <Input
                  name="pincode"
                  value={formData.pincode}
                  onChange={handleChange}
                  placeholder="560078"
                  maxLength={10}
                  className="h-9 text-xs font-mono"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-stone-700">
                  Country
                </Label>
                <Input
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  placeholder="India"
                  className="h-9 text-xs bg-stone-50"
                  readOnly
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CARD 3: Bank & Payment Details */}
        <Card className="border-stone-200 shadow-xs rounded-xl overflow-hidden bg-white">
          <div className="bg-stone-50/75 border-b border-stone-200 px-5 py-3.5 flex items-center gap-2">
            <Landmark className="w-4 h-4 text-blue-600" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-stone-700">
              Bank & Payment Details
            </h2>
          </div>
          <CardContent className="p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-stone-700">
                  Bank Name
                </Label>
                <Input
                  name="bankName"
                  value={formData.bankName}
                  onChange={handleChange}
                  placeholder="State Bank of India"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-stone-700">
                  Account Number
                </Label>
                <Input
                  name="accountNumber"
                  value={formData.accountNumber}
                  onChange={handleChange}
                  placeholder="409988776655"
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-stone-700">
                  Account Holder Name
                </Label>
                <Input
                  name="accountHolder"
                  value={formData.accountHolder}
                  onChange={handleChange}
                  placeholder="Sridattam Enterprises Pvt Ltd"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-stone-700">
                  Account Type
                </Label>
                <select
                  name="accountType"
                  value={formData.accountType}
                  onChange={handleChange}
                  className="w-full h-9 px-3 rounded-md border border-stone-200 bg-white text-xs text-stone-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  <option value="Current">Current Account</option>
                  <option value="Savings">Savings Account</option>
                  <option value="Overdraft">Cash Credit / Overdraft</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-stone-700">
                  IFSC Code
                </Label>
                <Input
                  name="ifscCode"
                  value={formData.ifscCode}
                  onChange={handleChange}
                  placeholder="SBIN0004128"
                  maxLength={11}
                  className="h-9 text-xs font-mono uppercase"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-stone-700">
                  Branch Name
                </Label>
                <Input
                  name="branchName"
                  value={formData.branchName}
                  onChange={handleChange}
                  placeholder="JP Nagar Branch, Bengaluru"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-xs font-semibold text-stone-700">
                  UPI ID (VPA)
                </Label>
                <Input
                  name="upiId"
                  value={formData.upiId}
                  onChange={handleChange}
                  placeholder="sridattam@sbi"
                  className="h-9 text-xs font-mono"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CARD 4: Invoice Defaults & Tax Terms */}
        <Card className="border-stone-200 shadow-xs rounded-xl overflow-hidden bg-white">
          <div className="bg-stone-50/75 border-b border-stone-200 px-5 py-3.5 flex items-center gap-2">
            <FileText className="w-4 h-4 text-purple-600" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-stone-700">
              Tax Invoice & Receipt Preferences
            </h2>
          </div>
          <CardContent className="p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-stone-700">
                  Invoice Number Prefix
                </Label>
                <Input
                  name="invoicePrefix"
                  value={formData.invoicePrefix}
                  onChange={handleChange}
                  placeholder="SRI/26-27/"
                  className="h-9 text-xs font-mono"
                />
                <p className="text-[10px] text-stone-400">
                  Example invoice generated: <code>{formData.invoicePrefix || 'INV-'}0001</code>
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-stone-700">
                  Default Invoice Footer Notes
                </Label>
                <Input
                  name="invoiceNotes"
                  value={formData.invoiceNotes}
                  onChange={handleChange}
                  placeholder="Thank you for choosing Sridattam for your sacred daily rituals."
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-xs font-semibold text-stone-700">
                  Terms & Conditions (Printed on Tax Invoices & A4 Receipts)
                </Label>
                <Textarea
                  name="termsConditions"
                  value={formData.termsConditions}
                  onChange={handleChange}
                  rows={3}
                  placeholder="1. Goods once sold are subject to standard return policy. 2. All disputes subject to Bengaluru jurisdiction only."
                  className="text-xs"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CARD 5: Company Legal & Compliance Documents */}
        <Card className="border-stone-200 shadow-xs rounded-xl overflow-hidden bg-white">
          <div className="bg-stone-50/75 border-b border-stone-200 px-5 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-stone-700">
                  Company Legal & Compliance Documents
                </h2>
                <p className="text-[11px] text-stone-400 font-normal">
                  Official certificates, licenses, and registration files for verification & accounting.
                </p>
              </div>
            </div>
            <Button
              type="button"
              onClick={() => {
                setDocTitle('')
                setSelectedFile(null)
                setIsAddDocOpen(true)
              }}
              variant="outline"
              size="sm"
              className="h-8 text-xs font-medium border-stone-300 hover:bg-stone-100 flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Document</span>
            </Button>
          </div>
          <CardContent className="p-5">
            {documents.length === 0 ? (
              <div className="border border-dashed border-stone-200 rounded-lg p-8 text-center bg-stone-50/40">
                <UploadCloud className="w-8 h-8 text-stone-400 mx-auto mb-2" />
                <h3 className="text-xs font-semibold text-stone-700">No documents added yet</h3>
                <p className="text-[11px] text-stone-400 mt-1 max-w-sm mx-auto">
                  Store official compliance documents like GST Certificate, Udyam Registration, PAN Card, or Bank Cheque.
                </p>
                <Button
                  type="button"
                  onClick={() => setIsAddDocOpen(true)}
                  size="sm"
                  className="mt-3.5 bg-[#6B1024] hover:bg-[#520c1b] text-white text-xs h-8"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Add First Document
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {documents.map((doc) => {
                  const isPdf = doc.mimeType?.includes('pdf') || doc.fileName?.toLowerCase().endsWith('.pdf')
                  return (
                    <div
                      key={doc.id}
                      className="border border-stone-200 rounded-lg p-3.5 bg-stone-50/30 hover:bg-white hover:border-stone-300 transition-all flex items-start justify-between gap-3 shadow-xs"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${
                            isPdf
                              ? 'bg-rose-50 text-rose-600 border-rose-200'
                              : 'bg-blue-50 text-blue-600 border-blue-200'
                          }`}
                        >
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-stone-900 truncate" title={doc.title}>
                            {doc.title}
                          </h4>
                          <p className="text-[11px] text-stone-500 truncate" title={doc.fileName}>
                            {doc.fileName}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-stone-400 font-mono">
                              {formatFileSize(doc.fileSize)}
                            </span>
                            <span className="text-[10px] text-stone-300">•</span>
                            <span className="text-[10px] text-stone-400">
                              {new Date(doc.createdAt).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <a
                          href={doc.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 text-stone-500 hover:text-stone-800 hover:bg-stone-200/60 rounded-md transition"
                          title="Open document in new tab"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteDocument(doc.id, doc.title)}
                          disabled={deletingDocId === doc.id}
                          className="h-7 w-7 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-md"
                          title="Delete document"
                        >
                          {deletingDocId === doc.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bottom Save bar */}
        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            disabled={saving}
            className="bg-[#6B1024] hover:bg-[#520c1b] text-white text-xs font-semibold px-6 h-10 shadow-sm flex items-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving Profile...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save All Changes</span>
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Add Document Dialog */}
      <Dialog open={isAddDocOpen} onOpenChange={setIsAddDocOpen}>
        <DialogContent className="sm:max-w-md bg-white border-stone-200">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-stone-900 font-display">
              Add Company Document
            </DialogTitle>
            <DialogDescription className="text-xs text-stone-500">
              Upload an official certificate or compliance document to store in your company records.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUploadDocument} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-stone-700">
                Document Name / Title <span className="text-red-500">*</span>
              </Label>
              <Input
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                placeholder="e.g. GST Registration Certificate (REG-06)"
                className="h-9 text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-stone-700">
                Choose Document File <span className="text-red-500">*</span>
              </Label>
              <div className="border border-dashed border-stone-200 rounded-lg p-4 bg-stone-50/50 text-center hover:bg-stone-50 transition cursor-pointer relative">
                <input
                  type="file"
                  accept=".pdf,image/png,image/jpeg,image/webp"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      setSelectedFile(e.target.files[0])
                    }
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  required={!selectedFile}
                />
                <UploadCloud className="w-6 h-6 text-stone-400 mx-auto mb-1.5" />
                {selectedFile ? (
                  <div className="space-y-0.5">
                    <p className="text-xs font-semibold text-stone-800 truncate px-2">{selectedFile.name}</p>
                    <p className="text-[10px] text-stone-400 font-mono">{formatFileSize(selectedFile.size)}</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs text-stone-700 font-medium">
                      Click to choose or drag & drop file
                    </p>
                    <p className="text-[10px] text-stone-400 mt-0.5">
                      PDF, PNG, JPG, or WebP (max 10 MB)
                    </p>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="pt-2 gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAddDocOpen(false)}
                disabled={uploadingDoc}
                className="h-9 text-xs border-stone-200"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={uploadingDoc || !docTitle.trim() || !selectedFile}
                className="h-9 text-xs bg-[#6B1024] hover:bg-[#520c1b] text-white flex items-center gap-1.5"
              >
                {uploadingDoc ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    <span>Upload Document</span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
