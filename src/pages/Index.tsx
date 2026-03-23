import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dumbbell, Map, Brain, Activity, ArrowRight, Shield, Zap, BarChart3 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const { user } = useAuth();

  const features = [
    {
      icon: Map,
      title: "Structured Roadmaps",
      description: "Follow expert-designed fitness plans across strength, cardio, yoga, and more.",
    },
    {
      icon: Activity,
      title: "Readiness Scoring",
      description: "Daily readiness checks ensure you train at the right intensity for your body.",
    },
    {
      icon: Brain,
      title: "AI Coach",
      description: "Get personalized advice on recovery, nutrition, and training concepts.",
    },
    {
      icon: BarChart3,
      title: "Progress Tracking",
      description: "Log every workout and track your consistency over time.",
    },
    {
      icon: Shield,
      title: "Immutable Plans",
      description: "Roadmaps are locked once you start — no shortcuts, just results.",
    },
    {
      icon: Zap,
      title: "Works Offline",
      description: "Access your workouts anywhere, even without internet connection.",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="border-b border-border/50 bg-card/60 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <Dumbbell className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-lg text-foreground">GuideStride</span>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <Link to="/dashboard">
                <Button size="sm">Dashboard <ArrowRight className="w-4 h-4 ml-1" /></Button>
              </Link>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" size="sm">Sign In</Button>
                </Link>
                <Link to="/register">
                  <Button size="sm">Get Started</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="container py-20 md:py-32">
        <div className="max-w-2xl mx-auto text-center animate-fade-up">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <Dumbbell className="w-3.5 h-3.5" />
            Structured Fitness Guidance
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-foreground leading-[1.1] tracking-tight">
            Your Fitness Journey, Mapped Out
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Follow expert-crafted roadmaps, track your readiness, and get AI-powered coaching — all in one platform built for real progress.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Link to="/register">
              <Button size="lg" className="px-8">
                Start Free <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="outline" size="lg">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container pb-20">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground">
            Everything you need to train smarter
          </h2>
          <p className="mt-3 text-muted-foreground max-w-md mx-auto">
            No guesswork. Just structured plans and intelligent support.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {features.map((feature, i) => (
            <Card
              key={feature.title}
              className="border-border/50 hover:shadow-md transition-shadow opacity-0 animate-fade-up"
              style={{ animationDelay: `${i * 100}ms`, animationFillMode: "forwards" }}
            >
              <CardContent className="pt-6">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-display font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border/50 bg-muted/30">
        <div className="container py-16 text-center">
          <h2 className="text-2xl font-display font-bold text-foreground mb-4">
            Ready to start your journey?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            Join thousands who train with structure, not randomness.
          </p>
          <Link to="/register">
            <Button size="lg" className="px-10">
              Create Free Account <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8">
        <div className="container flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Dumbbell className="w-4 h-4 text-primary" />
            <span className="font-display font-semibold">GuideStride</span>
          </div>
          <p>© {new Date().getFullYear()} GuideStride. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
