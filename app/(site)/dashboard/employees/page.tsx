
import { EmployeesTable } from '@/components/features/employee/table/EmployeeTable'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'


export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('dashboard.employees.header')

  return {
    title: t('heading'),
    description: t('description'),
    robots: {
      index: false,
      follow: false
    }
  }
}

export default function DepartmentsPage() {
  return (
    <>
      <EmployeesTable />
    </>
       
  )
}