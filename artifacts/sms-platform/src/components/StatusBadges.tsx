import { Badge } from "@/components/ui/badge";

export function EntityStatusBadge({ status }: { status: string }) {
  const variant = 
    status === "active" ? "default" :
    status === "suspended" ? "destructive" :
    "secondary";

  const colorClass = 
    status === "active" ? "bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400" :
    status === "suspended" ? "bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400" :
    "bg-yellow-100 text-yellow-800 hover:bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400";

  return (
    <Badge className={`uppercase text-[10px] tracking-wider font-semibold px-2 py-0.5 rounded-sm shadow-none ${colorClass}`}>
      {status}
    </Badge>
  );
}

export function MessageStatusBadge({ status }: { status: string }) {
  const colorClass = 
    status === "delivered" ? "bg-green-100 text-green-800 border-transparent dark:bg-green-900/30 dark:text-green-400" :
    status === "sent" ? "bg-blue-100 text-blue-800 border-transparent dark:bg-blue-900/30 dark:text-blue-400" :
    status === "failed" ? "bg-red-100 text-red-800 border-transparent dark:bg-red-900/30 dark:text-red-400" :
    "bg-gray-100 text-gray-800 border-transparent dark:bg-gray-800 dark:text-gray-300";

  return (
    <Badge variant="outline" className={`uppercase text-[10px] tracking-wider font-semibold px-2 py-0.5 rounded-sm ${colorClass}`}>
      {status}
    </Badge>
  );
}
