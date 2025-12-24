import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, CheckCircle, Sparkles, FileText, Calculator, Palette, Download, BookOpen } from "lucide-react";
import { motion } from "framer-motion";
import CocktailSOPPromoVideo from "@/components/promo/CocktailSOPPromoVideo";

const CocktailSOPPromo = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: FileText,
      title: "Complete Recipe Builder",
      description: "Document every detail - drink name, glassware, ice type, mixing technique, and garnish specifications.",
      color: "from-blue-500 to-cyan-500",
    },
    {
      icon: Calculator,
      title: "Smart ABV Calculator",
      description: "Automatic alcohol by volume calculations based on your ingredient list. Includes calorie estimation.",
      color: "from-amber-500 to-orange-500",
    },
    {
      icon: Palette,
      title: "Taste & Texture Profiles",
      description: "Visual radar charts for sweet, sour, bitter, salty, umami profiles. Plus texture analysis.",
      color: "from-purple-500 to-pink-500",
    },
    {
      icon: Download,
      title: "Professional PDF Export",
      description: "Generate beautiful, print-ready PDF documentation with all specifications and visual charts.",
      color: "from-green-500 to-emerald-500",
    },
    {
      icon: BookOpen,
      title: "Recipe Library",
      description: "Save your creations to a personal library. Access and edit them anytime, anywhere.",
      color: "from-red-500 to-rose-500",
    },
    {
      icon: Sparkles,
      title: "AI-Powered Suggestions",
      description: "Get intelligent recommendations for ingredients, techniques, and flavor balancing.",
      color: "from-indigo-500 to-violet-500",
    },
  ];

  const steps = [
    { step: 1, title: "Create Recipe", description: "Enter drink details, glass type, and technique" },
    { step: 2, title: "Add Ingredients", description: "List each ingredient with amounts and ABV" },
    { step: 3, title: "Set Profiles", description: "Define taste and texture characteristics" },
    { step: 4, title: "Review Metrics", description: "Auto-calculated ABV, volume, and calories" },
    { step: 5, title: "Export PDF", description: "Download professional documentation" },
  ];

  const benefits = [
    "Standardize recipes across your entire bar team",
    "Train new staff with consistent documentation",
    "Calculate costs and pricing with precision",
    "Maintain quality control with detailed SOPs",
    "Share recipes professionally with clients",
    "Build a comprehensive cocktail database",
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur border-b px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="font-semibold">Cocktail SOP</h1>
      </header>

      <main className="container max-w-6xl mx-auto px-4 py-6 pb-24 space-y-12">
        {/* Hero Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4"
        >
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium">
            <Sparkles className="h-4 w-4" />
            Professional Documentation Tool
          </div>
          <h1 className="text-4xl md:text-5xl font-bold">
            Cocktail <span className="text-primary">SOP Builder</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Create professional Standard Operating Procedures for your cocktails. 
            Document recipes, calculate metrics, and export beautiful PDFs.
          </p>
          <div className="flex flex-wrap justify-center gap-4 pt-4">
            <Button size="lg" onClick={() => navigate("/cocktail-sop")} className="gap-2">
              <FileText className="h-5 w-5" />
              Start Creating
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/sop-library")} className="gap-2">
              <BookOpen className="h-5 w-5" />
              View Library
            </Button>
          </div>
        </motion.section>

        {/* Video Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <CocktailSOPPromoVideo />
        </motion.section>

        {/* How It Works */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-6"
        >
          <h2 className="text-2xl font-bold text-center">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {steps.map((step, index) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
              >
                <Card className="p-4 h-full relative overflow-hidden group hover:border-primary/50 transition-colors">
                  <div className="absolute -top-4 -right-4 text-6xl font-bold text-primary/5 group-hover:text-primary/10 transition-colors">
                    {step.step}
                  </div>
                  <div className="relative z-10">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm mb-3">
                      {step.step}
                    </div>
                    <h3 className="font-semibold mb-1">{step.title}</h3>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Features Grid */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-6"
        >
          <h2 className="text-2xl font-bold text-center">Powerful Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 + index * 0.1 }}
              >
                <Card className="p-6 h-full hover:shadow-lg hover:shadow-primary/5 transition-all group">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <feature.icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* PDF Preview Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="space-y-6"
        >
          <h2 className="text-2xl font-bold text-center">Professional PDF Output</h2>
          <Card className="p-8 bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              {/* PDF Mockup */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent rounded-xl blur-xl" />
                <div className="relative bg-white rounded-lg shadow-2xl p-6 max-w-sm mx-auto">
                  <div className="bg-gradient-to-r from-slate-800 to-slate-900 -m-6 mb-4 p-4 rounded-t-lg">
                    <h4 className="text-white font-bold">Espresso Martini</h4>
                    <p className="text-white/70 text-sm">Coupe • Shake & Double Strain</p>
                  </div>
                  <div className="space-y-4 text-sm">
                    <div>
                      <p className="font-semibold text-slate-800 mb-2">INGREDIENTS</p>
                      <ul className="space-y-1 text-slate-600">
                        <li className="flex justify-between">
                          <span>Vodka</span><span>50ml</span>
                        </li>
                        <li className="flex justify-between">
                          <span>Kahlúa</span><span>30ml</span>
                        </li>
                        <li className="flex justify-between">
                          <span>Fresh Espresso</span><span>30ml</span>
                        </li>
                        <li className="flex justify-between">
                          <span>Sugar Syrup</span><span>10ml</span>
                        </li>
                      </ul>
                    </div>
                    <div className="flex justify-between bg-slate-100 -mx-6 px-6 py-3">
                      <div className="text-center">
                        <p className="font-bold text-primary">120ml</p>
                        <p className="text-xs text-slate-500">Volume</p>
                      </div>
                      <div className="text-center">
                        <p className="font-bold text-primary">22.5%</p>
                        <p className="text-xs text-slate-500">ABV</p>
                      </div>
                      <div className="text-center">
                        <p className="font-bold text-primary">185</p>
                        <p className="text-xs text-slate-500">Kcal</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Benefits List */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold">Why Document Your Recipes?</h3>
                <ul className="space-y-3">
                  {benefits.map((benefit, index) => (
                    <motion.li
                      key={index}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.7 + index * 0.05 }}
                      className="flex items-start gap-3"
                    >
                      <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{benefit}</span>
                    </motion.li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>
        </motion.section>

        {/* CTA Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="text-center space-y-6 py-8"
        >
          <h2 className="text-3xl font-bold">Ready to Create Professional SOPs?</h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Start documenting your cocktails with precision. Free to use, no signup required.
          </p>
          <Button size="lg" onClick={() => navigate("/cocktail-sop")} className="gap-2">
            <Sparkles className="h-5 w-5" />
            Create Your First SOP
          </Button>
        </motion.section>
      </main>
    </div>
  );
};

export default CocktailSOPPromo;
