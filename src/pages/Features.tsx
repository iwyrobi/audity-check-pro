import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  ClipboardCheck,
  Wrench,
  BarChart3,
  Shield,
  Camera,
  Bell,
  Users,
  Smartphone,
  CheckCircle2,
  Zap,
} from "lucide-react";

import dashboardPreview from "@/assets/features/dashboard-preview.jpg";
import checklistPreview from "@/assets/features/checklist-preview.jpg";
import workordersPreview from "@/assets/features/workorders-preview.jpg";
import reportsPreview from "@/assets/features/reports-preview.jpg";

const features = [
  {
    title: "Digital Checklists & Templates",
    description:
      "Create fully customizable inspection checklists with sections, scored questions, yes/no toggles, and dropdown options. Reuse templates across teams and departments to standardize your processes.",
    highlights: [
      "Drag-and-drop template builder",
      "Scored questions with weighted points",
      "Section-based organization",
      "Reusable across departments",
    ],
    image: checklistPreview,
    icon: ClipboardCheck,
    color: "text-primary",
  },
  {
    title: "Inspection Management",
    description:
      "Run inspections on any device, capture photos, flag defects in real time, and generate compliance scores automatically. Every inspection is tracked with full audit trails.",
    highlights: [
      "Run inspections on mobile or desktop",
      "Real-time defect flagging",
      "Automatic score calculation",
      "Full audit trail & history",
    ],
    image: dashboardPreview,
    icon: Camera,
    color: "text-accent",
  },
  {
    title: "Work Order Tracking",
    description:
      "Convert inspection defects directly into work orders. Assign tasks, set priorities and due dates, add comments, and track resolution from open to completed.",
    highlights: [
      "Auto-create from inspection defects",
      "Priority & due date management",
      "Assignee tracking",
      "Comment threads & status updates",
    ],
    image: workordersPreview,
    icon: Wrench,
    color: "text-primary",
  },
  {
    title: "Analytics & Reporting",
    description:
      "Gain data-driven insights with compliance trend charts, inspection score breakdowns, and exportable PDF reports. Monitor team performance and identify improvement areas.",
    highlights: [
      "Compliance score trends",
      "Inspection & work order reports",
      "Export to PDF & Excel",
      "Department-level analytics",
    ],
    image: reportsPreview,
    icon: BarChart3,
    color: "text-accent",
  },
];

const additionalFeatures = [
  {
    icon: Shield,
    title: "Role-Based Access",
    description: "Control who sees what with admin, department head, and user roles.",
  },
  {
    icon: Bell,
    title: "Real-Time Notifications",
    description: "Get notified instantly when inspections complete or work orders are assigned.",
  },
  {
    icon: Users,
    title: "Team & Department Management",
    description: "Organize your team into departments with hierarchical structures.",
  },
  {
    icon: Smartphone,
    title: "Mobile-Ready PWA",
    description: "Works on any device with offline support for inspections in the field.",
  },
  {
    icon: Camera,
    title: "Photo & Media Attachments",
    description: "Capture and attach photos directly to inspections and work orders.",
  },
  {
    icon: Zap,
    title: "Quick Setup",
    description: "Get started in minutes. No complex configuration or training required.",
  },
];

export default function Features() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-9 w-9 overflow-hidden flex items-center justify-center">
              <img alt="Opsecta" className="scale-[3.5]" src="/opsecta-logo.png" />
            </div>
            <span className="text-xl font-bold text-foreground tracking-tight">Opsecta</span>
          </Link>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/features")}>
              Features
            </Button>
            {user ? (
              <Button onClick={() => navigate("/dashboard")} size="sm">
                Go to Dashboard
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => navigate("/login")}>
                  Sign In
                </Button>
                <Button size="sm" onClick={() => navigate("/register")}>
                  Get Started
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 text-center">
          <Badge variant="secondary" className="mb-6 px-4 py-1.5 text-sm">
            <Zap className="w-3.5 h-3.5 mr-1.5" />
            Everything you need for operational excellence
          </Badge>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground tracking-tight leading-tight max-w-4xl mx-auto">
            Powerful Features for{" "}
            <span className="text-primary">Modern</span>{" "}
            <span className="text-accent">Teams</span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            From digital checklists to advanced analytics — discover how Opsecta helps your team stay compliant, efficient, and organized.
          </p>
        </div>
      </section>

      {/* Feature Sections */}
      <section className="py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-28">
          {features.map((feature, index) => {
            const isReversed = index % 2 === 1;
            return (
              <div
                key={feature.title}
                className={`flex flex-col ${isReversed ? "lg:flex-row-reverse" : "lg:flex-row"} items-center gap-12 lg:gap-16`}
              >
                {/* Text */}
                <div className="flex-1 space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <feature.icon className={`w-5 h-5 ${feature.color}`} />
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
                      {feature.title}
                    </h2>
                  </div>
                  <p className="text-muted-foreground text-base leading-relaxed">
                    {feature.description}
                  </p>
                  <ul className="space-y-3">
                    {feature.highlights.map((item) => (
                      <li key={item} className="flex items-center gap-2.5 text-sm text-foreground">
                        <CheckCircle2 className="w-4 h-4 text-accent shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Screenshot */}
                <div className="flex-1 w-full">
                  <div className="rounded-2xl border border-border shadow-lg overflow-hidden bg-card">
                    <img
                      src={feature.image}
                      alt={`${feature.title} screenshot`}
                      className="w-full h-auto"
                      loading="lazy"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Additional Features Grid */}
      <section className="py-20 bg-muted/30 border-y border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
              And much more
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto">
              Built-in tools to keep your entire operation running smoothly.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {additionalFeatures.map((feat) => (
              <div
                key={feat.title}
                className="rounded-2xl border border-border bg-card p-6 hover:shadow-md hover:border-primary/30 transition-all duration-200"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <feat.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{feat.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feat.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
            Ready to streamline your operations?
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Start your 30-day free trial today. No credit card required.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="text-base px-8" onClick={() => navigate("/register")}>
              Start Free Trial
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="text-base px-8"
              onClick={() => navigate("/")}
            >
              View Pricing
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 overflow-hidden flex items-center justify-center">
                <img alt="Opsecta" className="scale-[3.5]" src="/opsecta-logo.png" />
              </div>
              <span className="font-semibold text-foreground">Opsecta</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
              <Link to="/features" className="hover:text-foreground transition-colors">Features</Link>
              <Link to="/login" className="hover:text-foreground transition-colors">Sign In</Link>
              <a href="mailto:support@opsecta.com" className="hover:text-foreground transition-colors">Support</a>
            </div>
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} Opsecta. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
