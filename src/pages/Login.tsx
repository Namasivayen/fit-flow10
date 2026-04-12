import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Dumbbell, Mail, Lock, Phone, Shield, UserRound } from "lucide-react";

type LoginRole = "member" | "admin";

const isEmail = (input: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);
const isPhone = (input: string) => /^\+?[\d\s\-()]{7,15}$/.test(input.trim());

const Login = () => {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<LoginRole>("member");

  const inputType = isEmail(identifier) ? "email" : isPhone(identifier) ? "phone" : "unknown";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let email = identifier;

      if (inputType === "phone") {
        const { data, error } = await supabase.functions.invoke("lookup-user-by-phone", {
          body: { phone: identifier },
        });
        if (error || !data?.email) {
          toast({ title: "Login failed", description: "Invalid credentials", variant: "destructive" });
          setLoading(false);
          return;
        }
        email = data.email;
      } else if (inputType !== "email") {
        toast({ title: "Invalid input", description: "Enter a valid email or phone number", variant: "destructive" });
        setLoading(false);
        return;
      }

      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        toast({ title: "Login failed", description: signInError.message, variant: "destructive" });
        setLoading(false);
        return;
      }

      // If admin login selected, verify the user actually has admin role
      if (role === "admin") {
        const { data: isAdmin, error: roleError } = await supabase.rpc("has_role", {
          _user_id: authData.user.id,
          _role: "admin",
        });

        if (roleError || !isAdmin) {
          toast({ title: "Access denied", description: "You do not have admin privileges.", variant: "destructive" });
          await supabase.auth.signOut();
          setLoading(false);
          return;
        }

        navigate("/admin");
      } else {
        navigate("/dashboard");
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Something went wrong", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md animate-fade-up">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">
            <Dumbbell className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-display font-bold text-foreground">Welcome back</h1>
          <p className="text-muted-foreground mt-1">Sign in to continue your fitness journey</p>
        </div>

        <Card className="shadow-lg border-border/50">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-display">Sign In</CardTitle>
            <CardDescription>Choose your role and sign in</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Role selector */}
            <div className="flex gap-2 mb-5">
              <Button
                type="button"
                variant={role === "member" ? "default" : "outline"}
                className="flex-1 gap-2"
                onClick={() => setRole("member")}
              >
                <UserRound className="h-4 w-4" />
                Member
              </Button>
              <Button
                type="button"
                variant={role === "admin" ? "default" : "outline"}
                className="flex-1 gap-2"
                onClick={() => setRole("admin")}
              >
                <Shield className="h-4 w-4" />
                Admin
              </Button>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="identifier">Email or Phone</Label>
                <div className="relative">
                  {inputType === "phone" ? (
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  ) : (
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  )}
                  <Input
                    id="identifier"
                    type="text"
                    placeholder="you@example.com or +1234567890"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
                {identifier && inputType !== "unknown" && (
                  <p className="text-xs text-muted-foreground">
                    Detected: {inputType === "email" ? "📧 Email" : "📱 Phone number"}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link to="/forgot-password" className="text-xs text-primary hover:underline">
                    Forgot password?
                  </Link>
                </div>
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
                {loading ? "Signing in..." : `Sign In as ${role === "admin" ? "Admin" : "Member"}`}
              </Button>
            </form>
            <p className="text-center text-sm text-muted-foreground mt-4">
              Don't have an account?{" "}
              <Link to="/register" className="text-primary font-medium hover:underline">
                Sign up
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
