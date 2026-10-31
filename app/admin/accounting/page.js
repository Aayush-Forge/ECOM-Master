import AccountingFinanceView from '@/components/dashboard/accounting-finance-view'

export const metadata = {
  title: 'Accounting & Finance | Sridattam Admin',
  description: 'Track sales, reconcile payments, manage GST and export your financial records.',
}

export default function AdminAccountingPage() {
  return <AccountingFinanceView />
}
