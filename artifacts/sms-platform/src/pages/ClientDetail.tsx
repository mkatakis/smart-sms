import { useState } from "react";
import { Link, useParams, useLocation } from "wouter";
import { 
  useGetClient, 
  useUpdateClient, 
  useTopupClientCredits, 
  useListMessages,
  getGetClientQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EntityStatusBadge, MessageStatusBadge } from "@/components/StatusBadges";
import { formatCredits, formatDate } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Edit, Save, CreditCard, Contact, MessageSquare, Building } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const updateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  phone: z.string().optional(),
  status: z.string().min(1, "Status is required"),
});

const topupSchema = z.object({
  amount: z.coerce.number().min(1, "Must add at least 1 credit"),
  description: z.string().optional(),
});

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const clientId = Number(id);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [isTopupOpen, setIsTopupOpen] = useState(false);

  const { data: client, isLoading, isError } = useGetClient(clientId, { 
    query: { enabled: !!clientId, queryKey: getGetClientQueryKey(clientId) } 
  });

  const { data: messages } = useListMessages({ clientId, limit: 50 });

  const updateClient = useUpdateClient();
  const topupClient = useTopupClientCredits();

  const updateForm = useForm<z.infer<typeof updateSchema>>({
    resolver: zodResolver(updateSchema),
    values: {
      name: client?.name || "",
      email: client?.email || "",
      phone: client?.phone || "",
      status: client?.status || "active",
    }
  });

  const topupForm = useForm<z.infer<typeof topupSchema>>({
    resolver: zodResolver(topupSchema),
    defaultValues: { amount: 100, description: "Manual top-up" }
  });

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <h2 className="text-xl font-semibold">Client Not Found</h2>
        <Button onClick={() => setLocation("/clients")}>Back to Clients</Button>
      </div>
    );
  }

  if (isLoading || !client) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  const onUpdateSubmit = (data: z.infer<typeof updateSchema>) => {
    updateClient.mutate({ id: clientId, data }, {
      onSuccess: () => {
        setIsEditing(false);
        queryClient.invalidateQueries({ queryKey: getGetClientQueryKey(clientId) });
        toast({ title: "Client updated successfully" });
      }
    });
  };

  const onTopupSubmit = (data: z.infer<typeof topupSchema>) => {
    topupClient.mutate({ id: clientId, data }, {
      onSuccess: () => {
        setIsTopupOpen(false);
        topupForm.reset();
        queryClient.invalidateQueries({ queryKey: getGetClientQueryKey(clientId) });
        toast({ title: "Credits added successfully" });
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/clients")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
              {client.name}
              <EntityStatusBadge status={client.status} />
            </h1>
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Contact className="w-3.5 h-3.5" />
              C-{client.id} • Reseller ID: {client.resellerId}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Dialog open={isTopupOpen} onOpenChange={setIsTopupOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:text-indigo-500 dark:hover:bg-indigo-950/30">
                <CreditCard className="w-4 h-4 mr-2" />
                Add Credits
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Credits to Client</DialogTitle>
              </DialogHeader>
              <Form {...topupForm}>
                <form onSubmit={topupForm.handleSubmit(onTopupSubmit)} className="space-y-4">
                  <FormField
                    control={topupForm.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount</FormLabel>
                        <FormControl><Input type="number" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={topupForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl><Input placeholder="Reason for topup" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={topupClient.isPending}>
                    {topupClient.isPending ? "Processing..." : "Add Credits"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-6 md:col-span-1">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex justify-between items-center">
                <CardTitle>Profile Details</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setIsEditing(!isEditing)}>
                  {isEditing ? "Cancel" : <Edit className="w-4 h-4" />}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <Form {...updateForm}>
                  <form onSubmit={updateForm.handleSubmit(onUpdateSubmit)} className="space-y-4">
                    <FormField control={updateForm.control} name="name" render={({ field }) => (
                      <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                    )} />
                    <FormField control={updateForm.control} name="email" render={({ field }) => (
                      <FormItem><FormLabel>Email</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                    )} />
                    <FormField control={updateForm.control} name="phone" render={({ field }) => (
                      <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                    )} />
                    <FormField control={updateForm.control} name="status" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="suspended">Suspended</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )} />
                    <Button type="submit" className="w-full" disabled={updateClient.isPending}>
                      <Save className="w-4 h-4 mr-2" /> Save Changes
                    </Button>
                  </form>
                </Form>
              ) : (
                <div className="space-y-4 text-sm">
                  <div className="grid grid-cols-3">
                    <span className="text-muted-foreground col-span-1">Email</span>
                    <span className="font-medium col-span-2">{client.email}</span>
                  </div>
                  <div className="grid grid-cols-3">
                    <span className="text-muted-foreground col-span-1">Phone</span>
                    <span className="font-medium col-span-2">{client.phone || "—"}</span>
                  </div>
                  <div className="grid grid-cols-3">
                    <span className="text-muted-foreground col-span-1">Joined</span>
                    <span className="font-medium col-span-2">{formatDate(client.createdAt)}</span>
                  </div>
                  <div className="grid grid-cols-3">
                    <span className="text-muted-foreground col-span-1">Parent</span>
                    <span className="font-medium col-span-2">
                      <Link href={`/resellers/${client.resellerId}`} className="text-primary hover:underline flex items-center gap-1">
                        <Building className="w-3 h-3" /> Reseller R-{client.resellerId}
                      </Link>
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-indigo-50/50 border-indigo-100 dark:bg-indigo-950/10 dark:border-indigo-900/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                <CreditCard className="w-4 h-4" />
                Credit Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-mono font-bold text-indigo-600 dark:text-indigo-400">
                {formatCredits(client.credits)}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2">
          <Card className="h-full">
            <CardHeader className="py-4 border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-muted-foreground" />
                Message History
              </CardTitle>
              <CardDescription>Latest SMS dispatched by this client.</CardDescription>
            </CardHeader>
            <div>
              {!messages?.length ? (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  No message history found for this client.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>To</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-1/2">Body</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {messages.map(msg => (
                      <TableRow key={msg.id} className="text-sm">
                        <TableCell className="text-xs text-muted-foreground">{formatDate(msg.createdAt)}</TableCell>
                        <TableCell className="font-mono">{msg.toNumber}</TableCell>
                        <TableCell><MessageStatusBadge status={msg.status} /></TableCell>
                        <TableCell className="max-w-xs truncate text-xs" title={msg.body}>{msg.body}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
