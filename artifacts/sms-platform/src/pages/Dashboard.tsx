import { useGetDashboardStats, useGetMessageStats, useGetGatewayBalance } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCredits, formatDate } from "@/lib/utils";
import { MessageStatusBadge } from "@/components/StatusBadges";
import { Users, Contact, MessageSquare, CreditCard, Activity, AlertTriangle, ExternalLink } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from "recharts";
import { useAuth } from "@/contexts/AuthContext";

function GatewayBalanceCard() {
  const { data, isLoading, isError } = useGetGatewayBalance();

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">GatewayAPI Balance</CardTitle>
          <CreditCard className="w-4 h-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-24 mb-1" />
          <Skeleton className="h-4 w-32" />
        </CardContent>
      </Card>
    );
  }

  if (isError || !data) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">GatewayAPI Balance</CardTitle>
          <CreditCard className="w-4 h-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground mt-2">Balance unavailable</div>
        </CardContent>
      </Card>
    );
  }

  const creditNum = parseFloat(data.credit);
  const isLow = creditNum < 10;
  
  const currencyMap: Record<string, string> = {
    EUR: "€",
    USD: "$",
    GBP: "£",
  };
  const symbol = currencyMap[data.currency] || data.currency + " ";

  return (
    <Card className={isLow ? "border-red-500/50" : ""}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          GatewayAPI Balance
          {isLow && <AlertTriangle className="w-4 h-4 text-orange-500" />}
        </CardTitle>
        <CreditCard className={`w-4 h-4 ${isLow ? "text-orange-500" : "text-muted-foreground"}`} />
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold font-mono ${isLow ? "text-orange-500" : ""}`}>
          {symbol}{creditNum.toFixed(2)} {data.currency}
        </div>
        <div className="flex items-center justify-between mt-1">
          <p className="text-xs text-muted-foreground">remaining</p>
          <a href="https://gatewayapi.com" target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
            Top up <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: messageStats, isLoading: messageStatsLoading } = useGetMessageStats();

  if (statsLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Platform Overview</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-96 lg:col-span-2" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  const statCards = [
    { title: "Active Resellers", value: stats?.activeResellers ?? 0, total: stats?.totalResellers ?? 0, icon: Users, color: "text-blue-500" },
    { title: "Active Clients", value: stats?.activeClients ?? 0, total: stats?.totalClients ?? 0, icon: Contact, color: "text-indigo-500" },
    { title: "Messages Sent", value: formatCredits(stats?.totalMessagesSent), icon: MessageSquare, color: "text-primary" },
    { title: "Credits Issued", value: formatCredits(stats?.totalCreditsIssued), icon: CreditCard, color: "text-green-500" },
  ];

  const chartData = messageStats?.map(s => ({
    name: s.status.toUpperCase(),
    value: s.count
  })) || [];

  const COLORS = {
    delivered: "hsl(var(--primary))",
    sent: "#3b82f6",
    failed: "hsl(var(--destructive))",
    queued: "#9ca3af"
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Platform Overview</h1>
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted px-3 py-1 rounded-md">
          <Activity className="w-4 h-4" />
          Live Data
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {user?.role === "admin" && <GatewayBalanceCard />}
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {card.title}
                </CardTitle>
                <Icon className={`w-4 h-4 ${card.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono">{card.value}</div>
                {card.total !== undefined && (
                  <p className="text-xs text-muted-foreground mt-1">
                    of {card.total} total registered
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Delivery Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {messageStatsLoading ? (
              <div className="h-[300px] flex items-center justify-center">
                <Skeleton className="w-full h-full" />
              </div>
            ) : chartData.length > 0 ? (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}`} />
                    <Tooltip 
                      cursor={{ fill: 'var(--muted)' }}
                      contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)' }}
                    />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[entry.name.toLowerCase() as keyof typeof COLORS] || "hsl(var(--primary))"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground border border-dashed rounded-md">
                No message data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Messages</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats?.recentMessages && stats.recentMessages.length > 0 ? (
                stats.recentMessages.map((msg) => (
                  <div key={msg.id} className="flex flex-col gap-2 p-3 rounded-lg border bg-card text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-medium">{msg.toNumber}</span>
                      <MessageStatusBadge status={msg.status} />
                    </div>
                    <p className="text-muted-foreground line-clamp-2 text-xs">{msg.body}</p>
                    <div className="text-[10px] text-muted-foreground text-right mt-1">
                      {formatDate(msg.createdAt)}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-sm text-muted-foreground py-8">
                  No recent messages
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
