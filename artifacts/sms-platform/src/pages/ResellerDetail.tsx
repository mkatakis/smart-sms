import { useState } from "react";
import { Link, useParams, useLocation } from "wouter";
import { 
  useGetReseller, 
  useUpdateReseller, 
  useTopupResellerCredits, 
  useListClients, 
  useListMessages,
  getGetResellerQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EntityStatusBadge, MessageStatusBadge } from "@/components/StatusBadges";
import { formatCredits, formatDate } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Edit, Save, CreditCard, Building, Contact, MessageSquare } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  company: z.string().optional(),
  phone: z.string().optional(),
  status: z.string().min(1, "Status is required"),
});

const topupSchema = z.object({
  amount: z.coerce.number().min(1, "Must add at least 1 credit"),
  description: z.string().optional(),
});

export default function ResellerDetail() {
  const { id } = useParams<{ id: string }>();
  const resellerId = Number(id);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [isTopupOpen, setIsTopupOpen] = useState(false);

  const { data: reseller, isLoading, isError } = useGetReseller(resellerId, { 
    query: { enabled: !!resellerId, queryKey: getGetResellerQueryKey(resellerId) } 
  });

  const { data: clients } = useListClients({ resellerId });
  const { data: messages } = useListMessages({ resellerId, limit: 50 });

  const updateReseller = useUpdateReseller();
  const topupReseller = useTopupResellerCredits();

  const updateForm = useForm<z.infer<typeof updateSchema>>({
    resolver: zodResolver(updateSchema),
    values: {
      name: reseller?.name || "",
      email: reseller?.email || "",
      company: reseller?.company || "",
      phone: reseller?.phone || "",
      status: reseller?.status || "active",
    }
  });

  const topupForm = useForm<z.infer<typeof topupSchema>>({
    resolver: zodResolver(topupSchema),
    defaultValues: { amount: 100, description: "Manual top-up" }
  });

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <h2 className="text-xl font-semibold">Reseller Not Found</h2>
        <Button onClick={() => setLocation("/resellers")}>Back to Resellers</Button>
      </div>
    );
  }

  if (isLoading || !reseller) {
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
    updateReseller.mutate({ id: resellerId, data }, {
      onSuccess: () => {
        setIsEditing(false);
        queryClient.invalidateQueries({ queryKey: getGetResellerQueryKey(resellerId) });
        toast({ title: "Reseller updated successfully" });
      }
    });
  };

  const onTopupSubmit = (data: z.infer<typeof topupSchema>) => {
    topupReseller.mutate({ id: resellerId, data }, {
      onSuccess: () => {
        setIsTopupOpen(false);
        topupForm.reset();
        queryClient.invalidateQueries({ queryKey: getGetResellerQueryKey(resellerId) });
        toast({ title: "Credits added successfully" });
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/resellers")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
              {reseller.name}
              <EntityStatusBadge status={reseller.status} />
            </h1>
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Building className="w-3.5 h-3.5" />
              {reseller.company || "No Company"} • R-{reseller.id}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Dialog open={isTopupOpen} onOpenChange={setIsTopupOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:text-green-500 dark:hover:bg-green-950/30">
                <CreditCard className="w-4 h-4 mr-2" />
                Add Credits
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Credits to Reseller</DialogTitle>
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
                  <Button type="submit" className="w-full" disabled={topupReseller.isPending}>
                    {topupReseller.isPending ? "Processing..." : "Add Credits"}
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
                    <FormField control={updateForm.control} name="company" render={({ field }) => (
                      <FormItem><FormLabel>Company</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
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
                            <SelectItem value="pending">Pending</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )} />
                    <Button type="submit" className="w-full" disabled={updateReseller.isPending}>
                      <Save className="w-4 h-4 mr-2" /> Save Changes
                    </Button>
                  </form>
                </Form>
              ) : (
                <div className="space-y-4 text-sm">
                  <div className="grid grid-cols-3">
                    <span className="text-muted-foreground col-span-1">Email</span>
                    <span className="font-medium col-span-2">{reseller.email}</span>
                  </div>
                  <div className="grid grid-cols-3">
                    <span className="text-muted-foreground col-span-1">Phone</span>
                    <span className="font-medium col-span-2">{reseller.phone || "—"}</span>
                  </div>
                  <div className="grid grid-cols-3">
                    <span className="text-muted-foreground col-span-1">Joined</span>
                    <span className="font-medium col-span-2">{formatDate(reseller.createdAt)}</span>
                  </div>
                  {reseller.apiKey && (
                    <div className="grid grid-cols-3">
                      <span className="text-muted-foreground col-span-1">API Key</span>
                      <span className="font-mono text-xs truncate col-span-2 bg-muted px-1.5 py-0.5 rounded">
                        {reseller.apiKey}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-primary/5 border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-primary" />
                Credit Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-mono font-bold text-primary">
                {formatCredits(reseller.credits)}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2">
          <Tabs defaultValue="clients" className="w-full">
            <TabsList className="w-full justify-start grid w-full grid-cols-2">
              <TabsTrigger value="clients" className="flex items-center gap-2">
                <Contact className="w-4 h-4" /> Clients
              </TabsTrigger>
              <TabsTrigger value="messages" className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" /> Message Log
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="clients" className="mt-4">
              <Card>
                <CardHeader className="py-4">
                  <CardTitle className="text-lg">Associated Clients</CardTitle>
                  <CardDescription>End-users managed by this reseller.</CardDescription>
                </CardHeader>
                <div className="border-t">
                  {!clients?.length ? (
                    <div className="p-8 text-center text-muted-foreground text-sm">
                      No clients found for this reseller.
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Client Name</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Credits</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {clients.map(client => (
                          <TableRow key={client.id}>
                            <TableCell>
                              <Link href={`/clients/${client.id}`} className="font-medium hover:underline text-primary">
                                {client.name}
                              </Link>
                            </TableCell>
                            <TableCell><EntityStatusBadge status={client.status} /></TableCell>
                            <TableCell className="text-right font-mono text-sm">{formatCredits(client.credits)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </Card>
            </TabsContent>
            
            <TabsContent value="messages" className="mt-4">
              <Card>
                <CardHeader className="py-4">
                  <CardTitle className="text-lg">Recent Messages</CardTitle>
                  <CardDescription>Latest SMS dispatched by this reseller or their clients.</CardDescription>
                </CardHeader>
                <div className="border-t">
                  {!messages?.length ? (
                    <div className="p-8 text-center text-muted-foreground text-sm">
                      No message history found.
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
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
