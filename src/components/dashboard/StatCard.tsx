import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  href?: string;
  className?: string;
}

export function StatCard({ title, value, icon, trend, href, className }: StatCardProps) {
  const content = (
    <div className={cn(
      "stat-card animate-fade-in",
      href && "cursor-pointer hover:shadow-md hover:border-primary/30 transition-all",
      className
    )}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold text-foreground mt-1">{value}</p>
          {trend && (
            <p
              className={cn(
                "text-sm font-medium mt-2",
                trend.isPositive ? "text-success" : "text-destructive"
              )}
            >
              {trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value)}% from last week
            </p>
          )}
        </div>
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
          {icon}
        </div>
      </div>
    </div>
  );

  if (href) {
    return <Link to={href}>{content}</Link>;
  }

  return content;
}
