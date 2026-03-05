import { useTrialStatus } from "@/hooks/useTrialStatus";
import { Clock, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function TrialBanner() {
  const { trialStatus, loading } = useTrialStatus();
  const navigate = useNavigate();

  if (loading || !trialStatus.isOnTrial) return null;

  const isUrgent = trialStatus.daysRemaining <= 7;

  return (
    <div
      className={`flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium ${
        isUrgent
          ? "bg-destructive/10 text-destructive border-b border-destructive/20"
          : "bg-accent/10 text-accent-foreground border-b border-accent/20"
      }`}
    >
      {isUrgent ? (
        <AlertTriangle className="w-4 h-4 shrink-0" />
      ) : (
        <Clock className="w-4 h-4 shrink-0" />
      )}
      <span>
        {trialStatus.daysRemaining === 0
          ? "Your trial expires today!"
          : trialStatus.daysRemaining === 1
            ? "Your trial expires tomorrow!"
            : `${trialStatus.daysRemaining} days remaining in your free trial.`}
      </span>
      <button
        onClick={() => navigate("/settings?tab=subscription")}
        className="underline underline-offset-2 font-semibold hover:opacity-80 ml-1"
      >
        Subscribe now
      </button>
    </div>
  );
}
