import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, CheckCircle2, XCircle, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface AutomationLogsProps {
  logs: any[];
}

export const AutomationLogs = ({ logs }: AutomationLogsProps) => {
  if (logs.length === 0) {
    return (
      <Card className="p-12 text-center">
        <Activity className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">No automation logs yet</p>
        <p className="text-sm text-muted-foreground mt-2">
          Logs will appear here when automations run
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {logs.map((log) => (
        <Card key={log.id} className="p-4">
          <div className="flex items-start gap-3">
            <div className="mt-1">
              {log.status === 'success' && (
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              )}
              {log.status === 'failed' && (
                <XCircle className="w-5 h-5 text-destructive" />
              )}
              {log.status === 'pending' && (
                <Clock className="w-5 h-5 text-amber-500" />
              )}
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant={
                  log.status === 'success' ? 'default' :
                  log.status === 'failed' ? 'destructive' : 
                  'secondary'
                }>
                  {log.status}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(log.executed_at), { addSuffix: true })}
                </span>
              </div>

              {log.error_message && (
                <p className="text-sm text-destructive mt-2">
                  Error: {log.error_message}
                </p>
              )}

              {log.payload && (
                <details className="mt-2">
                  <summary className="text-sm text-muted-foreground cursor-pointer">
                    View payload
                  </summary>
                  <pre className="text-xs bg-muted p-2 rounded mt-2 overflow-auto max-h-32">
                    {JSON.stringify(log.payload, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};