import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Map } from "lucide-react";
import ExerciseCard from "@/components/workout/ExerciseCard";

const Workout = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeRoadmap, setActiveRoadmap] = useState<any>(null);
  const [exercises, setExercises] = useState<any[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [skippedIds, setSkippedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchWorkout = async () => {
      const { data: ur } = await supabase
        .from("user_roadmaps")
        .select("*, fitness_roadmaps(title, duration_weeks)")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (!ur) { setLoading(false); return; }
      setActiveRoadmap(ur);

      const { data: phases } = await supabase
        .from("roadmap_phases")
        .select("*")
        .eq("roadmap_id", ur.roadmap_id)
        .order("sort_order");

      if (!phases?.length) { setLoading(false); return; }

      const currentDay = ur.current_day || 1;
      const weekNumber = Math.ceil(currentDay / 3);
      const dayInWeek = ((currentDay - 1) % 3) + 1;
      const currentPhase = phases.find((p: any) => p.week_number === weekNumber) || phases[0];

      const { data: re } = await supabase
        .from("roadmap_exercises")
        .select("*, exercises(*)")
        .eq("phase_id", currentPhase.id)
        .eq("day_number", dayInWeek)
        .order("sort_order");

      setExercises(re || []);

      const { data: logs } = await supabase
        .from("workout_logs")
        .select("roadmap_exercise_id, completed, skipped")
        .eq("user_roadmap_id", ur.id)
        .eq("day_number", currentDay);

      const done = new Set<string>();
      const skip = new Set<string>();
      logs?.forEach((l: any) => {
        if (l.completed) done.add(l.roadmap_exercise_id);
        if (l.skipped) skip.add(l.roadmap_exercise_id);
      });
      setCompletedIds(done);
      setSkippedIds(skip);
      setLoading(false);
    };
    fetchWorkout();
  }, [user]);

  const logExercise = async (exerciseId: string, completed: boolean, skipped: boolean) => {
    if (!user || !activeRoadmap) return;
    await supabase.from("workout_logs").insert({
      user_id: user.id,
      user_roadmap_id: activeRoadmap.id,
      roadmap_exercise_id: exerciseId,
      day_number: activeRoadmap.current_day,
      completed,
      skipped,
    });
    if (completed) setCompletedIds((p) => new Set(p).add(exerciseId));
    if (skipped) setSkippedIds((p) => new Set(p).add(exerciseId));
  };

  const completeWorkout = async () => {
    if (!activeRoadmap) return;
    await supabase
      .from("user_roadmaps")
      .update({ current_day: (activeRoadmap.current_day || 1) + 1 })
      .eq("id", activeRoadmap.id);
    navigate("/dashboard");
  };

  const totalExercises = exercises.length;
  const doneCount = completedIds.size + skippedIds.size;
  const progress = totalExercises > 0 ? (doneCount / totalExercises) * 100 : 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading workout...</div>
      </div>
    );
  }

  if (!activeRoadmap) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-40">
          <div className="container flex items-center gap-3 h-16">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="font-display font-bold text-foreground text-lg">Today's Workout</h1>
          </div>
        </header>
        <main className="container py-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <Map className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="font-display font-bold text-xl text-foreground mb-2">No active roadmap</h2>
          <p className="text-muted-foreground mb-6">Select a roadmap to start training</p>
          <Button onClick={() => navigate("/roadmaps")}>Browse Roadmaps</Button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="container flex items-center gap-3 h-16">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-display font-bold text-foreground text-lg">Day {activeRoadmap.current_day}</h1>
            <p className="text-xs text-muted-foreground">{activeRoadmap.fitness_roadmaps?.title}</p>
          </div>
        </div>
      </header>

      <main className="container py-6 space-y-6 max-w-2xl">
        {/* Progress */}
        <div className="animate-fade-up">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium text-foreground">{doneCount}/{totalExercises}</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Exercise Cards */}
        {exercises.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No exercises scheduled for today. Try the next day!
          </div>
        ) : (
          <div className="space-y-4">
            {exercises.map((ex, i) => (
              <ExerciseCard
                key={ex.id}
                exercise={ex}
                isDone={completedIds.has(ex.id)}
                isSkipped={skippedIds.has(ex.id)}
                index={i}
                onComplete={(id) => logExercise(id, true, false)}
                onSkip={(id) => logExercise(id, false, true)}
              />
            ))}
          </div>
        )}

        {/* Complete button */}
        {doneCount === totalExercises && totalExercises > 0 && (
          <Button className="w-full" size="lg" onClick={completeWorkout}>
            Complete Workout & Move to Next Day
          </Button>
        )}
      </main>
    </div>
  );
};

export default Workout;
