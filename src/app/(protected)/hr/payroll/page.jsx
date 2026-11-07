import { redirect } from 'next/navigation'

export default function PayrollOverviewPage() {
  redirect('/hr/payroll/odoo-sync')
}
