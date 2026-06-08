import { useState } from "react";
import { Link } from "wouter";
import { useListClients, useCreateClient, getListClientsQueryKey, useListResellers } from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EntityStatusBadge } from "@/components/StatusBadges";
import { formatCredits, formatDate } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Plus, Contact, MoreHorizontal } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const createSchema = z.object({
  resellerId: z.coerce.number().min(1, "Reseller is required"),
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  phone: z.string().optional(),
  credits: z.coerce.number().min(0).optional().default(0),
});

export default function ClientsList() {
  const [search, setSearch] = useState("");
  const [resellerFilter, setResellerFilter] = useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: clients, isLoading } = useListClients({ 
    search: search || undefined,
    resellerId: resellerFilter !== "all" ? Number(resellerFilter) : undefined
  });
  
  const { data: resellers } = useListResellers();
  const createClient = useCreateClient();

  const form = useForm<z.infer<typeof createSchema>>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      resellerId: 0,
      name: "",
      email: "",
      phone: "",
      credits: 0,
    }
  });

  const onSubmit = (data: z.infer<typeof createSchema>) => {
    createClient.mutate({ data }, {
      onSuccess: () => {
        setIsCreateOpen(false);
        form.reset();
        queryClient.invalidateQueries({ queryKey: getListClientsQueryKey() });
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clients</h1>
          <p className="text-sm text-muted-foreground">Manage end-user clients across all resellers.</p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Client
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Client</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="resellerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Parent Reseller</FormLabel>
                      <Select onValueChange={(val) => field.onChange(Number(val))} value={field.value ? field.value.toString() : ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a reseller" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {resellers?.map(r => (
                            <SelectItem key={r.id} value={r.id.toString()}>{r.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl><Input placeholder="John Smith" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl><Input type="email" placeholder="john@example.com" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="credits"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Initial Credits</FormLabel>
                      <FormControl><Input type="number" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={createClient.isPending}>
                  {createClient.isPending ? "Creating..." : "Create Client"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <div className="p-4 border-b flex flex-col sm:flex-row gap-4">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search clients..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="w-full sm:w-64">
            <Select value={resellerFilter} onValueChange={setResellerFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by Reseller" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Resellers</SelectItem>
                {resellers?.map(r => (
                  <SelectItem key={r.id} value={r.id.toString()}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {isLoading ? (
          <div className="p-4 space-y-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : !clients?.length ? (
          <div className="p-8 text-center text-muted-foreground">
            <Contact className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
            <h3 className="text-lg font-medium text-foreground">No clients found</h3>
            <p className="text-sm">Try adjusting your search or create a new client.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Reseller</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Credits</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client) => {
                const parentReseller = resellers?.find(r => r.id === client.resellerId);
                return (
                  <TableRow key={client.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <Link href={`/clients/${client.id}`} className="font-medium hover:underline">
                          {client.name}
                        </Link>
                        <span className="text-xs text-muted-foreground">{client.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {parentReseller ? (
                        <Link href={`/resellers/${parentReseller.id}`} className="text-sm hover:underline text-primary">
                          {parentReseller.name}
                        </Link>
                      ) : (
                        <span className="text-sm text-muted-foreground">Unknown ({client.resellerId})</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <EntityStatusBadge status={client.status} />
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCredits(client.credits)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(client.createdAt)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/clients/${client.id}`}>View Details</Link>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
