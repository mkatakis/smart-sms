import { useLocation } from "wouter";
import { useSendMessage, useListResellers, useListClients, getListMessagesQueryKey, getGetDashboardStatsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Send, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const sendSchema = z.object({
  senderType: z.enum(["platform", "reseller", "client"]),
  resellerId: z.coerce.number().optional(),
  clientId: z.coerce.number().optional(),
  fromNumber: z.string().min(1, "Sender ID/Number is required"),
  toNumber: z.string().min(1, "Recipient number is required"),
  body: z.string().min(1, "Message body is required").max(1600, "Message too long"),
}).superRefine((data, ctx) => {
  if (data.senderType === "reseller" && !data.resellerId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Reseller is required", path: ["resellerId"] });
  }
  if (data.senderType === "client" && !data.clientId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Client is required", path: ["clientId"] });
  }
});

export default function SendMessage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: resellers } = useListResellers();
  const { data: clients } = useListClients();
  const sendMessage = useSendMessage();

  const form = useForm<z.infer<typeof sendSchema>>({
    resolver: zodResolver(sendSchema),
    defaultValues: {
      senderType: "platform",
      fromNumber: "NEXUS",
      toNumber: "",
      body: "",
    }
  });

  const senderType = form.watch("senderType");
  const selectedResellerId = form.watch("resellerId");

  // Filter clients based on selected reseller if senderType is client
  const availableClients = senderType === "client" && selectedResellerId 
    ? clients?.filter(c => c.resellerId === selectedResellerId)
    : clients;

  const onSubmit = (data: z.infer<typeof sendSchema>) => {
    sendMessage.mutate({ 
      data: {
        resellerId: data.senderType === "reseller" || data.senderType === "client" ? data.resellerId : undefined,
        clientId: data.senderType === "client" ? data.clientId : undefined,
        fromNumber: data.fromNumber,
        toNumber: data.toNumber,
        body: data.body,
      }
    }, {
      onSuccess: () => {
        toast({ title: "Message queued for delivery", description: `To: ${data.toNumber}` });
        queryClient.invalidateQueries({ queryKey: getListMessagesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
        setLocation("/messages");
      },
      onError: (error: any) => {
        toast({ 
          title: "Failed to send message", 
          description: error?.message || "An unknown error occurred",
          variant: "destructive"
        });
      }
    });
  };

  const messageBody = form.watch("body") || "";
  const smsCount = Math.ceil(messageBody.length / 160) || 1;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Send Message</h1>
        <p className="text-sm text-muted-foreground">Compose and dispatch an SMS directly from the dashboard.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Message Details</CardTitle>
          <CardDescription>Select the billing entity and compose your message.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              <div className="p-4 bg-muted/50 rounded-lg space-y-4 border">
                <FormField
                  control={form.control}
                  name="senderType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Billing Entity</FormLabel>
                      <Select onValueChange={(val) => {
                        field.onChange(val);
                        // Reset dependent fields
                        if (val === "platform") {
                          form.setValue("resellerId", undefined);
                          form.setValue("clientId", undefined);
                        } else if (val === "reseller") {
                          form.setValue("clientId", undefined);
                        }
                      }} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select billing entity" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="platform">Platform (Free)</SelectItem>
                          <SelectItem value="reseller">Reseller Account</SelectItem>
                          <SelectItem value="client">Client Account</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>Who pays for this message?</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {(senderType === "reseller" || senderType === "client") && (
                  <FormField
                    control={form.control}
                    name="resellerId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Select Reseller</FormLabel>
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
                )}

                {senderType === "client" && (
                  <FormField
                    control={form.control}
                    name="clientId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Select Client</FormLabel>
                        <Select 
                          onValueChange={(val) => field.onChange(Number(val))} 
                          value={field.value ? field.value.toString() : ""}
                          disabled={!selectedResellerId}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={!selectedResellerId ? "Select a reseller first" : "Select a client"} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {availableClients?.map(c => (
                              <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="fromNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sender ID (From)</FormLabel>
                      <FormControl><Input placeholder="NEXUS" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="toNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Recipient (To)</FormLabel>
                      <FormControl><Input placeholder="+1234567890" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="body"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Message Body</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Type your message here..." 
                        className="min-h-[120px] font-mono text-sm" 
                        {...field} 
                      />
                    </FormControl>
                    <div className="flex justify-between text-xs text-muted-foreground mt-2">
                      <span>{field.value?.length || 0} characters</span>
                      <span>{smsCount} SMS part{smsCount > 1 ? 's' : ''} (Cost: {smsCount} credits)</span>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {senderType !== "platform" && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Credit Deduction</AlertTitle>
                  <AlertDescription>
                    This action will deduct {smsCount} credits from the selected {senderType}'s balance.
                  </AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={sendMessage.isPending}>
                {sendMessage.isPending ? "Queuing..." : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Dispatch Message
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
