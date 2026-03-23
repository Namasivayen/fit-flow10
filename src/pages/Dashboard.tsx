import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dumbbell, Map, Activity, MessageSquare } from "lucide-react";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, signOut, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchProfile = async () => {
      const { data } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (data && !data.onboarding_completed) {
        navigate("/onboarding");
        return;
      }

      setProfile(data);
      setLoadingProfile(false);
    };

    fetchProfile();
  }, [user, navigate]);

  if (authLoading || loadingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const quickActions = [
    { title: "Roadmaps", description: "Browse fitness plans", icon: Map, color: "bg-primary/10 text-primary", path: "/roadmaps" },
    { title: "Today's Workout", description: "Start training", icon: Dumbbell, color: "bg-accent/10 text-accent", path: "/workout" },
    { title: "Readiness", description: "Check your score", icon: Activity, color: "bg-success/10 text-success", path: "/readiness" },
    { title: "AI Coach", description: "Get advice", icon: MessageSquare, color: "bg-info/10 text-info", path: "/chat" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Dumbbell className="w-5 h-5 text-primary" />
            </div>
            <span className="font-display font-bold text-foreground text-lg">GuideStride</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate("/profile")}>
              <User className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-8 space-y-8">
        {/* Welcome */}
        <div className="animate-fade-up">
          <h1 className="text-2xl font-display font-bold text-foreground">
            Welcome back{profile?.fitness_goal ? ` 💪` : ""}
          </h1>
          <p className="text-muted-foreground mt-1">
            {profile?.fitness_goal
              ? `Focused on: ${profile.fitness_goal}`
              : "Ready to train today?"}
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickActions.map((action, i) => (
            <Card
              key={action.title}
              className="cursor-pointer hover:shadow-md transition-shadow active:scale-[0.98] border-border/50"
              style={{ animationDelay: `${i * 80}ms` }}
              onClick={() => navigate(action.path)}
            >
              <CardContent className="pt-6 text-center">
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${action.color} mb-3`}>
                  <action.icon className="w-6 h-6" />
                </div>
                <CardTitle className="text-sm font-display">{action.title}</CardTitle>
                <CardDescription className="text-xs mt-1">{action.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Placeholder sections */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg font-display">Your Active Roadmap</CardTitle>
            <CardDescription>No active roadmap yet. Browse plans to get started.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/roadmaps")}>
              <Map className="w-4 h-4 mr-2" /> Browse Roadmaps
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Dashboard;
