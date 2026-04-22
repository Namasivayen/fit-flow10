import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Plus, Trash2, Edit, LogOut, Map, Clock, BarChart3, Users, Dumbbell } from "lucide-react";

const categories = ["Strength & Workouts", "Cardio Conditioning", "Yoga & Mobility", "Targeted Exercises", "Physical Activities"];
const difficulties = ["Beginner", "Intermediate", "Advanced"];

interface Roadmap {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  duration_weeks: number;
  is_published: boolean;
  created_at: string;
  roadmap_phases?: RoadmapPhase[];
}

interface RoadmapPhase {
  id: string;
  title: string;
  description: string | null;
  week_number: number;
  sort_order: number;
  roadmap_exercises?: RoadmapExercise[];
}

interface RoadmapExercise {
  id: string;
  day_number: number;
  exercise_name: string;
  sets: number | null;
  reps: string | null;
  duration_seconds: number | null;
  rest_seconds: number | null;
  sort_order: number;
}

interface Exercise {
  id: string;
  name: string;
  muscle_group: string | null;
  category: string | null;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [roadmaps, setRoadmaps] = useState<Roadmap[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRoadmapForm, setShowRoadmapForm] = useState(false);
  const [showPhases, setShowPhases] = useState<string | null>(null);
  const [showExerciseForm, setShowExerciseForm] = useState<string | null>(null);
  const [editingRoadmap, setEditingRoadmap] = useState<Roadmap | null>(null);
  const [editingPhase, setEditingPhase] = useState<RoadmapPhase | null>(null);
  const [editingExercise, setEditingExercise] = useState<RoadmapExercise | null>(null);
  const [roadmapFormData, setRoadmapFormData] = useState({
    title: "",
    description: "",
    category: "Strength & Workouts",
    difficulty: "Beginner",
    duration_weeks: 4,
  });
  const [phaseFormData, setPhaseFormData] = useState({
    title: "",
    description: "",
    week_number: 1,
  });
  const [exerciseFormData, setExerciseFormData] = useState({
    exercise_name: "",
    day_number: 1,
    sets: 3,
    reps: "10",
    duration_seconds: 0,
    rest_seconds: 60,
  });

  useEffect(() => {
    const isAdmin = sessionStorage.getItem("isAdmin");
    if (!isAdmin) {
      navigate("/admin-login");
      return;
    }
    fetchAll();
  }, []);

  const seedSampleData = async () => {
    const { data: existingRoadmaps } = await supabase.from("fitness_roadmaps").select("id").limit(1);
    if (existingRoadmaps && existingRoadmaps.length > 0) {
      toast({ title: "Sample data already exists", variant: "destructive" });
      return;
    }

    const sampleRoadmaps = [
      {
        title: "8-Week Beginner Strength",
        description: "Build foundational strength with this beginner-friendly program. Perfect for those new to fitness or returning after a break. Focuses on bodyweight exercises and light resistance training.",
        category: "Strength & Workouts",
        difficulty: "Beginner",
        duration_weeks: 8,
        is_published: true,
      },
      {
        title: "4-Week HIIT Cardio",
        description: "High-intensity interval training to boost your cardio and burn calories. Short, effective workouts you can do at home with no equipment needed.",
        category: "Cardio Conditioning",
        difficulty: "Intermediate",
        duration_weeks: 4,
        is_published: true,
      },
      {
        title: "6-Week Yoga & Flexibility",
        description: "Improve your flexibility and reduce stress with daily yoga sessions. Suitable for all levels with modifications provided.",
        category: "Yoga & Mobility",
        difficulty: "Beginner",
        duration_weeks: 6,
        is_published: true,
      },
    ];

    const { data: createdRoadmaps } = await supabase.from("fitness_roadmaps").insert(sampleRoadmaps).select();
    if (!createdRoadmaps || createdRoadmaps.length === 0) {
      toast({ title: "Failed to create roadmaps", variant: "destructive" });
      return;
    }

    for (const rm of createdRoadmaps) {
      const phases = [];
      for (let week = 1; week <= Math.min(rm.duration_weeks, 4); week++) {
        phases.push({
          roadmap_id: rm.id,
          title: `Week ${week} Workouts`,
          description: `Training for week ${week}`,
          week_number: week,
          sort_order: week,
        });
      }
      await supabase.from("roadmap_phases").insert(phases);
    }

    const { data: allPhases } = await supabase.from("roadmap_phases").select("*");
    if (allPhases) {
      const exercisesData = [
        { name: "Push-ups", muscle_group: "Chest", category: "Strength" },
        { name: "Squats", muscle_group: "Legs", category: "Strength" },
        { name: "Plank", muscle_group: "Core", category: "Strength" },
        { name: "Lunges", muscle_group: "Legs", category: "Strength" },
        { name: "Burpees", muscle_group: "Full Body", category: "Cardio" },
        { name: "Mountain Climbers", muscle_group: "Core", category: "Cardio" },
        { name: "Jumping Jacks", muscle_group: "Full Body", category: "Cardio" },
        { name: "High Knees", muscle_group: "Legs", category: "Cardio" },
        { name: "Downward Dog", muscle_group: "Full Body", category: "Yoga" },
        { name: "Warrior Pose", muscle_group: "Legs", category: "Yoga" },
        { name: "Child's Pose", muscle_group: "Back", category: "Yoga" },
        { name: "Cat-Cow Stretch", muscle_group: "Spine", category: "Yoga" },
      ];

      const { data: createdExercises } = await supabase.from("exercises").insert(exercisesData).select();

      for (const phase of allPhases) {
        const dayExercises = [
          { exercise_name: "Push-ups", sets: 3, reps: "10", duration_seconds: 0, rest_seconds: 60, day_number: 1 },
          { exercise_name: "Squats", sets: 3, reps: "15", duration_seconds: 0, rest_seconds: 60, day_number: 1 },
          { exercise_name: "Plank", sets: 3, reps: "0", duration_seconds: 30, rest_seconds: 45, day_number: 2 },
          { exercise_name: "Lunges", sets: 3, reps: "10 each leg", duration_seconds: 0, rest_seconds: 60, day_number: 2 },
          { exercise_name: "Burpees", sets: 3, reps: "8", duration_seconds: 0, rest_seconds: 60, day_number: 3 },
          { exercise_name: "Mountain Climbers", sets: 3, reps: "20", duration_seconds: 0, rest_seconds: 45, day_number: 3 },
          { exercise_name: "Jumping Jacks", sets: 3, reps: "30", duration_seconds: 0, rest_seconds: 30, day_number: 4 },
          { exercise_name: "High Knees", sets: 3, reps: "30", duration_seconds: 0, rest_seconds: 45, day_number: 4 },
        ];

        const phaseExercises = dayExercises.map((ex, idx) => ({
          phase_id: phase.id,
          exercise_name: ex.exercise_name,
          day_number: ex.day_number,
          sets: ex.sets,
          reps: ex.reps,
          duration_seconds: ex.duration_seconds,
          rest_seconds: ex.rest_seconds,
          sort_order: idx + 1,
        }));

        await supabase.from("roadmap_exercises").insert(phaseExercises);
      }
    }

    toast({ title: "Sample roadmaps with exercises created!" });
    fetchAll();
  };

  const fetchAll = async () => {
    setLoading(true);
    const [roadmapsRes, exercisesRes] = await Promise.all([
      supabase.from("fitness_roadmaps").select(`
        *,
        roadmap_phases(
          *,
          roadmap_exercises(*)
        )
      `).order("created_at", { ascending: false }),
      supabase.from("exercises").select("*").order("name")
    ]);
    setRoadmaps(roadmapsRes.data || []);
    setExercises(exercisesRes.data || []);
    setLoading(false);
  };

  const handleSignOut = () => {
    sessionStorage.removeItem("isAdmin");
    navigate("/");
  };

  const handleRoadmapSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roadmapFormData.title) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    const payload = {
      ...roadmapFormData,
      is_published: true,
    };
    if (editingRoadmap) {
      await supabase.from("fitness_roadmaps").update(payload).eq("id", editingRoadmap.id);
      toast({ title: "Roadmap updated!" });
    } else {
      await supabase.from("fitness_roadmaps").insert(payload);
      toast({ title: "Roadmap created!" });
    }
    resetRoadmapForm();
    fetchAll();
  };

  const handlePhaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phaseFormData.title) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    const payload = {
      ...phaseFormData,
      roadmap_id: showPhases,
      sort_order: phaseFormData.week_number,
    };
    if (editingPhase) {
      await supabase.from("roadmap_phases").update(payload).eq("id", editingPhase.id);
      toast({ title: "Phase updated!" });
    } else {
      await supabase.from("roadmap_phases").insert(payload);
      toast({ title: "Phase created!" });
    }
    resetPhaseForm();
    fetchAll();
  };

  const handleExerciseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!exerciseFormData.exercise_name) {
      toast({ title: "Exercise name is required", variant: "destructive" });
      return;
    }
    const payload = {
      ...exerciseFormData,
      phase_id: showExerciseForm,
      sort_order: exerciseFormData.day_number,
    };
    if (editingExercise) {
      await supabase.from("roadmap_exercises").update(payload).eq("id", editingExercise.id);
      toast({ title: "Exercise updated!" });
    } else {
      await supabase.from("roadmap_exercises").insert(payload);
      toast({ title: "Exercise added!" });
    }
    resetExerciseForm();
    fetchAll();
  };

  const resetRoadmapForm = () => {
    setShowRoadmapForm(false);
    setEditingRoadmap(null);
    setRoadmapFormData({ title: "", description: "", category: "Strength & Workouts", difficulty: "Beginner", duration_weeks: 4 });
  };

  const resetPhaseForm = () => {
    setShowPhases(null);
    setEditingPhase(null);
    setPhaseFormData({ title: "", description: "", week_number: 1 });
  };

  const resetExerciseForm = () => {
    setShowExerciseForm(null);
    setEditingExercise(null);
    setExerciseFormData({ exercise_name: "", day_number: 1, sets: 3, reps: "10", duration_seconds: 0, rest_seconds: 60 });
  };

  const handleDeleteRoadmap = async (id: string) => {
    if (!confirm("Delete this roadmap and all its phases?")) return;
    await supabase.from("fitness_roadmaps").delete().eq("id", id);
    toast({ title: "Roadmap deleted" });
    fetchAll();
  };

  const handleDeletePhase = async (id: string) => {
    if (!confirm("Delete this phase?")) return;
    await supabase.from("roadmap_phases").delete().eq("id", id);
    toast({ title: "Phase deleted" });
    fetchAll();
  };

  const handleDeleteExercise = async (id: string) => {
    if (!confirm("Delete this exercise?")) return;
    await supabase.from("roadmap_exercises").delete().eq("id", id);
    toast({ title: "Exercise deleted" });
    fetchAll();
  };

  const openPhaseForm = (roadmapId: string, phase?: RoadmapPhase) => {
    if (phase) {
      setEditingPhase(phase);
      setPhaseFormData({ title: phase.title, description: phase.description || "", week_number: phase.week_number });
    } else {
      setEditingPhase(null);
      setPhaseFormData({ title: "", description: "", week_number: 1 });
    }
    setShowPhases(roadmapId);
  };

  const openExerciseForm = (phaseId: string, exercise?: RoadmapExercise) => {
    if (exercise) {
      setEditingExercise(exercise);
      setExerciseFormData({
        exercise_name: exercise.exercise_name,
        day_number: exercise.day_number,
        sets: exercise.sets || 3,
        reps: exercise.reps || "10",
        duration_seconds: exercise.duration_seconds || 0,
        rest_seconds: exercise.rest_seconds || 60,
      });
    } else {
      setEditingExercise(null);
      setExerciseFormData({ exercise_name: "", day_number: 1, sets: 3, reps: "10", duration_seconds: 0, rest_seconds: 60 });
    }
    setShowExerciseForm(phaseId);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-display font-bold text-foreground text-lg">Admin Dashboard</h1>
              <p className="text-xs text-muted-foreground">Manage roadmaps, phases & workouts</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleSignOut}>
            <LogOut className="w-4 h-4 mr-2" /> Sign Out
          </Button>
        </div>
      </header>

      <main className="container py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="text-sm px-3 py-1">
              <Users className="w-4 h-4 mr-2" /> {roadmaps.length} Roadmaps
            </Badge>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={seedSampleData}>
              <Dumbbell className="w-4 h-4 mr-2" /> Seed Sample Data
            </Button>
            <Button onClick={() => { setShowRoadmapForm(true); setEditingRoadmap(null); setRoadmapFormData({ title: "", description: "", category: "Strength & Workouts", difficulty: "Beginner", duration_weeks: 4 }); }}>
              <Plus className="w-4 h-4 mr-2" /> Create Roadmap
            </Button>
          </div>
        </div>

        {showRoadmapForm && (
          <Card className="border-primary/30 bg-primary/5 animate-fade-up">
            <CardHeader>
              <CardTitle className="text-lg font-display">{editingRoadmap ? "Edit Roadmap" : "Create New Roadmap"}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleRoadmapSubmit} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input placeholder="e.g., 8-Week Beginner Strength" value={roadmapFormData.title} onChange={(e) => setRoadmapFormData({ ...roadmapFormData, title: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Duration (weeks)</Label>
                    <Input type="number" min="1" max="52" value={roadmapFormData.duration_weeks} onChange={(e) => setRoadmapFormData({ ...roadmapFormData, duration_weeks: parseInt(e.target.value) || 4 })} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea placeholder="Describe the roadmap..." value={roadmapFormData.description} onChange={(e) => setRoadmapFormData({ ...roadmapFormData, description: e.target.value })} className="min-h-[80px]" required />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={roadmapFormData.category} onValueChange={(v) => setRoadmapFormData({ ...roadmapFormData, category: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Difficulty</Label>
                    <Select value={roadmapFormData.difficulty} onValueChange={(v) => setRoadmapFormData({ ...roadmapFormData, difficulty: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {difficulties.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="submit">{editingRoadmap ? "Update Roadmap" : "Create Roadmap"}</Button>
                  <Button type="button" variant="outline" onClick={resetRoadmapForm}>Cancel</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {showPhases && (
          <Card className="border-warning/30 bg-warning/5 animate-fade-up">
            <CardHeader>
              <CardTitle className="text-lg font-display">{editingPhase ? "Edit Phase/Week" : "Add Phase/Week"}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePhaseSubmit} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Phase Title (e.g., Week 1-2: Foundation)</Label>
                    <Input placeholder="Phase title" value={phaseFormData.title} onChange={(e) => setPhaseFormData({ ...phaseFormData, title: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Week Number</Label>
                    <Input type="number" min="1" max={roadmapFormData.duration_weeks} value={phaseFormData.week_number} onChange={(e) => setPhaseFormData({ ...phaseFormData, week_number: parseInt(e.target.value) || 1 })} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description (optional)</Label>
                  <Textarea placeholder="What will be trained this phase..." value={phaseFormData.description} onChange={(e) => setPhaseFormData({ ...phaseFormData, description: e.target.value })} />
                </div>
                <div className="flex gap-2">
                  <Button type="submit">{editingPhase ? "Update Phase" : "Add Phase"}</Button>
                  <Button type="button" variant="outline" onClick={resetPhaseForm}>Cancel</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {showExerciseForm && (
          <Card className="border-success/30 bg-success/5 animate-fade-up">
            <CardHeader>
              <CardTitle className="text-lg font-display">{editingExercise ? "Edit Exercise" : "Add Exercise to Phase"}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleExerciseSubmit} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Exercise Name</Label>
                    <Input placeholder="e.g., Push-ups, Squats, Plank" value={exerciseFormData.exercise_name} onChange={(e) => setExerciseFormData({ ...exerciseFormData, exercise_name: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Day Number</Label>
                    <Input type="number" min="1" max="7" value={exerciseFormData.day_number} onChange={(e) => setExerciseFormData({ ...exerciseFormData, day_number: parseInt(e.target.value) || 1 })} required />
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Sets</Label>
                    <Input type="number" min="1" value={exerciseFormData.sets} onChange={(e) => setExerciseFormData({ ...exerciseFormData, sets: parseInt(e.target.value) || 0 })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Reps</Label>
                    <Input placeholder="10 or 30s" value={exerciseFormData.reps} onChange={(e) => setExerciseFormData({ ...exerciseFormData, reps: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Hold (sec)</Label>
                    <Input type="number" min="0" value={exerciseFormData.duration_seconds} onChange={(e) => setExerciseFormData({ ...exerciseFormData, duration_seconds: parseInt(e.target.value) || 0 })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Rest (sec)</Label>
                    <Input type="number" min="0" value={exerciseFormData.rest_seconds} onChange={(e) => setExerciseFormData({ ...exerciseFormData, rest_seconds: parseInt(e.target.value) || 0 })} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="submit">{editingExercise ? "Update Exercise" : "Add Exercise"}</Button>
                  <Button type="button" variant="outline" onClick={resetExerciseForm}>Cancel</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading roadmaps...</div>
        ) : roadmaps.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <Map className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No roadmaps yet. Click "Create Roadmap" above.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {roadmaps.map((rm) => (
              <Card key={rm.id} className="border-border/50">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="font-display text-lg">{rm.title}</CardTitle>
                        <Badge variant={rm.is_published ? "default" : "secondary"} className="text-xs">
                          {rm.is_published ? "Published" : "Draft"}
                        </Badge>
                      </div>
                      <CardDescription className="mt-1">{rm.category} • {rm.difficulty} • {rm.duration_weeks} weeks</CardDescription>
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{rm.description}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => { setEditingRoadmap(rm); setRoadmapFormData({ title: rm.title, description: rm.description, category: rm.category, difficulty: rm.difficulty, duration_weeks: rm.duration_weeks }); setShowRoadmapForm(true); }}>
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" variant="outline" className="text-destructive hover:bg-destructive/10" onClick={() => handleDeleteRoadmap(rm.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="secondary" onClick={() => openPhaseForm(rm.id)}>
                      <Plus className="w-3.5 h-3.5 mr-1" /> Add Phase/Week
                    </Button>
                  </div>

                  {rm.roadmap_phases && rm.roadmap_phases.length > 0 ? (
                    <div className="space-y-3 pl-4 border-l-2 border-border">
                      {rm.roadmap_phases.sort((a, b) => a.week_number - b.week_number).map((phase) => (
                        <div key={phase.id} className="bg-muted/30 rounded-lg p-4">
                          <div className="flex items-start justify-between gap-2 mb-3">
                            <div>
                              <h4 className="font-medium text-sm">Week {phase.week_number}: {phase.title}</h4>
                              {phase.description && <p className="text-xs text-muted-foreground mt-1">{phase.description}</p>}
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" variant="ghost" onClick={() => openExerciseForm(phase.id)}>
                                <Plus className="w-3 h-3 mr-1" /> Exercise
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => openPhaseForm(rm.id, phase)}>
                                <Edit className="w-3 h-3" />
                              </Button>
                              <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => handleDeletePhase(phase.id)}>
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>

                          {phase.roadmap_exercises && phase.roadmap_exercises.length > 0 && (
                            <div className="space-y-2">
                              {phase.roadmap_exercises.sort((a, b) => a.day_number - b.day_number).map((ex) => (
                                <div key={ex.id} className="flex items-center justify-between bg-background rounded p-2 text-sm">
                                  <div className="flex items-center gap-3">
                                    <Badge variant="outline" className="text-xs w-8 text-center">Day {ex.day_number}</Badge>
                                    <span className="font-medium">{ex.exercise_name}</span>
                                    <span className="text-xs text-muted-foreground">
                                      {ex.sets && ex.reps ? `${ex.sets}x${ex.reps}` : ""}
                                      {ex.duration_seconds ? ` ${ex.duration_seconds}s` : ""}
                                      {ex.rest_seconds ? ` | Rest: ${ex.rest_seconds}s` : ""}
                                    </span>
                                  </div>
                                  <div className="flex gap-1">
                                    <Button size="sm" variant="ghost" onClick={() => openExerciseForm(phase.id, ex)}>
                                      <Edit className="w-3 h-3" />
                                    </Button>
                                    <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => handleDeleteExercise(ex.id)}>
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground pl-4">No phases yet. Add phases to build the roadmap structure.</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;