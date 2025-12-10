import { ArrowLeft, Shield, Copyright, Scale, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function Terms() {
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Terms of Service</h1>
            <p className="text-sm text-muted-foreground">Legal & Intellectual Property</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Copyright Notice */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Copyright className="w-5 h-5 text-primary" />
              Copyright & Intellectual Property
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-lg font-semibold">
              © {currentYear} SpecVerse (SV). All Rights Reserved.
            </p>
            <p className="text-muted-foreground">
              SpecVerse, SV, and all associated logos, designs, user interface elements, 
              source code, algorithms, database schemas, and proprietary technologies are 
              the exclusive intellectual property of SpecVerse and its creators.
            </p>
            <div className="bg-background/60 rounded-lg p-4 border border-border">
              <h4 className="font-semibold mb-2">Protected Elements Include:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>SpecVerse brand name, logo, and visual identity</li>
                <li>MATRIX AI system architecture and algorithms</li>
                <li>Neuron messaging platform and features</li>
                <li>LAB Ops restaurant management system</li>
                <li>Music Box audio processing technology</li>
                <li>GM-Command Intelligence Suite</li>
                <li>All proprietary cocktail SOP methodologies</li>
                <li>User interface designs and user experience patterns</li>
                <li>Source code, APIs, and technical implementations</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Terms of Use */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Terms of Use
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <section>
              <h3 className="font-semibold mb-2">1. Acceptance of Terms</h3>
              <p className="text-muted-foreground text-sm">
                By accessing or using SpecVerse (the "Platform"), you agree to be bound by these 
                Terms of Service. If you do not agree to these terms, you must not access or use 
                the Platform.
              </p>
            </section>

            <Separator />

            <section>
              <h3 className="font-semibold mb-2">2. User Accounts</h3>
              <p className="text-muted-foreground text-sm">
                You are responsible for maintaining the confidentiality of your account credentials 
                and for all activities that occur under your account. You must provide accurate and 
                complete information when creating an account.
              </p>
            </section>

            <Separator />

            <section>
              <h3 className="font-semibold mb-2">3. User Content</h3>
              <p className="text-muted-foreground text-sm">
                You retain ownership of content you create and share on the Platform. By posting 
                content, you grant SpecVerse a non-exclusive, worldwide, royalty-free license to 
                use, display, and distribute your content within the Platform for operational purposes.
              </p>
            </section>

            <Separator />

            <section>
              <h3 className="font-semibold mb-2">4. Prohibited Activities</h3>
              <p className="text-muted-foreground text-sm mb-2">You agree not to:</p>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li>Copy, modify, or distribute the Platform's source code</li>
                <li>Reverse engineer or attempt to extract the Platform's algorithms</li>
                <li>Use the Platform for any illegal or unauthorized purpose</li>
                <li>Impersonate others or misrepresent your affiliation</li>
                <li>Interfere with or disrupt the Platform's security features</li>
              </ul>
            </section>

            <Separator />

            <section>
              <h3 className="font-semibold mb-2">5. Intellectual Property Rights</h3>
              <p className="text-muted-foreground text-sm">
                All intellectual property rights in the Platform, including but not limited to 
                patents, copyrights, trademarks, trade secrets, and proprietary technology, are 
                owned by SpecVerse. Unauthorized use, reproduction, or distribution of any 
                Platform materials is strictly prohibited and may result in legal action.
              </p>
            </section>
          </CardContent>
        </Card>

        {/* Privacy & Data */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Privacy & Data Protection
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground text-sm">
              We are committed to protecting your privacy. Personal data is collected, processed, 
              and stored in accordance with applicable data protection laws and our Privacy Policy.
            </p>
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-semibold mb-2 text-sm">Data We Collect:</h4>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li>Account information (name, email, profile data)</li>
                <li>Usage data and analytics for platform improvement</li>
                <li>Content you create and share on the Platform</li>
                <li>Communication data when you contact support</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Disclaimer */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scale className="w-5 h-5 text-primary" />
              Disclaimer & Limitation of Liability
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground text-sm">
              THE PLATFORM IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND. TO THE MAXIMUM 
              EXTENT PERMITTED BY LAW, SPECVERSE DISCLAIMS ALL WARRANTIES, EXPRESS OR IMPLIED, 
              INCLUDING MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE.
            </p>
            <p className="text-muted-foreground text-sm">
              SpecVerse shall not be liable for any indirect, incidental, special, consequential, 
              or punitive damages arising from your use of the Platform.
            </p>
          </CardContent>
        </Card>

        {/* Contact */}
        <Card className="bg-muted/30">
          <CardContent className="py-6 text-center">
            <p className="text-sm text-muted-foreground mb-2">
              For legal inquiries or intellectual property matters, contact:
            </p>
            <p className="font-semibold">legal@specverse.app</p>
            <p className="text-xs text-muted-foreground mt-4">
              Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
