import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Dumbbell, Mail, Lock, Shield } from "lucide-react";

const ADMIN_EMAIL = "admin@gmail.com";
const ADMIN_PASSWORD = "12345678";

const AdminLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    let user = data.user ?? null;

    if (!user && email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      const signup = await supabase.auth.signUp({ email, password });
      user = signup.data.user ?? null;
      if (signup.error) {
        toast({ title: "Invalid credentials", description: signup.error.message, variant: "destructive" });
        setLoading(false);
        return;
      }
    }

    if (user) {
      await supabase.from("login_logs").insert({
        user_id: user.id,
        email: user.email ?? email,
        role: "admin",
        event_type: "login",
      });
      toast({ title: "Welcome, Admin!" });
      navigate("/admin");
    } else {
      toast({ title: "Invalid credentials", description: error?.message, variant: "destructive" });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md animate-fade-up">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-destructive/10 mb-4">
            <Shield className="w-7 h-7 text-destructive" />
          </div>
          <h1 className="text-2xl font-display font-bold text-foreground">Admin Access</h1>
          <p className="text-muted-foreground mt-1">Sign in to manage roadmaps</p>
        </div>

        <Card className="shadow-lg border-destructive/30">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-display">Admin Sign In</CardTitle>
            <CardDescription>Enter admin credentials below</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Admin Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing in..." : "Sign In as Admin"}
              </Button>
            </form>
            <p className="text-center text-sm text-muted-foreground mt-4">
              Not an admin?{" "}
              <Link to="/login" className="text-primary font-medium hover:underline">
                User Sign In
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminLogin;
