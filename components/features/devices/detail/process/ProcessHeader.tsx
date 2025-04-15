import React from 'react';
import { CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface ProcessHeaderProps {
  isConnected: boolean;
  isLoading: boolean;
  lastUpdated: number | null;
  totalProcesses: number;
  showAllProcesses: boolean;
  setShowAllProcesses: (value: boolean) => void;
  reconnect: () => void;
}

export function ProcessHeader({
  isConnected,
  isLoading,
  lastUpdated,
  totalProcesses,
  showAllProcesses,
  setShowAllProcesses,
  reconnect
}: ProcessHeaderProps) {
  return (
    <CardHeader className="bg-muted/50 pb-3">
      <div className="flex justify-between items-center">
        <CardTitle className="text-lg">Running Processes</CardTitle>
        <div className="flex items-center gap-2">
          {isConnected ? (
            <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 px-2 py-0 text-xs">Live</Badge>
          ) : (
            <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 px-2 py-0 text-xs">Disconnected</Badge>
          )}
          {lastUpdated && (
            <span className="text-xs text-muted-foreground">
              Updated: {new Date(lastUpdated).toLocaleTimeString()}
            </span>
          )}
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7" 
            onClick={reconnect}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>
      
      <div className="flex justify-between items-center mt-2">
        <p className="text-sm text-muted-foreground">
          Total processes: {totalProcesses}
        </p>
        
        <div className="flex items-center space-x-2">
          <Switch 
            id="show-all-processes" 
            checked={showAllProcesses}
            onCheckedChange={setShowAllProcesses}
          />
          <Label htmlFor="show-all-processes" className="text-xs">Show all processes</Label>
        </div>
      </div>
    </CardHeader>
  );
}