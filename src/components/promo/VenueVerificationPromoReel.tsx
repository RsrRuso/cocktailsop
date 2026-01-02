import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Building2, 
  Shield, 
  Users, 
  CheckCircle2, 
  BadgeCheck, 
  FileCheck, 
  Briefcase,
  MapPin,
  Clock,
  UserCheck,
  Play,
  Pause,
  Volume2,
  VolumeX,
  ChevronUp,
  ChevronDown,
  Mail,
  Phone,
  Globe,
  FileText,
  Upload,
  Send,
  Check,
  ArrowRight,
  Sparkles,
  LayoutDashboard,
  UserPlus,
  ClipboardList,
  Bell,
  Settings,
  PieChart,
  TrendingUp,
  Star,
  MessageSquare,
  Calendar,
  Award
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Progress } from "@/components/ui/progress";

interface SimulationStep {
  id: string;
  phase: string;
  stepNumber: number;
  totalSteps: number;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ElementType;
  screenType: "form" | "action" | "success" | "dashboard";
  mockUI: React.ReactNode;
  tips: string[];
  gradient: string;
}

const SIMULATION_STEPS: SimulationStep[] = [
  {
    id: "welcome",
    phase: "Getting Started",
    stepNumber: 1,
    totalSteps: 12,
    title: "Welcome to Venue Verification",
    subtitle: "Your journey starts here",
    description: "Join the trusted network of verified hospitality venues",
    icon: Sparkles,
    screenType: "action",
    mockUI: null, // Will render custom
    tips: ["Free for all venues", "Takes ~5 minutes", "Multiple verification options"],
    gradient: "from-primary via-amber-500 to-orange-500"
  },
  {
    id: "register-brand",
    phase: "Registration",
    stepNumber: 2,
    totalSteps: 12,
    title: "Register Your Brand",
    subtitle: "Step 1: Basic Details",
    description: "Enter your venue's brand name and type",
    icon: Building2,
    screenType: "form",
    mockUI: null,
    tips: ["Use official brand name", "Select correct venue type", "Add logo for recognition"],
    gradient: "from-blue-500 via-indigo-500 to-purple-500"
  },
  {
    id: "add-outlets",
    phase: "Registration",
    stepNumber: 3,
    totalSteps: 12,
    title: "Add Your Outlets",
    subtitle: "Step 2: Location Details",
    description: "Add all your venue locations with addresses",
    icon: MapPin,
    screenType: "form",
    mockUI: null,
    tips: ["Add multiple locations", "Include full addresses", "Set primary outlet"],
    gradient: "from-emerald-500 via-teal-500 to-cyan-500"
  },
  {
    id: "contact-info",
    phase: "Registration",
    stepNumber: 4,
    totalSteps: 12,
    title: "Contact Information",
    subtitle: "Step 3: Verification Contact",
    description: "Provide official contact details for verification",
    icon: Mail,
    screenType: "form",
    mockUI: null,
    tips: ["Use business email", "Add landline if available", "Include website URL"],
    gradient: "from-rose-500 via-pink-500 to-fuchsia-500"
  },
  {
    id: "choose-verification",
    phase: "Verification",
    stepNumber: 5,
    totalSteps: 12,
    title: "Choose Verification Method",
    subtitle: "Multiple options available",
    description: "Select how you want to verify your venue ownership",
    icon: Shield,
    screenType: "action",
    mockUI: null,
    tips: ["Email is fastest", "Phone for extra security", "Documents for complex cases"],
    gradient: "from-violet-500 via-purple-500 to-indigo-500"
  },
  {
    id: "verify-email",
    phase: "Verification",
    stepNumber: 6,
    totalSteps: 12,
    title: "Email Verification",
    subtitle: "Verify via domain email",
    description: "Receive OTP on your business domain email",
    icon: Mail,
    screenType: "action",
    mockUI: null,
    tips: ["Check spam folder", "OTP valid for 10 mins", "Verify domain ownership"],
    gradient: "from-blue-600 via-blue-500 to-cyan-500"
  },
  {
    id: "verification-complete",
    phase: "Verification",
    stepNumber: 7,
    totalSteps: 12,
    title: "Verification Complete!",
    subtitle: "Your venue is now verified",
    description: "Congratulations! You've earned the verified badge",
    icon: BadgeCheck,
    screenType: "success",
    mockUI: null,
    tips: ["Badge visible on profile", "Unlocks all features", "Staff can now claim jobs"],
    gradient: "from-green-500 via-emerald-500 to-teal-500"
  },
  {
    id: "dashboard-overview",
    phase: "Your Dashboard",
    stepNumber: 8,
    totalSteps: 12,
    title: "Your Venue Dashboard",
    subtitle: "Command center unlocked",
    description: "Access powerful tools to manage your venue and team",
    icon: LayoutDashboard,
    screenType: "dashboard",
    mockUI: null,
    tips: ["Real-time analytics", "Team management", "Employment requests"],
    gradient: "from-primary via-amber-500 to-orange-500"
  },
  {
    id: "manage-admins",
    phase: "Team Setup",
    stepNumber: 9,
    totalSteps: 12,
    title: "Add Admin Roles",
    subtitle: "Assign team members",
    description: "Invite HR managers, outlet managers, and bar managers",
    icon: UserPlus,
    screenType: "form",
    mockUI: null,
    tips: ["HR handles claims", "Per-outlet managers", "Role-based access"],
    gradient: "from-indigo-500 via-purple-500 to-pink-500"
  },
  {
    id: "claims-inbox",
    phase: "Employment Claims",
    stepNumber: 10,
    totalSteps: 12,
    title: "Employment Claims Inbox",
    subtitle: "Manage staff verifications",
    description: "Review and approve employment claims from staff",
    icon: ClipboardList,
    screenType: "dashboard",
    mockUI: null,
    tips: ["Approve or edit claims", "Add notes", "Reject with reason"],
    gradient: "from-amber-500 via-orange-500 to-red-500"
  },
  {
    id: "approve-claim",
    phase: "Employment Claims",
    stepNumber: 11,
    totalSteps: 12,
    title: "Approve a Claim",
    subtitle: "Verify staff employment",
    description: "Review claim details and approve with one click",
    icon: UserCheck,
    screenType: "action",
    mockUI: null,
    tips: ["Edit dates if needed", "Add job title details", "Instant verification"],
    gradient: "from-green-500 via-emerald-500 to-cyan-500"
  },
  {
    id: "final-success",
    phase: "Complete",
    stepNumber: 12,
    totalSteps: 12,
    title: "You're All Set!",
    subtitle: "Full system access unlocked",
    description: "Your venue is verified and team management is active",
    icon: Star,
    screenType: "success",
    mockUI: null,
    tips: ["Verified badge active", "Staff can claim jobs", "Analytics available"],
    gradient: "from-primary via-yellow-500 to-amber-500"
  }
];

// Mock UI Components for each step
const MockWelcomeScreen = () => (
  <div className="space-y-4">
    <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-primary to-amber-500 flex items-center justify-center animate-pulse">
      <Building2 className="w-8 h-8 text-primary-foreground" />
    </div>
    <div className="text-center space-y-2">
      <h3 className="text-lg font-bold text-white">Venue Verification</h3>
      <p className="text-xs text-white/70">Build trust with verified credentials</p>
    </div>
    <div className="space-y-2">
      {["Free Registration", "Quick Verification", "Team Management"].map((item, i) => (
        <motion.div
          key={item}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.2 }}
          className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2"
        >
          <CheckCircle2 className="w-4 h-4 text-green-400" />
          <span className="text-xs text-white">{item}</span>
        </motion.div>
      ))}
    </div>
    <Button className="w-full bg-white/20 border border-white/30 text-white text-sm">
      Start Registration
    </Button>
  </div>
);

const MockFormScreen = ({ fields }: { fields: { label: string; placeholder: string; icon: React.ElementType }[] }) => (
  <div className="space-y-3">
    {fields.map((field, i) => (
      <motion.div
        key={field.label}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: i * 0.1 }}
        className="space-y-1"
      >
        <label className="text-[10px] text-white/60 uppercase tracking-wider">{field.label}</label>
        <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2 border border-white/20">
          <field.icon className="w-4 h-4 text-white/50" />
          <span className="text-xs text-white/40">{field.placeholder}</span>
        </div>
      </motion.div>
    ))}
    <Button className="w-full bg-primary/80 text-primary-foreground text-sm mt-2">
      <span>Continue</span>
      <ArrowRight className="w-4 h-4 ml-2" />
    </Button>
  </div>
);

const MockVerificationOptions = () => (
  <div className="space-y-2">
    {[
      { icon: Mail, label: "Email Verification", desc: "Verify via domain email", status: "recommended" },
      { icon: Phone, label: "Phone Verification", desc: "OTP to landline", status: "" },
      { icon: Globe, label: "Social/Web Proof", desc: "Add code to website", status: "" },
      { icon: FileText, label: "Document Upload", desc: "License/permit upload", status: "" }
    ].map((option, i) => (
      <motion.button
        key={option.label}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: i * 0.1 }}
        className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
          i === 0 
            ? "bg-primary/30 border-primary/50" 
            : "bg-white/5 border-white/10 hover:bg-white/10"
        }`}
      >
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
          i === 0 ? "bg-primary/40" : "bg-white/10"
        }`}>
          <option.icon className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 text-left">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-white">{option.label}</span>
            {option.status && (
              <span className="text-[8px] px-1.5 py-0.5 bg-green-500/30 text-green-300 rounded-full">
                {option.status}
              </span>
            )}
          </div>
          <span className="text-[10px] text-white/50">{option.desc}</span>
        </div>
        <ArrowRight className="w-4 h-4 text-white/40" />
      </motion.button>
    ))}
  </div>
);

const MockEmailVerification = () => (
  <div className="space-y-4 text-center">
    <motion.div
      animate={{ scale: [1, 1.1, 1] }}
      transition={{ duration: 2, repeat: Infinity }}
      className="w-16 h-16 mx-auto rounded-2xl bg-blue-500/30 flex items-center justify-center"
    >
      <Mail className="w-8 h-8 text-blue-300" />
    </motion.div>
    <div>
      <p className="text-xs text-white/60">OTP sent to</p>
      <p className="text-sm font-medium text-white">admin@yourbar.com</p>
    </div>
    <div className="flex justify-center gap-2">
      {["4", "2", "8", "7", "5", "1"].map((digit, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="w-8 h-10 bg-white/10 rounded-lg flex items-center justify-center border border-white/30"
        >
          <span className="text-lg font-bold text-white">{digit}</span>
        </motion.div>
      ))}
    </div>
    <Button className="w-full bg-green-500/80 text-white text-sm">
      <Check className="w-4 h-4 mr-2" />
      Verify
    </Button>
  </div>
);

const MockSuccessScreen = ({ title, items }: { title: string; items: string[] }) => (
  <div className="space-y-4 text-center">
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 200 }}
      className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.3 }}
      >
        <BadgeCheck className="w-10 h-10 text-white" />
      </motion.div>
    </motion.div>
    <div>
      <h3 className="text-lg font-bold text-white">{title}</h3>
      <div className="flex items-center justify-center gap-1 mt-1">
        <Shield className="w-3 h-3 text-green-400" />
        <span className="text-xs text-green-400">Verified Status Active</span>
      </div>
    </div>
    <div className="space-y-2">
      {items.map((item, i) => (
        <motion.div
          key={item}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 + i * 0.1 }}
          className="flex items-center gap-2 bg-green-500/20 rounded-lg px-3 py-2"
        >
          <CheckCircle2 className="w-4 h-4 text-green-400" />
          <span className="text-xs text-white">{item}</span>
        </motion.div>
      ))}
    </div>
  </div>
);

const MockDashboard = () => (
  <div className="space-y-3">
    {/* Header */}
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-amber-500 flex items-center justify-center">
          <Building2 className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-xs font-bold text-white">The Grand Bar</p>
          <div className="flex items-center gap-1">
            <BadgeCheck className="w-3 h-3 text-green-400" />
            <span className="text-[10px] text-green-400">Verified</span>
          </div>
        </div>
      </div>
      <Bell className="w-4 h-4 text-white/60" />
    </div>

    {/* Stats Grid */}
    <div className="grid grid-cols-2 gap-2">
      {[
        { label: "Staff Claims", value: "12", icon: Users, color: "bg-blue-500/20" },
        { label: "Pending", value: "3", icon: Clock, color: "bg-amber-500/20" },
        { label: "Approved", value: "9", icon: CheckCircle2, color: "bg-green-500/20" },
        { label: "Team Size", value: "24", icon: UserPlus, color: "bg-purple-500/20" }
      ].map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.1 }}
          className={`${stat.color} rounded-xl p-2.5`}
        >
          <stat.icon className="w-4 h-4 text-white/60 mb-1" />
          <p className="text-lg font-bold text-white">{stat.value}</p>
          <p className="text-[10px] text-white/60">{stat.label}</p>
        </motion.div>
      ))}
    </div>

    {/* Quick Actions */}
    <div className="space-y-2">
      <p className="text-[10px] text-white/50 uppercase tracking-wider">Quick Actions</p>
      {[
        { label: "Review Claims", icon: ClipboardList, badge: "3 new" },
        { label: "Add Admin", icon: UserPlus, badge: null },
        { label: "View Analytics", icon: PieChart, badge: null }
      ].map((action, i) => (
        <motion.button
          key={action.label}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 + i * 0.1 }}
          className="w-full flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2 border border-white/10"
        >
          <action.icon className="w-4 h-4 text-white/60" />
          <span className="text-xs text-white flex-1 text-left">{action.label}</span>
          {action.badge && (
            <span className="text-[8px] px-1.5 py-0.5 bg-primary/30 text-primary rounded-full">
              {action.badge}
            </span>
          )}
          <ArrowRight className="w-3 h-3 text-white/40" />
        </motion.button>
      ))}
    </div>
  </div>
);

const MockClaimsInbox = () => (
  <div className="space-y-3">
    <div className="flex items-center justify-between">
      <h4 className="text-sm font-bold text-white">Claims Inbox</h4>
      <span className="text-[10px] px-2 py-0.5 bg-amber-500/30 text-amber-300 rounded-full">3 pending</span>
    </div>
    {[
      { name: "James Wilson", role: "Bartender", status: "pending", time: "2h ago" },
      { name: "Sarah Chen", role: "Server", status: "pending", time: "5h ago" },
      { name: "Mike Brown", role: "Bar Manager", status: "pending", time: "1d ago" }
    ].map((claim, i) => (
      <motion.div
        key={claim.name}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: i * 0.15 }}
        className="bg-white/5 rounded-xl p-3 border border-white/10"
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/50 to-amber-500/50 flex items-center justify-center">
            <span className="text-xs font-bold text-white">{claim.name[0]}</span>
          </div>
          <div className="flex-1">
            <p className="text-xs font-medium text-white">{claim.name}</p>
            <p className="text-[10px] text-white/50">{claim.role} • {claim.time}</p>
          </div>
          <span className="text-[8px] px-1.5 py-0.5 bg-amber-500/20 text-amber-300 rounded-full">
            Review
          </span>
        </div>
      </motion.div>
    ))}
  </div>
);

const MockApprovalAction = () => (
  <div className="space-y-4">
    <div className="text-center">
      <div className="w-12 h-12 mx-auto rounded-full bg-gradient-to-br from-primary/50 to-amber-500/50 flex items-center justify-center mb-2">
        <span className="text-lg font-bold text-white">J</span>
      </div>
      <h4 className="text-sm font-bold text-white">James Wilson</h4>
      <p className="text-[10px] text-white/50">Claims: Bartender Position</p>
    </div>
    
    <div className="space-y-2 bg-white/5 rounded-xl p-3">
      {[
        { label: "Position", value: "Lead Bartender" },
        { label: "Start Date", value: "Jan 2023" },
        { label: "End Date", value: "Present" },
        { label: "Department", value: "Bar Operations" }
      ].map((item) => (
        <div key={item.label} className="flex justify-between text-xs">
          <span className="text-white/50">{item.label}</span>
          <span className="text-white">{item.value}</span>
        </div>
      ))}
    </div>

    <div className="flex gap-2">
      <Button className="flex-1 bg-green-500/80 text-white text-xs py-2">
        <Check className="w-3 h-3 mr-1" /> Approve
      </Button>
      <Button variant="outline" className="flex-1 border-white/20 text-white text-xs py-2">
        Edit
      </Button>
    </div>
  </div>
);

const MockFinalSuccess = () => (
  <div className="space-y-4 text-center">
    <motion.div
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: "spring", stiffness: 200 }}
      className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-primary via-amber-500 to-orange-500 flex items-center justify-center"
    >
      <Star className="w-10 h-10 text-white fill-white" />
    </motion.div>
    
    <div>
      <h3 className="text-lg font-bold text-white">All Set!</h3>
      <p className="text-xs text-white/60 mt-1">Your venue is fully operational</p>
    </div>

    <div className="grid grid-cols-3 gap-2">
      {[
        { icon: BadgeCheck, label: "Verified" },
        { icon: Users, label: "Team Ready" },
        { icon: TrendingUp, label: "Analytics" }
      ].map((item, i) => (
        <motion.div
          key={item.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 + i * 0.1 }}
          className="bg-white/10 rounded-xl p-2"
        >
          <item.icon className="w-5 h-5 text-primary mx-auto mb-1" />
          <p className="text-[10px] text-white/70">{item.label}</p>
        </motion.div>
      ))}
    </div>

    <Button className="w-full bg-white text-primary font-bold text-sm">
      Open Dashboard
    </Button>
  </div>
);

// Render the correct mock UI for each step
const renderMockUI = (step: SimulationStep) => {
  switch (step.id) {
    case "welcome":
      return <MockWelcomeScreen />;
    case "register-brand":
      return <MockFormScreen fields={[
        { label: "Brand Name", placeholder: "The Grand Bar", icon: Building2 },
        { label: "Venue Type", placeholder: "Bar & Restaurant", icon: Star },
        { label: "Logo", placeholder: "Upload brand logo", icon: Upload }
      ]} />;
    case "add-outlets":
      return <MockFormScreen fields={[
        { label: "Outlet Name", placeholder: "Main Location", icon: MapPin },
        { label: "Address", placeholder: "123 High Street, London", icon: Building2 },
        { label: "Phone", placeholder: "+44 20 1234 5678", icon: Phone }
      ]} />;
    case "contact-info":
      return <MockFormScreen fields={[
        { label: "Business Email", placeholder: "admin@thegrandbar.com", icon: Mail },
        { label: "Landline", placeholder: "+44 20 1234 5678", icon: Phone },
        { label: "Website", placeholder: "www.thegrandbar.com", icon: Globe }
      ]} />;
    case "choose-verification":
      return <MockVerificationOptions />;
    case "verify-email":
      return <MockEmailVerification />;
    case "verification-complete":
      return <MockSuccessScreen 
        title="Verified!" 
        items={["Badge added to profile", "Staff can claim employment", "Dashboard unlocked"]} 
      />;
    case "dashboard-overview":
      return <MockDashboard />;
    case "manage-admins":
      return <MockFormScreen fields={[
        { label: "Admin Email", placeholder: "hr@thegrandbar.com", icon: Mail },
        { label: "Role", placeholder: "HR Administrator", icon: Shield },
        { label: "Outlet Access", placeholder: "All Outlets", icon: Building2 }
      ]} />;
    case "claims-inbox":
      return <MockClaimsInbox />;
    case "approve-claim":
      return <MockApprovalAction />;
    case "final-success":
      return <MockFinalSuccess />;
    default:
      return null;
  }
};

export const VenueVerificationPromoReel = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  
  const step = SIMULATION_STEPS[currentStep];
  const progress = ((currentStep + 1) / SIMULATION_STEPS.length) * 100;

  useEffect(() => {
    if (!isPlaying) return;
    
    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % SIMULATION_STEPS.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isPlaying]);

  const handlePrevStep = useCallback(() => {
    setCurrentStep((prev) => (prev - 1 + SIMULATION_STEPS.length) % SIMULATION_STEPS.length);
  }, []);

  const handleNextStep = useCallback(() => {
    setCurrentStep((prev) => (prev + 1) % SIMULATION_STEPS.length);
  }, []);

  return (
    <div className="relative w-full max-w-[340px] mx-auto">
      {/* Phone frame */}
      <div className="relative aspect-[9/16] rounded-[2.5rem] overflow-hidden border-4 border-border/50 shadow-2xl bg-black">
        {/* Animated background */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className={`absolute inset-0 bg-gradient-to-br ${step.gradient} opacity-30`}
          />
        </AnimatePresence>

        {/* Base dark overlay */}
        <div className="absolute inset-0 bg-black/60" />
        
        {/* Animated particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(10)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-white/30 rounded-full"
              initial={{ 
                x: Math.random() * 340, 
                y: 600,
                scale: Math.random() * 0.5 + 0.5
              }}
              animate={{ 
                y: -50,
                x: Math.random() * 340
              }}
              transition={{ 
                duration: 8 + Math.random() * 4,
                repeat: Infinity,
                delay: Math.random() * 5
              }}
            />
          ))}
        </div>

        {/* Content */}
        <div className="relative z-10 h-full flex flex-col p-4">
          {/* Header with progress */}
          <div className="space-y-2 mb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-md bg-gradient-to-br ${step.gradient} flex items-center justify-center`}>
                  <step.icon className="w-3 h-3 text-white" />
                </div>
                <div>
                  <span className="text-[10px] text-white/50 uppercase tracking-wider">{step.phase}</span>
                  <p className="text-xs font-medium text-white -mt-0.5">{step.title}</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-white/50">Step</span>
                <p className="text-xs font-bold text-white">{step.stepNumber}/{step.totalSteps}</p>
              </div>
            </div>
            
            {/* Progress bar */}
            <div className="h-1 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className={`h-full bg-gradient-to-r ${step.gradient}`}
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          {/* Main simulation content */}
          <div className="flex-1 flex flex-col">
            <AnimatePresence mode="wait">
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="flex-1 flex flex-col"
              >
                {/* Subtitle */}
                <p className="text-xs text-white/70 mb-3">{step.subtitle}</p>
                
                {/* Mock UI */}
                <div className="flex-1 overflow-hidden">
                  {renderMockUI(step)}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Bottom section */}
          <div className="space-y-3 mt-3">
            {/* Tips */}
            <div className="flex flex-wrap gap-1.5 justify-center">
              {step.tips.map((tip, idx) => (
                <motion.span
                  key={tip}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 + idx * 0.1 }}
                  className="text-[9px] px-2 py-1 bg-white/10 text-white/70 rounded-full"
                >
                  {tip}
                </motion.span>
              ))}
            </div>

            {/* CTA Button */}
            <Button
              onClick={() => navigate("/auth")}
              className="w-full py-4 bg-gradient-to-r from-primary to-amber-500 text-primary-foreground font-bold rounded-xl hover:opacity-90 transition-all"
            >
              Start Your Verification
            </Button>

            {/* Step indicators */}
            <div className="flex justify-center gap-1">
              {SIMULATION_STEPS.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentStep(idx)}
                  className={`h-1 rounded-full transition-all ${
                    idx === currentStep 
                      ? "w-6 bg-white" 
                      : idx < currentStep
                        ? "w-1.5 bg-primary"
                        : "w-1.5 bg-white/30 hover:bg-white/50"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Side controls */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-20">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white/70 hover:text-white hover:bg-black/80 transition-all"
          >
            {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
          </button>
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white/70 hover:text-white hover:bg-black/80 transition-all"
          >
            {isMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
          </button>
          <button
            onClick={handlePrevStep}
            className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white/70 hover:text-white hover:bg-black/80 transition-all"
          >
            <ChevronUp className="w-3 h-3" />
          </button>
          <button
            onClick={handleNextStep}
            className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white/70 hover:text-white hover:bg-black/80 transition-all"
          >
            <ChevronDown className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* How It Works section below reel */}
      <div className="mt-6 space-y-4">
        <h4 className="text-sm font-bold text-center text-white">How It Works</h4>
        
        <div className="grid grid-cols-3 gap-2">
          {[
            { step: "1", title: "Register", desc: "Add venue details", icon: Building2 },
            { step: "2", title: "Verify", desc: "Prove ownership", icon: Shield },
            { step: "3", title: "Manage", desc: "Build your team", icon: Users }
          ].map((item, i) => (
            <motion.div
              key={item.step}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="glass rounded-xl p-3 text-center"
            >
              <div className="w-8 h-8 mx-auto mb-2 rounded-lg bg-gradient-to-br from-primary/30 to-amber-500/30 flex items-center justify-center">
                <item.icon className="w-4 h-4 text-primary" />
              </div>
              <p className="text-xs font-bold text-white">{item.title}</p>
              <p className="text-[10px] text-muted-foreground">{item.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="glass rounded-xl p-2.5 text-center">
            <div className="text-lg font-bold text-gradient-primary">850+</div>
            <div className="text-[10px] text-muted-foreground">Venues</div>
          </div>
          <div className="glass rounded-xl p-2.5 text-center">
            <div className="text-lg font-bold text-gradient-gold">2.4K</div>
            <div className="text-[10px] text-muted-foreground">Verified</div>
          </div>
          <div className="glass rounded-xl p-2.5 text-center">
            <div className="text-lg font-bold text-white">100%</div>
            <div className="text-[10px] text-muted-foreground">Free</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VenueVerificationPromoReel;
