import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, Clock, Save } from "lucide-react";
import { toast } from "sonner";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function WorkoutScheduleSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [workoutDays, setWorkoutDays] = useState<string[]>([]);
  const [preferredTime, setPreferredTime] = useState("08:00");
  const [remindersEnabled, setRemindersEnabled] = useState(true);
  const [earlyReminder, setEarlyReminder] = useState("0");
  const [pushSupported, setPushSupported] = useState(false);
  const [pushSubscribed, setPushSubscribed] = useState(false);

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
      setWorkoutDays(schedule.workout_days || []);
      setPreferredTime(schedule.preferred_time?.slice(0, 5) || "08:00");
      setRemindersEnabled(schedule.reminders_enabled);
      setEarlyReminder(String(schedule.early_reminder_minutes ?? 0));
    }
  }, [schedule]);

  useEffect(() => {
    setPushSupported("serviceWorker" in navigator && "PushManager" in window);
    if ("serviceWorker" in navigator && "PushManager" in window) {
      navigator.serviceWorker.ready.then(async (reg) => {
        const sub = await reg.pushManager.getSubscription();
        setPushSubscribed(!!sub);
      });
    }
  }, []);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const payload = {
        user_id: user!.id,
        workout_days: workoutDays,
        preferred_time: preferredTime,
        reminders_enabled: remindersEnabled,
        early_reminder_minutes: parseInt(earlyReminder) || 0,
        timezone: tz,
      };

      if (schedule) {
        const { error } = await supabase
          .from("workout_schedules")
          .update(payload)
          .eq("id", schedule.id);
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
      toast.success("Workout schedule saved!");
    },
    onError: () => toast.error("Failed to save schedule"),
  });

  const subscribePush = async () => {
    try {
      const reg = await navigator.serviceWorker.ready;
      const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        toast.error("Push notifications not configured");
        return;
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidKey,
      });
      const json = sub.toJSON();
      await supabase.from("push_subscriptions").upsert(
        {
          user_id: user!.id,
          endpoint: json.endpoint!,
          p256dh: json.keys!.p256dh,
          auth_key: json.keys!.auth,
        },
        { onConflict: "user_id,endpoint" }
      );
      setPushSubscribed(true);
      toast.success("Push notifications enabled!");
    } catch (err) {
      console.error(err);
      toast.error("Could not enable push notifications");
    }
  };

  const toggleDay = (day: string) => {
    setWorkoutDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  if (isLoading) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" />
          Workout Schedule
        </CardTitle>
        <CardDescription>Set your training days and reminder time</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Workout days */}
        <div className="space-y-2">
          <Label>Workout Days</Label>
          <div className="flex gap-1.5 flex-wrap">
            {DAYS.map((day) => (
              <Button
                key={day}
                type="button"
                size="sm"
                variant={workoutDays.includes(day) ? "default" : "outline"}
                className="w-11 h-9 text-xs"
                onClick={() => toggleDay(day)}
              >
                {day}
              </Button>
            ))}
          </div>
        </div>

        {/* Preferred time */}
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" /> Preferred Time
          </Label>
          <Input
            type="time"
            value={preferredTime}
            onChange={(e) => setPreferredTime(e.target.value)}
            className="w-36"
          />
        </div>

        {/* Early reminder */}
        <div className="space-y-2">
          <Label>Early Reminder</Label>
          <Select value={earlyReminder} onValueChange={setEarlyReminder}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">No early reminder</SelectItem>
              <SelectItem value="5">5 min before</SelectItem>
              <SelectItem value="10">10 min before</SelectItem>
              <SelectItem value="15">15 min before</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Reminders toggle */}
        <div className="flex items-center justify-between">
          <Label>Enable Reminders</Label>
          <Switch checked={remindersEnabled} onCheckedChange={setRemindersEnabled} />
        </div>

        {/* Push subscription */}
        {pushSupported && !pushSubscribed && remindersEnabled && (
          <Button variant="outline" size="sm" onClick={subscribePush} className="w-full">
            <Bell className="h-4 w-4 mr-2" /> Enable Push Notifications
          </Button>
        )}
        {pushSubscribed && (
          <p className="text-xs text-muted-foreground">✓ Push notifications active on this device</p>
        )}

        {/* Save */}
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || workoutDays.length === 0}
          className="w-full"
        >
          <Save className="h-4 w-4 mr-2" />
          {saveMutation.isPending ? "Saving…" : "Save Schedule"}
        </Button>
      </CardContent>
    </Card>
  );
}
