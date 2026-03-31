import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Play, Pause, CheckCircle2, SkipForward, RotateCcw } from "lucide-react";

interface ExerciseTimerProps {
  exerciseName: string;
  sets: number | null;
  reps: string | null;
  restSeconds: number | null;
  onComplete: () => void;
  onSkip: () => void;
}

const ExerciseTimer = ({ exerciseName, sets, reps, restSeconds, onComplete, onSkip }: ExerciseTimerProps) => {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [started, setStarted] = useState(false);
  const [resting, setResting] = useState(false);
  const [restRemaining, setRestRemaining] = useState(0);

  // Exercise timer
  useEffect(() => {
    if (!running || resting) return;
    const t = setInterval(() => setElapsed((p) => p + 1), 1000);
    return () => clearInterval(t);
  }, [running, resting]);

  // Rest timer
  useEffect(() => {
    if (!resting || restRemaining <= 0) return;
    const t = setInterval(() => {
      setRestRemaining((p) => {
        if (p <= 1) {
          setResting(false);
          return 0;
        }
        return p - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [resting, restRemaining]);

  const handleStart = () => {
    setStarted(true);
    setRunning(true);
  };

  const togglePause = () => setRunning((p) => !p);

  const handleStartRest = () => {
    if (restSeconds) {
      setResting(true);
      setRestRemaining(restSeconds);
    }
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  if (!started) {
    return (
      <div className="flex gap-2">
        <Button size="sm" onClick={handleStart}>
          <Play className="w-4 h-4 mr-1" /> Start
        </Button>
        <Button size="sm" variant="ghost" onClick={onSkip}>
          <SkipForward className="w-4 h-4 mr-1" /> Skip
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3 mt-3">
      {/* Timer display */}
      <div className="flex items-center gap-3">
        <div className="bg-primary/10 rounded-lg px-3 py-1.5">
          <span className="font-mono text-lg font-bold text-primary">{formatTime(elapsed)}</span>
        </div>
        <Button size="icon" variant="ghost" onClick={togglePause} className="h-8 w-8">
          {running ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </Button>
      </div>

      {/* Rest timer */}
      {resting && (
        <div className="flex items-center gap-2 text-sm">
          <div className="bg-accent/10 text-accent rounded-md px-2 py-1 font-mono font-semibold">
            Rest: {restRemaining}s
          </div>
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setResting(false); setRestRemaining(0); }}>
            Skip Rest
          </Button>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {restSeconds && !resting && (
          <Button size="sm" variant="outline" onClick={handleStartRest}>
            <RotateCcw className="w-3.5 h-3.5 mr-1" /> Rest ({restSeconds}s)
          </Button>
        )}
        <Button size="sm" onClick={() => { setRunning(false); onComplete(); }}>
          <CheckCircle2 className="w-4 h-4 mr-1" /> I'm Done
        </Button>
      </div>
    </div>
  );
};

export default ExerciseTimer;
