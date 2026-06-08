import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Send } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);
    
    try {
      await login(username, password);
      setLocation("/");
    } catch (err) {
      setError("Invalid credentials");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-sidebar-border bg-sidebar text-sidebar-foreground shadow-2xl">
        <CardHeader className="space-y-3 pb-6">
          <div className="flex items-center gap-2 font-mono font-bold text-sidebar-foreground justify-center mb-4">
            <div className="w-8 h-8 bg-sidebar-primary rounded flex items-center justify-center text-sidebar-primary-foreground">
              <Send className="w-4 h-4" />
            </div>
            <span className="text-xl">NEXUS SMS</span>
          </div>
          <CardTitle className="text-2xl text-center">Welcome back</CardTitle>
          <CardDescription className="text-center text-sidebar-foreground/70">
            Sign in to your account to continue
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sidebar-foreground/90">Username</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-sidebar-accent border-sidebar-border text-sidebar-foreground focus-visible:ring-sidebar-ring placeholder:text-sidebar-foreground/40"
                placeholder="Enter your username"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sidebar-foreground/90">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-sidebar-accent border-sidebar-border text-sidebar-foreground focus-visible:ring-sidebar-ring placeholder:text-sidebar-foreground/40"
                placeholder="Enter your password"
                required
              />
            </div>
            {error && (
              <div className="text-sm font-medium text-destructive text-center p-2 bg-destructive/10 rounded-md border border-destructive/20">
                {error}
              </div>
            )}
            <Button
              type="submit"
              className="w-full bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90 mt-2"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
