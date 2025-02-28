"use client"

import {
  type ColumnDef,
  ColumnFiltersState,
  flexRender,
  SortingState,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useTranslations } from "next-intl"

import { Button } from "@/components/ui/button" 
import { Input } from "@/components/ui/input"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { useState } from "react"

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  pagination?: {
    enabled?: boolean
    pageSize?: number
    showPageSize?: boolean
    showPageNumber?: boolean
  }
  filtering?: {
    enabled?: boolean
    column?: string
    placeholder?: string
  }
}

export function DataTable<TData, TValue>({
  columns,
  data,
  pagination = {
    enabled: false,
    pageSize: 10,
    showPageSize: true,
    showPageNumber: false
  },
  filtering = {
    enabled: false,
    column: '',
    placeholder: "Поиск..."
  }
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const t = useTranslations('components.dataTable')
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    ...(pagination.enabled && {
      getPaginationRowModel: getPaginationRowModel(),
      initialState: {
        pagination: {
          pageSize: pagination.pageSize
        },
      },
    }),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters
    }

  })

  return (
    <div>
      {filtering.enabled && filtering.column && (
          <div className="flex items-center gap-4 pt-1 pb-4">
              <Input
                placeholder={filtering.placeholder}
                value={(table.getColumn(filtering.column)?.getFilterValue() as string) ?? ''}
                onChange={(event) => {
                  const col = table.getColumn(filtering.column!);
                  if (col) {
                    col.setFilterValue(event.target.value);
                  }
                }}
                className="max-w-sm"
              />
          </div>
      )}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  {t('notFound')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      {pagination.enabled && (
          <div className="flex items-center justify-between space-x-2 py-4">
            {pagination.showPageSize && (
              <select
                value={table.getState().pagination.pageSize}
                onChange={e => {
                  table.setPageSize(Number(e.target.value))
                }}
                className="h-8 w-[70px] rounded-md border border-border bg-background text-center"
              >
                {[10, 20, 30, 40, 50].map(pageSize => (
                  <option key={pageSize} value={pageSize} className='texte-center'>
                    {pageSize}
                  </option>
                ))}
              </select>
            )}
            
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="h-8 w-8"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <Button
                variant="outline"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="h-8 w-8"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
        
    </div>
    
  )
}
