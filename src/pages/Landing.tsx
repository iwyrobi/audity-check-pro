import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Check,
  X,
  ClipboardCheck,
  Shield,
  BarChart3,
  Wrench,
  Video,
  Users,
  Building2,
  HardDrive,
  ArrowRight,
  ChevronRight,
  Zap,
  Globe,
  Lock,
} from "lucide-react";

const EXCHANGE_RATE = 16000; // 1 USD ≈ 16,000 IDR

type Currency = "IDR" | "USD";

const currencyConfig: Record<Currency, { symbol: string; locale: string; code: string }> = {
  IDR: { symbol: "Rp", locale: "id-ID", code: "IDR" },
  USD: { symbol: "$", locale: "en-US", code: "USD" },
};

const formatPrice = (amount: number, currency: Currency): string => {
  if (currency === "IDR") {
    // Format as "Rp 400.000"
    return `Rp ${amount.toLocaleString("id-ID")}`;
  }
  return `$${amount.toLocaleString("en-US")}`;
};

const plans = [
  {
    name: "Starter",
    tier: "starter",
    priceMonthlyUSD: 25,
    priceYearlyUSD: Math.round(25 * 12 * 0.85),
    priceMonthlyIDR: 400000,
    priceYearlyIDR: Math.round(400000 * 12 * 0.85),
    description: "Perfect for small teams getting started with inspections.",
    features: {
      users: "Up to 5",
      departments: "Up to 3",
      storage: "10 GB",
      workOrders: true,
      analytics: false,
      videoUploads: false,
      advancedPermissions: false,
    },
    cta: "Get Started",
    highlight: false,
  },
  {
    name: "Professional",
    tier: "professional",
    priceMonthlyUSD: 59,
    priceYearlyUSD: Math.round(59 * 12 * 0.85),
    priceMonthlyIDR: 950000,
    priceYearlyIDR: Math.round(950000 * 12 * 0.85),
    description: "For growing teams that need analytics and more capacity.",
    features: {
      users: "Up to 25",
      departments: "Up to 15",
      storage: "100 GB",
      workOrders: true,
      analytics: true,
      videoUploads: true,
      advancedPermissions: false,
    },
    cta: "Start Free Trial",
    highlight: true,
  },
  {
    name: "Business",
    tier: "enterprise",
    priceMonthlyUSD: null,
    priceYearlyUSD: null,
    priceMonthlyIDR: null,
    priceYearlyIDR: null,
    description: "For large organizations with custom needs and compliance requirements.",
    features: {
      users: "Unlimited",
      departments: "Unlimited",
      storage: "500 GB",
      workOrders: true,
      analytics: true,
      videoUploads: true,
      advancedPermissions: true,
    },
    cta: "Contact Sales",
    highlight: false,
  },
];

const featureRows = [
  { label: "Users", key: "users", icon: Users },
  { label: "Departments", key: "departments", icon: Building2 },
  { label: "Storage", key: "storage", icon: HardDrive },
  { label: "Work Orders", key: "workOrders", icon: Wrench },
  { label: "Analytics & Reports", key: "analytics", icon: BarChart3 },
  { label: "Video Uploads", key: "videoUploads", icon: Video },
  { label: "Advanced Permissions", key: "advancedPermissions", icon: Shield },
];

export default function Landing() {
  const [isYearly, setIsYearly] = useState(false);
  const [currency, setCurrency] = useState<Currency>("IDR");
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-9 w-9 overflow-hidden flex items-center justify-center">
              <img
                alt="Opsecta"
                className="scale-[3.5]"
                src="/opsecta-logo.png"
              />
            </div>
            <span className="text-xl font-bold text-foreground tracking-tight">
              Opsecta
            </span>
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
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/login")}
                >
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
            Start your 30-day free trial today
          </Badge>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground tracking-tight leading-tight max-w-4xl mx-auto">
            Streamline Your{" "}
            <span className="text-primary">Inspections</span> &{" "}
            <span className="text-accent">Work Orders</span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            The all-in-one platform for managing checklists, inspections, work
            orders, and compliance — built for modern operational teams.
            Try it free for 30 days, no credit card required.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="text-base px-8"
              onClick={() => navigate("/register")}
            >
              Start Free Trial
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="text-base px-8"
              onClick={() =>
                document
                  .getElementById("pricing")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
            >
              View Pricing
            </Button>
          </div>
        </div>
      </section>

      {/* Trust bar */}
      <section className="border-y border-border/50 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { icon: ClipboardCheck, label: "Digital Checklists", desc: "Customizable templates" },
              { icon: Wrench, label: "Work Orders", desc: "Track & resolve issues" },
              { icon: BarChart3, label: "Analytics", desc: "Data-driven insights" },
              { icon: Lock, label: "Secure & Compliant", desc: "Enterprise-grade security" },
            ].map((item) => (
              <div key={item.label} className="flex flex-col items-center gap-2">
                <item.icon className="w-6 h-6 text-primary" />
                <span className="font-semibold text-foreground text-sm">{item.label}</span>
                <span className="text-xs text-muted-foreground">{item.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
              Simple, transparent pricing
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto">
              Choose the plan that fits your team. All plans include a 30-day free trial. No credit card required.
            </p>

            {/* Currency selector */}
            <div className="mt-6 flex items-center justify-center gap-2">
              {(["IDR", "USD"] as Currency[]).map((c) => (
                <button
                  key={c}
                  onClick={() => setCurrency(c)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                    currency === c
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {c === "IDR" ? "🇮🇩 IDR" : "🇺🇸 USD"}
                </button>
              ))}
            </div>

            {/* Billing toggle */}
            <div className="mt-4 flex items-center justify-center gap-3">
              <span
                className={`text-sm font-medium ${!isYearly ? "text-foreground" : "text-muted-foreground"}`}
              >
                Monthly
              </span>
              <Switch checked={isYearly} onCheckedChange={setIsYearly} />
              <span
                className={`text-sm font-medium ${isYearly ? "text-foreground" : "text-muted-foreground"}`}
              >
                Yearly
              </span>
              {isYearly && (
                <Badge className="bg-accent/10 text-accent border-accent/20 ml-1">
                  Save 15%
                </Badge>
              )}
            </div>
          </div>

          {/* Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map((plan) => (
              <div
                key={plan.tier}
                className={`relative rounded-2xl border p-8 flex flex-col transition-all duration-200 ${
                  plan.highlight
                    ? "border-primary shadow-lg shadow-primary/10 scale-[1.02] bg-card"
                    : "border-border bg-card hover:border-primary/30 hover:shadow-md"
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground px-4 py-1 text-xs font-semibold">
                      Most Popular
                    </Badge>
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
                </div>

                <div className="mb-8">
                  {plan.priceMonthlyUSD !== null ? (
                    (() => {
                      const monthly = currency === "IDR" ? plan.priceMonthlyIDR! : plan.priceMonthlyUSD;
                      const yearly = currency === "IDR" ? plan.priceYearlyIDR! : plan.priceYearlyUSD;
                      const displayPrice = isYearly ? Math.round(yearly / 12) : monthly;
                      return (
                        <>
                          <div className="flex items-baseline gap-1">
                            <span className={`font-bold text-foreground ${currency === "IDR" ? "text-3xl" : "text-4xl"}`}>
                              {formatPrice(displayPrice, currency)}
                            </span>
                            <span className="text-muted-foreground text-sm">/mo</span>
                          </div>
                          {isYearly && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatPrice(yearly, currency)}/yr · billed annually
                            </p>
                          )}
                        </>
                      );
                    })()
                  ) : (
                    <div className="flex items-baseline">
                      <span className="text-4xl font-bold text-foreground">Custom</span>
                    </div>
                  )}
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {featureRows.map((row) => {
                    const val = plan.features[row.key as keyof typeof plan.features];
                    const isEnabled = val === true || (typeof val === "string");
                    return (
                      <li key={row.key} className="flex items-center gap-2.5 text-sm">
                        {isEnabled ? (
                          <Check className="w-4 h-4 text-accent shrink-0" />
                        ) : (
                          <X className="w-4 h-4 text-muted-foreground/50 shrink-0" />
                        )}
                        <span className={isEnabled ? "text-foreground" : "text-muted-foreground/60"}>
                          {typeof val === "string" ? `${row.label}: ${val}` : row.label}
                        </span>
                      </li>
                    );
                  })}
                </ul>

                {plan.tier !== "enterprise" && (
                  <p className="text-xs text-muted-foreground text-center mb-3">
                    30-day free trial · No credit card required
                  </p>
                )}

                <Button
                  className="w-full"
                  variant={plan.highlight ? "default" : "outline"}
                  size="lg"
                  onClick={() => {
                    if (plan.tier === "enterprise") {
                      window.location.href = "mailto:sales@opsecta.com?subject=Business Plan Inquiry";
                    } else {
                      navigate("/register");
                    }
                  }}
                >
                  {plan.cta}
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 bg-muted/30 border-t border-border/50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-foreground text-center mb-10">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            {[
              {
                q: "Can I try before I buy?",
                a: "Yes! All plans include a 30-day free trial. No credit card required to get started.",
              },
              {
                q: "Can I upgrade or downgrade anytime?",
                a: "Absolutely. You can switch between plans at any time. Changes take effect on your next billing cycle.",
              },
              {
                q: "What payment methods do you accept?",
                a: "We accept all major credit cards and bank transfers for annual plans.",
              },
              {
                q: "Is my data secure?",
                a: "Yes. We use enterprise-grade encryption, row-level security, and comply with industry standards.",
              },
            ].map((item) => (
              <div key={item.q} className="border border-border rounded-xl p-5 bg-card">
                <h3 className="font-semibold text-foreground">{item.q}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.a}</p>
              </div>
            ))}
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
              <Link to="/login" className="hover:text-foreground transition-colors">Sign In</Link>
              <Link to="/register" className="hover:text-foreground transition-colors">Register</Link>
              <Link to="/terms" className="hover:text-foreground transition-colors">Terms</Link>
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
