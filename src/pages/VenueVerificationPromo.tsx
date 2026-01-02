import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, 
  Building2, 
  Shield, 
  Users, 
  CheckCircle2, 
  BadgeCheck, 
  FileCheck, 
  Briefcase,
  UserCheck,
  Mail,
  Phone,
  Globe,
  FileText,
  Clock,
  AlertTriangle,
  Star
} from "lucide-react";
import { motion } from "framer-motion";
import VenueVerificationPromoReel from "@/components/promo/VenueVerificationPromoReel";

const VenueVerificationPromo = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated background - matching landing page */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-blue-950/20 to-background pointer-events-none" />
      
      {/* Glow effects */}
      <div className="absolute top-20 left-10 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse pointer-events-none" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse pointer-events-none" style={{ animationDelay: '1s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-3xl animate-pulse pointer-events-none" style={{ animationDelay: '2s' }} />

      {/* Content */}
      <div className="relative z-10 min-h-screen">
        {/* Header */}
        <header className="px-4 sm:px-6 py-4 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="text-foreground hover:text-primary"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-amber-500 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold text-gradient-primary">Venue Verification</span>
          </div>
          <Button
            onClick={() => navigate("/auth")}
            className="glass glow-primary border-primary/30 hover:border-primary/50 text-white"
          >
            Get Started
          </Button>
        </header>

        {/* Main content */}
        <main className="px-4 sm:px-6 py-8 max-w-7xl mx-auto">
          {/* Hero Section */}
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center mb-16">
            {/* Left - Promo Reel */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex justify-center"
            >
              <VenueVerificationPromoReel />
            </motion.div>

            {/* Right - Hero text */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-6"
            >
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-primary/20 to-amber-500/20 border border-primary/30 px-4 py-2 rounded-full">
                <Shield className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary">Trusted Verification System</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight">
                Build Trust with{" "}
                <span className="text-gradient-primary">Verified</span>{" "}
                Venues & Careers
              </h1>

              <p className="text-lg text-muted-foreground">
                Register your venue or claim your employment history. 
                Get verified and join a network of trusted hospitality professionals.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  size="lg"
                  onClick={() => navigate("/auth")}
                  className="bg-gradient-to-r from-primary to-amber-500 text-primary-foreground font-bold rounded-xl hover:opacity-90 glow-primary"
                >
                  <Building2 className="w-4 h-4 mr-2" />
                  Register Venue
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => navigate("/auth")}
                  className="glass hover:border-accent/50 text-white"
                >
                  <Briefcase className="w-4 h-4 mr-2" />
                  Claim Employment
                </Button>
              </div>
            </motion.div>
          </div>

          {/* How It Works - Venue Registration */}
          <motion.section
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16"
          >
            <h2 className="text-2xl font-bold text-white mb-8 text-center">
              <Building2 className="w-6 h-6 inline mr-2 text-primary" />
              Venue Registration Process
            </h2>

            <div className="grid md:grid-cols-4 gap-4">
              {[
                { step: 1, icon: FileText, title: "Basic Info", desc: "Venue name, type, location" },
                { step: 2, icon: Globe, title: "Add Outlets", desc: "Register multiple locations" },
                { step: 3, icon: Shield, title: "Verify", desc: "Choose verification method" },
                { step: 4, icon: BadgeCheck, title: "Go Live", desc: "Receive verified badge" },
              ].map((item, idx) => (
                <motion.div
                  key={item.step}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                  className="glass rounded-2xl p-6 text-center glass-hover"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center mx-auto mb-4">
                    <item.icon className="w-6 h-6 text-primary" />
                  </div>
                  <div className="text-xs text-muted-foreground mb-2">Step {item.step}</div>
                  <h3 className="font-semibold text-white mb-1">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.section>

          {/* Verification Methods */}
          <motion.section
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16"
          >
            <h2 className="text-2xl font-bold text-white mb-8 text-center">
              <Shield className="w-6 h-6 inline mr-2 text-blue-400" />
              Verification Methods
            </h2>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { icon: Mail, title: "Email", desc: "Verify via business email domain", color: "blue-400" },
                { icon: Phone, title: "Phone OTP", desc: "SMS verification to business number", color: "green-400" },
                { icon: Globe, title: "Social/Web", desc: "Link official social media or website", color: "purple-400" },
                { icon: FileText, title: "Documents", desc: "Upload business license or registration", color: "amber-400" },
              ].map((item, idx) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                  className="glass rounded-2xl p-6 glass-hover"
                >
                  <div className={`w-10 h-10 rounded-lg bg-${item.color}/20 flex items-center justify-center mb-4`}>
                    <item.icon className={`w-5 h-5 text-${item.color}`} />
                  </div>
                  <h3 className="font-semibold text-white mb-1">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.section>

          {/* Employment Verification Flow */}
          <motion.section
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16"
          >
            <h2 className="text-2xl font-bold text-white mb-8 text-center">
              <Briefcase className="w-6 h-6 inline mr-2 text-emerald-400" />
              Employment Verification Flow
            </h2>

            <div className="glass rounded-2xl p-6 lg:p-8">
              <div className="grid lg:grid-cols-2 gap-8">
                {/* Staff Side */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-400" />
                    Staff Claims Employment
                  </h3>
                  <div className="space-y-3">
                    {[
                      "Select verified venue from search",
                      "Enter position title & department",
                      "Specify start & end dates",
                      "Upload optional proof documents",
                      "Submit for venue review"
                    ].map((step, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-xs text-blue-400 font-bold">
                          {idx + 1}
                        </div>
                        <span className="text-sm text-white/80">{step}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Admin Side */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-emerald-400" />
                    Venue Admin Reviews
                  </h3>
                  <div className="space-y-3">
                    {[
                      { action: "Approve", desc: "Confirm employment details", color: "emerald" },
                      { action: "Edit & Approve", desc: "Correct dates or position", color: "amber" },
                      { action: "Reject", desc: "Decline with reason", color: "rose" },
                    ].map((item, idx) => (
                      <div key={idx} className={`flex items-center gap-3 bg-${item.color}-500/10 border border-${item.color}-500/20 rounded-lg p-3`}>
                        <CheckCircle2 className={`w-5 h-5 text-${item.color}-400`} />
                        <div>
                          <div className={`text-sm font-medium text-${item.color}-400`}>{item.action}</div>
                          <div className="text-xs text-muted-foreground">{item.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.section>

          {/* Admin Roles */}
          <motion.section
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16"
          >
            <h2 className="text-2xl font-bold text-white mb-8 text-center">
              <Star className="w-6 h-6 inline mr-2 text-amber-400" />
              Admin Role Hierarchy
            </h2>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { role: "Owner", desc: "Full control over venue & all outlets", level: 4, color: "primary" },
                { role: "HR Admin", desc: "Manage staff claims & approvals", level: 3, color: "blue-400" },
                { role: "Outlet Manager", desc: "Manage specific outlet staff", level: 2, color: "emerald-400" },
                { role: "Bar Manager", desc: "Department-level approvals", level: 1, color: "purple-400" },
              ].map((item, idx) => (
                <motion.div
                  key={item.role}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                  className="glass rounded-2xl p-5 glass-hover"
                >
                  <div className="flex items-center gap-2 mb-3">
                    {[...Array(item.level)].map((_, i) => (
                      <Star key={i} className={`w-4 h-4 text-${item.color} fill-current`} />
                    ))}
                  </div>
                  <h3 className="font-semibold text-white mb-1">{item.role}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.section>

          {/* Anti-Fraud */}
          <motion.section
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16"
          >
            <h2 className="text-2xl font-bold text-white mb-8 text-center">
              <AlertTriangle className="w-6 h-6 inline mr-2 text-rose-400" />
              Anti-Fraud Detection
            </h2>

            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { title: "Overlapping Dates", desc: "Flags claims with conflicting employment periods", icon: Clock },
                { title: "Rapid Switching", desc: "Detects unrealistic job hopping patterns", icon: AlertTriangle },
                { title: "Suspicious Patterns", desc: "AI-powered anomaly detection", icon: Shield },
              ].map((item, idx) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                  className="glass rounded-2xl p-6 border border-rose-500/20 glass-hover"
                >
                  <div className="w-10 h-10 rounded-lg bg-rose-500/20 flex items-center justify-center mb-4">
                    <item.icon className="w-5 h-5 text-rose-400" />
                  </div>
                  <h3 className="font-semibold text-white mb-1">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.section>

          {/* Final CTA */}
          <motion.section
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <div className="glass rounded-3xl p-8 lg:p-12 max-w-2xl mx-auto">
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
                Ready to Get Verified?
              </h2>
              <p className="text-muted-foreground mb-6">
                Join the trusted network of verified venues and professionals in hospitality.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  size="lg"
                  onClick={() => navigate("/auth")}
                  className="bg-gradient-to-r from-primary to-amber-500 text-primary-foreground font-bold rounded-xl hover:opacity-90 glow-primary"
                >
                  Start Free Today
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => navigate("/landing")}
                  className="glass hover:border-accent/50 text-white"
                >
                  Learn More
                </Button>
              </div>
            </div>
          </motion.section>
        </main>

        {/* Footer */}
        <footer className="px-6 py-8 text-center">
          <p className="text-sm text-muted-foreground">© 2024 SpecVerse. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
};

export default VenueVerificationPromo;
