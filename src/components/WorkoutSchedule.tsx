import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, BellOff, Clock, Calendar } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { usePushNotifications } from "@/hooks/use-push-notifications";

const DAYS = [
  { key: "Mon", label: "M" },
  { key: "Tue", label: "T" },
  { key: "Wed", label: "W" },
  { key: "Thu", label: "T" },
  { key: "Fri", label: "F" },
  { key: "Sat", label: "S" },
  { key: "Sun", label: "S" },
];

export default function WorkoutSchedule() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { isSupported, isSubscribed, permission, subscribe, unsubscribe } = usePushNotifications();

  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [preferredTime, setPreferredTime] = useState("08:00");
  const [remindersEnabled, setRemindersEnabled] = useState(true);
  const [earlyMinutes, setEarlyMinutes] = useState("0");
  const [hasChanges, setHasChanges] = useState(false);

  const { data: schedule, isLoading } = useQuery({
    queryKey: ["workout-schedule", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workout_schedules")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (schedule) {
      setSelectedDays(schedule.workout_days || []);
      setPreferredTime(schedule.preferred_time?.slice(0, 5) || "08:00");
      setRemindersEnabled(schedule.reminders_enabled);
      setEarlyMinutes(String(schedule.early_reminder_minutes || 0));
    }
  }, [schedule]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const payload = {
        user_id: user!.id,
        workout_days: selectedDays,
        preferred_time: preferredTime,
        timezone,
        reminders_enabled: remindersEnabled,
        early_reminder_minutes: parseInt(earlyMinutes) || 0,
      };

      if (schedule) {
        const { error } = await supabase
          .from("workout_schedules")
          .update(payload)
          .eq("user_id", user!.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("workout_schedules")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workout-schedule"] });
      setHasChanges(false);
      toast({ title: "Schedule saved", description: "Your workout schedule has been updated." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const toggleDay = (day: string) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
    setHasChanges(true);
  };

  const handleToggleReminders = async (enabled: boolean) => {
    setRemindersEnabled(enabled);
    setHasChanges(true);
    if (enabled && !isSubscribed) {
      const ok = await subscribe();
      if (!ok) {
        toast({
          title: "Notifications blocked",
          description: "Please allow notifications in your browser settings.",
          variant: "destructive",
        });
        setRemindersEnabled(false);
        return;
      }
    }
    if (!enabled && isSubscribed) {
      await unsubscribe();
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          Workout Schedule
        </CardTitle>
        <CardDescription>Set your training days and reminder time</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Day picker */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Workout Days</Label>
          <div className="flex gap-1.5">
            {DAYS.map((day, i) => (
              <button
                key={day.key}
                type="button"
                onClick={() => toggleDay(day.key)}
                className={`w-9 h-9 rounded-full text-sm font-medium transition-colors ${
                  selectedDays.includes(day.key)
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
                title={day.key}
              >
                {day.label}
              </button>
            ))}
          </div>
          {selectedDays.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {selectedDays.join(", ")}
            </p>
          )}
        </div>

        {/* Time picker */}
        <div className="space-y-2">
          <Label htmlFor="workout-time" className="text-sm font-medium flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" /> Preferred Time
          </Label>
          <Input
            id="workout-time"
            type="time"
            value={preferredTime}
            onChange={(e) => { setPreferredTime(e.target.value); setHasChanges(true); }}
            className="w-36"
          />
        </div>

        {/* Early reminder */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Early Reminder</Label>
          <Select
            value={earlyMinutes}
            onValueChange={(v) => { setEarlyMinutes(v); setHasChanges(true); }}
          >
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">No early reminder</SelectItem>
              <SelectItem value="5">5 min before</SelectItem>
              <SelectItem value="10">10 min before</SelectItem>
              <SelectItem value="15">15 min before</SelectItem>
              <SelectItem value="30">30 min before</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Reminder toggle */}
        <div className="flex items-center justify-between rounded-lg border border-border p-3">
          <div className="flex items-center gap-2">
            {remindersEnabled ? (
              <Bell className="h-4 w-4 text-primary" />
            ) : (
              <BellOff className="h-4 w-4 text-muted-foreground" />
            )}
            <div>
              <p className="text-sm font-medium">Push Notifications</p>
              <p className="text-xs text-muted-foreground">
                {!isSupported
                  ? "Not supported in this browser"
                  : permission === "denied"
                  ? "Blocked — update browser settings"
                  : remindersEnabled
                  ? "You'll get reminders on workout days"
                  : "Enable to receive workout reminders"}
              </p>
            </div>
          </div>
          <Switch
            checked={remindersEnabled}
            onCheckedChange={handleToggleReminders}
            disabled={!isSupported || permission === "denied"}
          />
        </div>

        {/* Save */}
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={!hasChanges || saveMutation.isPending || selectedDays.length === 0}
          className="w-full"
        >
          {saveMutation.isPending ? "Saving..." : "Save Schedule"}
        </Button>
      </CardContent>
    </Card>
  );
}
