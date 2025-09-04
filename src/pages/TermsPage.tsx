import { FileText, Scale, Users, Shield, AlertTriangle, CheckCircle } from 'lucide-react';

export function TermsPage() {
  return (
    <div className="min-h-screen bg-background py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-card rounded-lg border border-border p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <Scale className="h-12 w-12 text-primary mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-foreground mb-2">Terms of Service</h1>
            <p className="text-muted-foreground">
              Last updated: {new Date().toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>

          {/* Content */}
          <div className="prose prose-gray max-w-none space-y-8">
            {/* Acceptance */}
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center">
                <CheckCircle className="h-5 w-5 mr-2 text-primary" />
                Acceptance of Terms
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                By accessing and using JoinHands, you accept and agree to be bound by the terms and provision 
                of this agreement. If you do not agree to abide by the above, please do not use this service.
              </p>
            </section>

            {/* Platform Description */}
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center">
                <Users className="h-5 w-5 mr-2 text-primary" />
                Platform Description
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                JoinHands is a platform that connects volunteers with Non-Governmental Organizations (NGOs) 
                to facilitate community service and social impact activities. Our services include:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>Event discovery and registration for volunteers</li>
                <li>NGO profile management and volunteer recruitment</li>
                <li>Certificate generation for completed volunteer activities</li>
                <li>Location-based filtering and search capabilities</li>
                <li>Real-time updates and notifications</li>
              </ul>
            </section>

            {/* User Responsibilities */}
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center">
                <Shield className="h-5 w-5 mr-2 text-primary" />
                User Responsibilities
              </h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-foreground mb-2">For All Users</h3>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1">
                    <li>Provide accurate and truthful information</li>
                    <li>Maintain the security of your account credentials</li>
                    <li>Respect other users and maintain professional conduct</li>
                    <li>Comply with all applicable laws and regulations</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-medium text-foreground mb-2">For NGOs</h3>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1">
                    <li>Verify the legitimacy of your organization</li>
                    <li>Provide accurate event information and requirements</li>
                    <li>Treat volunteers fairly and with respect</li>
                    <li>Honor commitments made to volunteers</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-medium text-foreground mb-2">For Volunteers</h3>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1">
                    <li>Commit to registered events and attend as promised</li>
                    <li>Follow NGO guidelines and instructions</li>
                    <li>Notify NGOs promptly if unable to attend events</li>
                    <li>Provide feedback to help improve the platform</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Prohibited Activities */}
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2 text-destructive" />
                Prohibited Activities
              </h2>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>Creating fake accounts or impersonating others</li>
                <li>Posting false, misleading, or inappropriate content</li>
                <li>Using the platform for commercial purposes without authorization</li>
                <li>Attempting to access unauthorized areas of the platform</li>
                <li>Harassing, threatening, or discriminating against other users</li>
                <li>Violating any applicable laws or regulations</li>
              </ul>
            </section>

            {/* Limitation of Liability */}
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center">
                <FileText className="h-5 w-5 mr-2 text-primary" />
                Limitation of Liability
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                JoinHands serves as a platform to connect volunteers and NGOs. We are not responsible for 
                the actions, conduct, or safety of users during volunteer activities. Users participate in 
                events at their own risk and should exercise appropriate caution and judgment.
              </p>
            </section>

            {/* Changes to Terms */}
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4">Changes to Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                We reserve the right to modify these terms at any time. Users will be notified of significant 
                changes via email or platform notifications. Continued use of the platform after changes 
                constitutes acceptance of the new terms.
              </p>
            </section>

            {/* Contact */}
            <section className="bg-muted/50 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-foreground mb-4">Questions?</h2>
              <p className="text-muted-foreground leading-relaxed">
                If you have any questions about these Terms of Service, please contact us at{' '}
                <a 
                  href="mailto:legal@joinhands.org" 
                  className="text-primary hover:text-primary/80 transition-colors"
                >
                  legal@joinhands.org
                </a>
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}