import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ProcessErrorProps {
  error: string;
  reconnect: () => void;
}

export function ProcessError({ error, reconnect }: ProcessErrorProps) {
  return (
    <div className="flex items-center justify-between p-4 bg-red-500/10 text-red-500">
      <div className="flex items-center">
        <AlertCircle className="h-4 w-4 mr-2" />
        <span>Error: {error}</span>
      </div>
      <Button 
        variant="outline" 
        size="default" 
        onClick={reconnect}
        className="text-xs border-red-500/20 hover:bg-red-500/10"
      >
        Retry
      </Button>
    </div>
  );
}