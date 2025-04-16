import React from 'react';
import { ArrowUpDown } from 'lucide-react';
import { ProcessInfo } from '@/hooks/useProcessMetrics';



type SortField = 'name' | 'pid' | 'cpu' | 'memory';
type SortDirection = 'asc' | 'desc';

interface ProcessTableProps {
  processes: ProcessInfo[];
  sortField: SortField;
  sortDirection: SortDirection;
  handleSort: (field: SortField) => void;
  showAllProcesses: boolean;
  logicalCores: number;
}

export function ProcessTable({ 
  processes, 
  sortField, 
  sortDirection, 
  handleSort,
  showAllProcesses,
  logicalCores
}: ProcessTableProps) {

  
  // Format bytes to human-readable format
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 MB';
    const megabytes = bytes / (1024 * 1024);
    return `${megabytes.toFixed(2)} MB`;
  };


  // Sort processes based on current sort field and direction
  const sortedProcesses = React.useMemo(() => {
    return [...processes].sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'pid':
          comparison = a.instances - b.instances;
          break;
        case 'cpu':
          comparison = a.cpu - b.cpu;
          break;
        case 'memory':
          comparison = a.memory - b.memory;
          break;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [processes, sortField, sortDirection]);

  // Render sortable column header
  const renderSortableHeader = (label: string, field: SortField) => (
    <div 
      className="flex items-center cursor-pointer select-none" 
      onClick={() => handleSort(field)}
    >
      <span>{label}</span>
      <ArrowUpDown 
        className={`ml-1 h-4 w-4 ${sortField === field ? 'opacity-100' : 'opacity-30'}`} 
        style={{ 
          transform: sortField === field && sortDirection === 'asc' ? 'rotate(180deg)' : 'none',
          transition: 'transform 0.2s'
        }}
      />
    </div>
  );

  // Normalize CPU value for display (cap at 100% for progress bar)
  const normalizeCpuValue = (value: number): number => {
    // Cap at 100%
    return Math.min(value, 100);
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-muted/30 border-y border-border">
          <tr>
            <th className="text-left p-3 font-medium text-muted-foreground text-sm">
              {renderSortableHeader('Process Name', 'name')}
            </th>
            <th className="text-left p-3 font-medium text-muted-foreground text-sm">
              {renderSortableHeader(showAllProcesses ? 'PID' : 'Instances', 'pid')}
            </th>
            <th className="text-right p-3 font-medium text-muted-foreground text-sm">
              {renderSortableHeader('CPU', 'cpu')}
            </th>
            <th className="text-right p-3 font-medium text-muted-foreground text-sm">
              {renderSortableHeader('Memory', 'memory')}
            </th>
          </tr>
        </thead>
        
        <tbody>
          {sortedProcesses.map((process, index) => (
            <tr 
              key={index} 
              className="border-b border-border hover:bg-muted/20 transition-colors"
            >
              <td className="p-3 text-sm truncate max-w-[200px]" title={process.name}>
                {process.name}
              </td>
              <td className="p-3 text-sm text-muted-foreground">
                {process.instances}
              </td>
              <td className="p-3 text-sm text-right">
                <div className="flex items-center justify-end gap-2">
                  <div className="w-16 bg-muted rounded-full h-1.5 overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${
                        process.cpu > 50 ? 'bg-orange-500' : 
                        process.cpu > 20 ? 'bg-blue-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${normalizeCpuValue(process.cpu)}%` }}
                    />
                  </div>
                  <span className={`
                    ${process.cpu > 50 ? 'text-orange-500' : 
                    process.cpu > 20 ? 'text-blue-500' : 'text-green-500'}
                  `}>
                    {process.cpu.toFixed(1)}%
                  </span>
                </div>
              </td>
              <td className="p-3 text-sm text-right">
                {process.memory > 0 
                    ? formatBytes(process.memory)
                    : '0 B'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}