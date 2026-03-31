import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dumbbell, CheckCircle2 } from "lucide-react";
import ExerciseTimer from "./ExerciseTimer";

interface ExerciseCardProps {
  exercise: any;
  isDone: boolean;
  isSkipped: boolean;
  index: number;
  onComplete: (id: string) => void;
  onSkip: (id: string) => void;
}

const ExerciseCard = ({ exercise, isDone, isSkipped, index, onComplete, onSkip }: ExerciseCardProps) => {
  const handled = isDone || isSkipped;

  return (
    <Card
      className={`border-border/50 transition-all opacity-0 animate-fade-up ${
        isDone ? "bg-success/5 border-success/20" : isSkipped ? "bg-muted/50 opacity-60" : ""
      }`}
      style={{ animationDelay: `${index * 60}ms`, animationFillMode: "forwards" }}
    >
      <CardContent className="pt-5">
        <div className="flex items-start gap-4">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
            isDone ? "bg-success/10" : "bg-primary/10"
          }`}>
            {isDone ? (
              <CheckCircle2 className="w-5 h-5 text-success" />
            ) : (
              <Dumbbell className="w-5 h-5 text-primary" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-display font-semibold text-foreground">{exercise.exercises?.name}</h3>
            <p className="text-sm text-muted-foreground mt-0.5">{exercise.exercises?.description}</p>
            <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
              {exercise.sets && <Badge variant="secondary">{exercise.sets} sets</Badge>}
              {exercise.reps && <Badge variant="secondary">{exercise.reps} reps</Badge>}
              {exercise.rest_seconds && <Badge variant="secondary">{exercise.rest_seconds}s rest</Badge>}
            </div>
            {!handled && (
              <ExerciseTimer
                exerciseName={exercise.exercises?.name}
                sets={exercise.sets}
                reps={exercise.reps}
                restSeconds={exercise.rest_seconds}
                onComplete={() => onComplete(exercise.id)}
                onSkip={() => onSkip(exercise.id)}
              />
            )}
            {isDone && <p className="text-xs text-success mt-2">✓ Completed</p>}
            {isSkipped && <p className="text-xs text-muted-foreground mt-2">Skipped</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ExerciseCard;
