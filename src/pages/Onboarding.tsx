import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { ArrowRight, ArrowLeft, Dumbbell, Target, Activity, Utensils, ShieldCheck } from "lucide-react";

const steps = [
  { title: "Body Metrics", icon: Dumbbell, description: "Tell us about yourself" },
  { title: "Fitness Goal", icon: Target, description: "What do you want to achieve?" },
  { title: "Activity & Diet", icon: Activity, description: "Your current lifestyle" },
  { title: "Disclaimer", icon: ShieldCheck, description: "Safety first" },
];

const Onboarding = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    age: "",
    height_cm: "",
    weight_kg: "",
    gender: "",
    fitness_goal: "",
    activity_level: "",
    diet_preference: "",
    medical_disclaimer_accepted: false,
  });

  const update = (key: string, value: string | boolean) => setForm((p) => ({ ...p, [key]: value }));

  const handleSubmit = async () => {
    if (!form.medical_disclaimer_accepted) {
      toast({ title: "Please accept the medical disclaimer", variant: "destructive" });
      return;
    }
    setLoading(true);

    const { error } = await supabase
      .from("user_profiles")
      .update({
        age: parseInt(form.age) || null,
        height_cm: parseFloat(form.height_cm) || null,
        weight_kg: parseFloat(form.weight_kg) || null,
        gender: form.gender || null,
        fitness_goal: form.fitness_goal,
        activity_level: form.activity_level,
        diet_preference: form.diet_preference,
        medical_disclaimer_accepted: true,
        onboarding_completed: true,
      })
      .eq("user_id", user!.id);

    if (error) {
      toast({ title: "Error saving profile", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Profile complete!", description: "Let's find your perfect roadmap." });
      navigate("/dashboard");
    }
    setLoading(false);
  };

  const StepIcon = steps[step].icon;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-lg animate-fade-up">
        {/* Progress bar */}
        <div className="flex gap-2 mb-8">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                i <= step ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>

        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-3">
            <StepIcon className="w-6 h-6 text-primary" />
          </div>
          <h2 className="text-xl font-display font-bold text-foreground">{steps[step].title}</h2>
          <p className="text-muted-foreground text-sm">{steps[step].description}</p>
        </div>

        <Card className="shadow-lg border-border/50">
          <CardContent className="pt-6">
            {step === 0 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Age</Label>
                  <Input type="number" placeholder="25" value={form.age} onChange={(e) => update("age", e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Height (cm)</Label>
                    <Input type="number" placeholder="175" value={form.height_cm} onChange={(e) => update("height_cm", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Weight (kg)</Label>
                    <Input type="number" placeholder="70" value={form.weight_kg} onChange={(e) => update("weight_kg", e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Gender (optional)</Label>
                  <Select value={form.gender} onValueChange={(v) => update("gender", v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                      <SelectItem value="prefer_not">Prefer not to say</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <Label>What's your primary fitness goal?</Label>
                <div className="grid gap-3">
                  {["Build Muscle", "Lose Weight", "Improve Endurance", "Increase Flexibility", "General Fitness"].map((goal) => (
                    <button
                      key={goal}
                      type="button"
                      onClick={() => update("fitness_goal", goal)}
                      className={`p-4 rounded-lg border text-left transition-all active:scale-[0.98] ${
                        form.fitness_goal === goal
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-border hover:border-primary/40"
                      }`}
                    >
                      <span className="font-medium text-foreground">{goal}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Current Activity Level</Label>
                  <Select value={form.activity_level} onValueChange={(v) => update("activity_level", v)}>
                    <SelectTrigger><SelectValue placeholder="Select activity level" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sedentary">Sedentary (little or no exercise)</SelectItem>
                      <SelectItem value="light">Light (1-3 days/week)</SelectItem>
                      <SelectItem value="moderate">Moderate (3-5 days/week)</SelectItem>
                      <SelectItem value="active">Active (6-7 days/week)</SelectItem>
                      <SelectItem value="very_active">Very Active (twice daily)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Diet Preference</Label>
                  <Select value={form.diet_preference} onValueChange={(v) => update("diet_preference", v)}>
                    <SelectTrigger><SelectValue placeholder="Select diet preference" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no_preference">No Preference</SelectItem>
                      <SelectItem value="vegetarian">Vegetarian</SelectItem>
                      <SelectItem value="vegan">Vegan</SelectItem>
                      <SelectItem value="keto">Keto</SelectItem>
                      <SelectItem value="paleo">Paleo</SelectItem>
                      <SelectItem value="mediterranean">Mediterranean</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground leading-relaxed">
                  <p className="font-medium text-foreground mb-2">Medical Disclaimer</p>
                  <p>
                    This platform provides general fitness guidance and is not a substitute for professional medical advice.
                    Consult a healthcare provider before starting any new exercise program, especially if you have pre-existing
                    health conditions. By proceeding, you acknowledge that you exercise at your own risk.
                  </p>
                </div>
                <div className="flex items-start gap-3 pt-2">
                  <Checkbox
                    id="disclaimer"
                    checked={form.medical_disclaimer_accepted}
                    onCheckedChange={(checked) => update("medical_disclaimer_accepted", checked === true)}
                  />
                  <Label htmlFor="disclaimer" className="text-sm leading-relaxed cursor-pointer">
                    I have read and accept the medical disclaimer. I understand that this platform provides general fitness guidance only.
                  </Label>
                </div>
              </div>
            )}

            <div className="flex justify-between mt-6">
              {step > 0 ? (
                <Button variant="ghost" onClick={() => setStep((s) => s - 1)}>
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </Button>
              ) : (
                <div />
              )}
              {step < steps.length - 1 ? (
                <Button onClick={() => setStep((s) => s + 1)}>
                  Next <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button onClick={handleSubmit} disabled={loading || !form.medical_disclaimer_accepted}>
                  {loading ? "Saving..." : "Complete Setup"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Onboarding;
