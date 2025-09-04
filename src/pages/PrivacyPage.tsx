import { Shield, Eye, Lock, Database, Mail, UserCheck } from 'lucide-react';

export function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-card rounded-lg border border-border p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <Shield className="h-12 w-12 text-primary mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-foreground mb-2">Privacy Policy</h1>
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
            {/* Introduction */}
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center">
                <Eye className="h-5 w-5 mr-2 text-primary" />
                Introduction
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                At JoinHands, we are committed to protecting your privacy and ensuring the security of your personal information. 
                This Privacy Policy explains how we collect, use, and safeguard your data when you use our platform to connect 
                volunteers with NGOs and participate in community events.
              </p>
            </section>

            {/* Information We Collect */}
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center">
                <Database className="h-5 w-5 mr-2 text-primary" />
                Information We Collect
              </h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-foreground mb-2">Account Information</h3>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1">
                    <li>Full name, username, and email address</li>
                    <li>Account type (volunteer or NGO)</li>
                    <li>Profile picture and bio (optional)</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-medium text-foreground mb-2">NGO Information</h3>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1">
                    <li>Organization name, description, and website</li>
                    <li>Cause areas and service locations</li>
                    <li>Logo and contact information</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-medium text-foreground mb-2">Event and Registration Data</h3>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1">
                    <li>Event registrations and participation history</li>
                    <li>Volunteer enrollment status with NGOs</li>
                    <li>Generated certificates and achievements</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* How We Use Your Information */}
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center">
                <UserCheck className="h-5 w-5 mr-2 text-primary" />
                How We Use Your Information
              </h2>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>To create and manage your account</li>
                <li>To facilitate connections between volunteers and NGOs</li>
                <li>To process event registrations and manage participation</li>
                <li>To generate certificates of participation</li>
                <li>To send important notifications about events and registrations</li>
                <li>To improve our platform and user experience</li>
              </ul>
            </section>

            {/* Data Security */}
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center">
                <Lock className="h-5 w-5 mr-2 text-primary" />
                Data Security
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                We implement industry-standard security measures to protect your personal information:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>End-to-end encryption for all data transmission</li>
                <li>Secure authentication using Supabase Auth</li>
                <li>Row-level security (RLS) policies to protect user data</li>
                <li>Regular security audits and updates</li>
                <li>Secure file storage for uploaded images and documents</li>
              </ul>
            </section>

            {/* Your Rights */}
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center">
                <Shield className="h-5 w-5 mr-2 text-primary" />
                Your Rights
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                You have the following rights regarding your personal data:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li><strong>Access:</strong> View and download your personal data</li>
                <li><strong>Update:</strong> Modify your profile information at any time</li>
                <li><strong>Delete:</strong> Request deletion of your account and all associated data</li>
                <li><strong>Portability:</strong> Export your data in a machine-readable format</li>
                <li><strong>Opt-out:</strong> Unsubscribe from marketing communications</li>
              </ul>
            </section>

            {/* Contact */}
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center">
                <Mail className="h-5 w-5 mr-2 text-primary" />
                Contact Us
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                If you have any questions about this Privacy Policy or how we handle your data, 
                please contact us at{' '}
                <a 
                  href="mailto:privacy@joinhands.org" 
                  className="text-primary hover:text-primary/80 transition-colors"
                >
                  privacy@joinhands.org
                </a>
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}