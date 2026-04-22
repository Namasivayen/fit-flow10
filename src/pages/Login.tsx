import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Dumbbell, Mail, Lock, Shield, User } from "lucide-react";

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
    } else {
      await supabase.from("login_logs").insert({
        user_id: data.user!.id,
        email: data.user?.email ?? email,
        role: "user",
        event_type: "login",
      });
      navigate("/dashboard");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md animate-fade-up">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">
            <Dumbbell className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-display font-bold text-foreground">Welcome back</h1>
          <p className="text-muted-foreground mt-1">Choose how you want to sign in</p>
        </div>

        <Card className="shadow-lg border-border/50">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-display">Sign In</CardTitle>
            <CardDescription>Select your account type below</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Link to="/admin-login">
              <Button variant="outline" className="w-full justify-start h-14 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive">
                <Shield className="w-5 h-5 mr-3" />
                <div className="text-left">
                  <span className="font-medium">Sign In as Admin</span>
                  <p className="text-xs text-muted-foreground">Manage roadmaps and content</p>
                </div>
              </Button>
            </Link>
            <Link to="/user-login">
              <Button variant="outline" className="w-full justify-start h-14">
                <User className="w-5 h-5 mr-3" />
                <div className="text-left">
                  <span className="font-medium">Sign In as User</span>
                  <p className="text-xs text-muted-foreground">Access your fitness journey</p>
                </div>
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
