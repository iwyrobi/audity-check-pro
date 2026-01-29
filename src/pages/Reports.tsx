import { AppLayout } from "@/components/layout/AppLayout";
import { FileText, Download, Calendar, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

const reports = [
  {
    id: "1",
    title: "Monthly Safety Report",
    description: "Comprehensive safety inspection summary for the month",
    date: "January 2026",
    type: "Safety",
  },
  {
    id: "2",
    title: "Work Order Summary",
    description: "Overview of work orders completed and pending",
    date: "January 2026",
    type: "Operations",
  },
  {
    id: "3",
    title: "Compliance Audit Report",
    description: "Regulatory compliance status and action items",
    date: "Q4 2025",
    type: "Compliance",
  },
  {
    id: "4",
    title: "Equipment Maintenance Log",
    description: "Detailed maintenance history and upcoming schedules",
    date: "January 2026",
    type: "Maintenance",
  },
];

export default function Reports() {
  return (
    <AppLayout title="Reports">
      <div className="space-y-6">
        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="action-card flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Generate Analytics</h3>
              <p className="text-sm text-muted-foreground">Create custom reports</p>
            </div>
          </div>
          <div className="action-card flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-accent" />
            </div>
            <div>
              <h3 className="font-semibold">Schedule Reports</h3>
              <p className="text-sm text-muted-foreground">Set up automated reports</p>
            </div>
          </div>
          <div className="action-card flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
              <Download className="w-6 h-6 text-success" />
            </div>
            <div>
              <h3 className="font-semibold">Export Data</h3>
              <p className="text-sm text-muted-foreground">Download in CSV or PDF</p>
            </div>
          </div>
        </div>

        {/* Recent Reports */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Recent Reports</h2>
          <div className="space-y-3">
            {reports.map((report, index) => (
              <div
                key={report.id}
                className="stat-card flex items-center justify-between animate-slide-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">{report.title}</h3>
                    <p className="text-sm text-muted-foreground">{report.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-xs font-medium text-accent">{report.type}</span>
                    <p className="text-sm text-muted-foreground">{report.date}</p>
                  </div>
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
