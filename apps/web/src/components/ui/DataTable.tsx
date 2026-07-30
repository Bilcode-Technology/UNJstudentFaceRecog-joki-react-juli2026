import React from 'react';

export interface Column<T> {
  key?: string;
  accessorKey?: string;
  header: React.ReactNode;
  render?: (row: T, index: number) => React.ReactNode;
  cell?: (row: T, index: number) => React.ReactNode;
  className?: string;
  headerClassName?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T, index: number) => string | number;
  emptyMessage?: string;
  loading?: boolean;
  maxHeightClassName?: string;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  emptyMessage = 'Tidak ada data ditemukan.',
  loading = false,
  maxHeightClassName = 'max-h-[600px]',
}: DataTableProps<T>) {
  return (
    <div className={`w-full overflow-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs ${maxHeightClassName}`}>
      <table className="w-full text-left text-sm text-slate-900 dark:text-slate-100 border-collapse">
        <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
          <tr>
            {columns.map((col, idx) => {
              const colKey = col.key || col.accessorKey || `col-${idx}`;
              return (
                <th
                  key={colKey}
                  scope="col"
                  className={`px-4 py-3.5 whitespace-nowrap ${col.headerClassName || ''}`}
                >
                  {col.header}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-slate-500">
                <div className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span>Memuat data...</span>
                </div>
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-slate-500">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, index) => (
              <tr key={keyExtractor(row, index)} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                {columns.map((col, idx) => {
                  const colKey = col.key || col.accessorKey || `col-${idx}`;
                  const renderFn = col.cell || col.render;
                  const valueKey = col.accessorKey || col.key;
                  
                  return (
                    <td key={colKey} className={`px-4 py-3.5 whitespace-nowrap ${col.className || ''}`}>
                      {renderFn ? renderFn(row, index) : valueKey ? (row as any)[valueKey] : null}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default DataTable;
