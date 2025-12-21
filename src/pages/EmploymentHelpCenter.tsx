import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowLeft, Briefcase, Building2, CheckCircle2, Clock, FileText,
  HelpCircle, Image, Shield, Upload, Users, XCircle, Sparkles,
  AlertTriangle, Search, UserCheck, Award, ArrowRight
} from "lucide-react";
import { motion } from "framer-motion";

const EmploymentHelpCenter = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("staff");

  const staffSteps = [
    {
      step: 1,
      title: "Find Your Venue",
      description: "Search for the venue where you work or worked. Only verified venues appear in search results.",
      icon: Search,
      tips: [
        "Search by venue name or brand name",
        "Only verified venues can receive claims",
        "If you can't find your venue, ask the venue owner to register"
      ]
    },
    {
      step: 2,
      title: "Fill Employment Details",
      description: "Provide accurate information about your position, dates, and department.",
      icon: Briefcase,
      tips: [
        "Enter your exact job title",
        "Select the correct outlet if applicable",
        "Be accurate with start/end dates",
        "Add a reference for faster approval"
      ]
    },
    {
      step: 3,
      title: "Upload Proof Documents",
      description: "Add supporting documents to speed up the verification process.",
      icon: Upload,
      tips: [
        "Photos of ID badges or uniforms",
        "Employment contracts or offer letters",
        "Pay stubs or payroll records",
        "Photos with colleagues (optional)"
      ]
    },
    {
      step: 4,
      title: "Wait for Verification",
      description: "The venue admin will review your claim and approve or request more info.",
      icon: Clock,
      tips: [
        "Most claims are reviewed within 48 hours",
        "You'll be notified when approved or rejected",
        "Rejected claims can be resubmitted with more proof"
      ]
    }
  ];

  const venueSteps = [
    {
      step: 1,
      title: "Register Your Venue",
      description: "Create a business account and verify your venue ownership.",
      icon: Building2,
      tips: [
        "Provide accurate business details",
        "Complete the verification process",
        "Add all your outlet locations"
      ]
    },
    {
      step: 2,
      title: "Review Incoming Claims",
      description: "Check the Claims inbox in your venue dashboard regularly.",
      icon: FileText,
      tips: [
        "Claims appear in the 'Pending' tab",
        "Review proof documents carefully",
        "Cross-check with your records"
      ]
    },
    {
      step: 3,
      title: "Approve or Reject",
      description: "Verify the claim and take appropriate action.",
      icon: CheckCircle2,
      tips: [
        "Approve claims from genuine employees",
        "Provide a reason when rejecting",
        "Contact reference if needed"
      ]
    },
    {
      step: 4,
      title: "Build Verified Network",
      description: "Verified staff build your venue's credibility and network.",
      icon: Users,
      tips: [
        "Verified staff can showcase their experience",
        "Builds trust in the hospitality community",
        "Creates professional connections"
      ]
    }
  ];

  const faqs = [
    {
      question: "What proof documents are accepted?",
      answer: "We accept ID badges, employment contracts, offer letters, pay stubs, uniform photos, photos with colleagues in work setting, and any official documentation from the venue."
    },
    {
      question: "How long does verification take?",
      answer: "Most claims are reviewed within 24-48 hours. Adding proof documents significantly speeds up the process. Some venues may take longer during busy periods."
    },
    {
      question: "What if my claim is rejected?",
      answer: "You'll receive a notification with the rejection reason. You can submit a new claim with additional proof documents or correct any errors in your original submission."
    },
    {
      question: "Can I claim employment at multiple venues?",
      answer: "Yes! You can claim current or past employment at any verified venue. Each claim is reviewed independently by the respective venue admin."
    },
    {
      question: "What if my venue isn't registered?",
      answer: "Ask the venue owner or manager to register their venue on SpecVerse. Once they complete verification, you can submit your employment claim."
    },
    {
      question: "Is my employment data private?",
      answer: "Yes. Only verified venue admins can see claims for their venues. Your profile can display verified work history, but you control what's publicly visible."
    },
    {
      question: "How do I become a venue admin?",
      answer: "Venue owners can add admins through the Admin Management section of their venue dashboard. Only existing admins can add new ones."
    },
    {
      question: "What benefits do verified staff get?",
      answer: "Verified employment appears on your profile with a badge, builds professional credibility, helps with networking, and may unlock exclusive features."
    }
  ];

  const bestPracticesStaff = [
    {
      title: "Be Accurate",
      description: "Provide exact dates and job titles as they appear in official records",
      icon: CheckCircle2
    },
    {
      title: "Upload Clear Documents",
      description: "Ensure photos and scans are legible and show relevant information",
      icon: Image
    },
    {
      title: "Add References",
      description: "Including a manager reference speeds up verification",
      icon: UserCheck
    },
    {
      title: "Be Patient",
      description: "Venue admins review claims when available - allow 48 hours",
      icon: Clock
    }
  ];

  const bestPracticesVenue = [
    {
      title: "Review Promptly",
      description: "Check your claims inbox regularly to keep staff waiting times low",
      icon: Clock
    },
    {
      title: "Verify Thoroughly",
      description: "Cross-check claims against your payroll or HR records",
      icon: Shield
    },
    {
      title: "Be Fair",
      description: "Provide clear rejection reasons to help claimants correct issues",
      icon: AlertTriangle
    },
    {
      title: "Keep Records",
      description: "Maintain accurate employee records for faster verification",
      icon: FileText
    }
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="flex items-center justify-between p-4 max-w-4xl mx-auto">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">Employment Verification</h1>
              <p className="text-sm text-muted-foreground">Help Center & Guidelines</p>
            </div>
          </div>
          <Badge variant="outline" className="gap-1">
            <HelpCircle className="w-3 h-3" />
            Help
          </Badge>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center shrink-0">
                  <Award className="w-8 h-8 text-primary" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold">Build Your Verified Career</h2>
                  <p className="text-muted-foreground">
                    The Employment Verification System helps hospitality professionals showcase verified 
                    work history and helps venues manage staff claims efficiently.
                  </p>
                  <div className="flex gap-2 pt-2">
                    <Button onClick={() => navigate("/claim-employment")}>
                      <Briefcase className="w-4 h-4 mr-2" />
                      Claim Employment
                    </Button>
                    <Button variant="outline" onClick={() => navigate("/venue-register")}>
                      <Building2 className="w-4 h-4 mr-2" />
                      Register Venue
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Role Selection Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-2 mb-6">
            <TabsTrigger value="staff" className="gap-2">
              <Briefcase className="w-4 h-4" />
              For Staff
            </TabsTrigger>
            <TabsTrigger value="venue" className="gap-2">
              <Building2 className="w-4 h-4" />
              For Venues
            </TabsTrigger>
          </TabsList>

          {/* Staff Guide */}
          <TabsContent value="staff" className="space-y-6">
            {/* Steps */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  How to Claim Employment
                </CardTitle>
                <CardDescription>
                  Follow these steps to get your work history verified
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {staffSteps.map((item, index) => (
                  <motion.div
                    key={item.step}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex gap-4 p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors"
                  >
                    <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                      <item.icon className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">Step {item.step}</Badge>
                        <h3 className="font-semibold">{item.title}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                      <ul className="text-xs text-muted-foreground space-y-1 mt-2">
                        {item.tips.map((tip, i) => (
                          <li key={i} className="flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-green-500" />
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </motion.div>
                ))}
              </CardContent>
            </Card>

            {/* Best Practices */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Best Practices for Staff</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {bestPracticesStaff.map((practice, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-4 rounded-xl bg-secondary/30"
                    >
                      <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center shrink-0">
                        <practice.icon className="w-5 h-5 text-green-500" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{practice.title}</p>
                        <p className="text-xs text-muted-foreground">{practice.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Status Explanation */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Understanding Claim Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <Clock className="w-5 h-5 text-amber-500" />
                  <div>
                    <p className="font-medium text-sm">Pending</p>
                    <p className="text-xs text-muted-foreground">Your claim is awaiting review by the venue admin</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <div>
                    <p className="font-medium text-sm">Verified</p>
                    <p className="text-xs text-muted-foreground">Your employment has been confirmed and will appear on your profile</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <XCircle className="w-5 h-5 text-red-500" />
                  <div>
                    <p className="font-medium text-sm">Rejected</p>
                    <p className="text-xs text-muted-foreground">The venue could not verify your claim. Check the reason and resubmit if needed</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Venue Guide */}
          <TabsContent value="venue" className="space-y-6">
            {/* Steps */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  Managing Employment Claims
                </CardTitle>
                <CardDescription>
                  How to handle staff verification requests
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {venueSteps.map((item, index) => (
                  <motion.div
                    key={item.step}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex gap-4 p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors"
                  >
                    <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                      <item.icon className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">Step {item.step}</Badge>
                        <h3 className="font-semibold">{item.title}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                      <ul className="text-xs text-muted-foreground space-y-1 mt-2">
                        {item.tips.map((tip, i) => (
                          <li key={i} className="flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-green-500" />
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </motion.div>
                ))}
              </CardContent>
            </Card>

            {/* Best Practices */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Best Practices for Venues</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {bestPracticesVenue.map((practice, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-4 rounded-xl bg-secondary/30"
                    >
                      <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                        <practice.icon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{practice.title}</p>
                        <p className="text-xs text-muted-foreground">{practice.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Admin Responsibilities */}
            <Card className="border-amber-500/20 bg-amber-500/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-500">
                  <AlertTriangle className="w-5 h-5" />
                  Admin Responsibilities
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p>As a venue admin, you are responsible for:</p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                    <span>Accurately verifying employment claims against your records</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                    <span>Reviewing claims in a timely manner (within 48 hours recommended)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                    <span>Providing clear, honest reasons when rejecting claims</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                    <span>Not approving false claims or rejecting legitimate ones</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* FAQs */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-primary" />
              Frequently Asked Questions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, index) => (
                <AccordionItem key={index} value={`faq-${index}`}>
                  <AccordionTrigger className="text-left">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
          <Button
            variant="outline"
            className="h-auto p-4 flex-col gap-2"
            onClick={() => navigate("/claim-employment")}
          >
            <Briefcase className="w-6 h-6 text-primary" />
            <span>Claim Employment</span>
          </Button>
          <Button
            variant="outline"
            className="h-auto p-4 flex-col gap-2"
            onClick={() => navigate("/venue-register")}
          >
            <Building2 className="w-6 h-6 text-primary" />
            <span>Register Venue</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EmploymentHelpCenter;
