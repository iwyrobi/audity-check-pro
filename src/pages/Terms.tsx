import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Terms() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-lg">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-9 w-9 overflow-hidden flex items-center justify-center">
              <img alt="Opsecta" className="scale-[3.5]" src="/opsecta-logo.png" />
            </div>
            <span className="text-xl font-bold text-foreground tracking-tight">Opsecta</span>
          </Link>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Home
            </Link>
          </Button>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">Terms & Conditions</h1>
        <p className="text-muted-foreground mb-10">Last updated: March 5, 2026</p>

        <div className="prose prose-sm sm:prose max-w-none text-foreground space-y-8">
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing or using the Opsecta platform ("Service"), you agree to be bound by these Terms & Conditions ("Terms"). If you do not agree to these Terms, you may not access or use the Service. These Terms apply to all users, including organization administrators, department heads, and team members.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">2. Description of Service</h2>
            <p className="text-muted-foreground leading-relaxed">
              Opsecta is a cloud-based operational management platform that provides digital checklists, inspection management, work order tracking, analytics, and reporting tools. The Service is provided on a subscription basis with different plan tiers offering varying features and capacity limits.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">3. Account Registration</h2>
            <p className="text-muted-foreground leading-relaxed">
              To use the Service, an organization must be registered by a founding user who will serve as the initial administrator ("Super Admin"). You agree to provide accurate and complete information during registration and to keep your account credentials secure. You are responsible for all activity that occurs under your account. Additional users may be added by the organization administrator.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">4. Free Trial</h2>
            <p className="text-muted-foreground leading-relaxed">
              Opsecta offers a 30-day free trial for new organizations. During the trial period, you have access to the features included in your selected plan. No credit card is required to start the trial. At the end of the trial period, you must subscribe to a paid plan to continue using the Service. If you do not subscribe, your access will be restricted until a subscription is activated.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">5. Subscription & Payment</h2>
            <p className="text-muted-foreground leading-relaxed">
              Paid subscriptions are billed on a monthly or yearly basis depending on your selected billing cycle. Prices are as listed on our pricing page and are subject to change with prior notice. You may upgrade or downgrade your plan at any time; changes take effect on your next billing cycle. Refunds are handled on a case-by-case basis.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">6. Data Ownership & Privacy</h2>
            <p className="text-muted-foreground leading-relaxed">
              You retain ownership of all data you submit to the Service, including inspection records, checklists, work orders, and uploaded media. Opsecta will not sell, share, or distribute your data to third parties except as required by law or as necessary to provide the Service. We use enterprise-grade encryption and row-level security to protect your data. For more details, please refer to our Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">7. Acceptable Use</h2>
            <p className="text-muted-foreground leading-relaxed">You agree not to:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1.5 mt-2">
              <li>Use the Service for any unlawful purpose or in violation of any applicable laws or regulations.</li>
              <li>Attempt to gain unauthorized access to any part of the Service, other accounts, or systems.</li>
              <li>Upload malicious code, viruses, or any content that could harm the Service or other users.</li>
              <li>Interfere with or disrupt the integrity or performance of the Service.</li>
              <li>Resell, sublicense, or redistribute the Service without written permission from Opsecta.</li>
              <li>Use the Service to store or transmit content that infringes on intellectual property rights.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">8. Service Availability</h2>
            <p className="text-muted-foreground leading-relaxed">
              Opsecta strives to maintain high availability of the Service but does not guarantee uninterrupted or error-free operation. We may perform scheduled maintenance with advance notice. We are not liable for any downtime, data loss, or damages resulting from service interruptions beyond our reasonable control.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">9. Intellectual Property</h2>
            <p className="text-muted-foreground leading-relaxed">
              The Service, including its design, code, features, and branding, is the property of Opsecta and is protected by intellectual property laws. You may not copy, modify, or create derivative works based on the Service. Your use of the Service does not grant you any ownership rights to its intellectual property.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">10. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              To the maximum extent permitted by law, Opsecta shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Service. Our total liability for any claim related to the Service shall not exceed the amount you paid for the Service in the twelve (12) months preceding the claim.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">11. Termination</h2>
            <p className="text-muted-foreground leading-relaxed">
              Either party may terminate the subscription at any time. Upon termination, your access to the Service will be revoked. You may request an export of your data within 30 days of termination. After 30 days, your data may be permanently deleted. Opsecta reserves the right to suspend or terminate accounts that violate these Terms without prior notice.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">12. Changes to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              Opsecta reserves the right to modify these Terms at any time. We will notify registered users of material changes via email or in-app notification. Continued use of the Service after changes are posted constitutes your acceptance of the updated Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">13. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have any questions about these Terms, please contact us at{" "}
              <a href="mailto:legal@opsecta.com" className="text-primary hover:underline">
                legal@opsecta.com
              </a>.
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-background mt-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
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
