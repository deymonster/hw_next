import React, { useState } from 'react';
import { useProcessMetrics } from '@/hooks/useProcessMetrics';
import { Card, CardContent } from '@/components/ui/card';
import { ProcessHeader } from './ProcessHeader';
import { ProcessTable } from './ProcessTable';
import { ProcessError } from './ProcessError';
import { ProcessSkeleton } from './ProcessSkeleton';

interface ProcessListProps {
  deviceId: string;
  className?: string;
}

type SortField = 'name' | 'pid' | 'cpu' | 'memory';
type SortDirection = 'asc' | 'desc';

export function ProcessList({ deviceId, className = '' }: ProcessListProps) {
  const { isLoading, isConnected, error, data, lastUpdated, reconnect } = useProcessMetrics(deviceId);
  const [sortField, setSortField] = useState<SortField>('cpu');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [showAllProcesses, setShowAllProcesses] = useState(false);

  // Handle column sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field and default to descending
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const logicalCores = 1;

  return (
    <Card className={`overflow-hidden ${className}`}>
      <ProcessHeader
        isConnected={isConnected}
        isLoading={isLoading}
        lastUpdated={lastUpdated}
        totalProcesses={data?.total || 0}
        showAllProcesses={showAllProcesses}
        setShowAllProcesses={setShowAllProcesses}
        reconnect={reconnect}
      />

      <CardContent className="p-0">
        {error && <ProcessError error={error} reconnect={reconnect} />}

        {isLoading && !data && <ProcessSkeleton />}

        {data && data.processes && data.processes.length > 0 ? (
          <ProcessTable
            processes={data.processes}
            sortField={sortField}
            sortDirection={sortDirection}
            handleSort={handleSort}
            showAllProcesses={showAllProcesses}
            logicalCores={logicalCores}
          />
        ) : (
          !isLoading && !error && (
            <div className="flex items-center justify-center p-8 text-muted-foreground">
              No processes found
            </div>
          )
        )}
      </CardContent>
    </Card>
  );
}