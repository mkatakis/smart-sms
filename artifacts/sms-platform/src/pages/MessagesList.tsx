import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useListMessages } from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MessageStatusBadge } from "@/components/StatusBadges";
import { formatCredits, formatDate } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function MessagesList() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  const { data: messages, isLoading } = useListMessages({ 
    status: statusFilter !== "all" ? statusFilter : undefined,
    limit: 100
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Message Log</h1>
          <p className="text-sm text-muted-foreground">Platform-wide SMS delivery history.</p>
        </div>
      </div>

      <Card>
        <div className="p-4 border-b flex items-center gap-4">
          <div className="w-48">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="queued">Queued</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {isLoading ? (
          <div className="p-4 space-y-4">
            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : !messages?.length ? (
          <div className="p-8 text-center text-muted-foreground">
            <h3 className="text-lg font-medium text-foreground">No messages found</h3>
            <p className="text-sm">No messages match the current filters.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead className="w-1/3">Body</TableHead>
                <TableHead>Ownership</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {messages.map((msg) => (
                <TableRow key={msg.id} className="text-sm">
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDate(msg.createdAt)}
                  </TableCell>
                  <TableCell className="font-mono">{msg.fromNumber}</TableCell>
                  <TableCell className="font-mono">{msg.toNumber}</TableCell>
                  <TableCell>
                    <MessageStatusBadge status={msg.status} />
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {formatCredits(msg.creditsCost)}
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <p className="truncate text-xs" title={msg.body}>{msg.body}</p>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {msg.resellerId && (
                      <Link href={`/resellers/${msg.resellerId}`} className="hover:underline text-primary">
                        R-{msg.resellerId}
                      </Link>
                    )}
                    {msg.clientId && (
                      <>
                        {" / "}
                        <Link href={`/clients/${msg.clientId}`} className="hover:underline text-indigo-500">
                          C-{msg.clientId}
                        </Link>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
