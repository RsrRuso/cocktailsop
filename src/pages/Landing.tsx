import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Shield, TrendingUp, Users, Briefcase, Bell, Gift, Check, Star } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import PromoVideoReel from "@/components/landing/PromoVideoReel";
import { motion } from "framer-motion";

const Landing = () => {
  const navigate = useNavigate();
  const { showNotification } = usePushNotifications();

  const handleTestNotification = async () => {
    await showNotification(
      "Test Notification",
      "This is a test notification with sound! 🔔",
      {
        icon: "/icon-192.png",
        requireInteraction: false,
        silent: false
      }
    );
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-primary/10 to-background pointer-events-none" />
      
      {/* Glow effects */}
      <div className="absolute top-20 left-10 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse pointer-events-none" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse pointer-events-none" style={{ animationDelay: '1s' }} />

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-primary to-accent glow-primary" />
            <span className="text-xl sm:text-2xl font-bold text-gradient-primary">SpecVerse</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleTestNotification}
              className="text-foreground hover:text-primary"
              title="Test Notification"
            >
              <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
            <Button
              variant="ghost"
              onClick={() => navigate("/auth")}
              className="text-foreground hover:text-primary text-sm sm:text-base hidden sm:inline-flex"
            >
              Sign In
            </Button>
            <Button
              onClick={() => navigate("/auth")}
              className="glass glow-primary border-primary/30 hover:border-primary/50 text-sm sm:text-base px-3 sm:px-4 text-white"
            >
              Get Started
            </Button>
          </div>
        </header>

        {/* Hero Section with Promo Reel */}
        <main className="flex-1 px-4 sm:px-6 py-8">
          <div className="max-w-7xl mx-auto">
            {/* Top section with badge and headline */}
            <div className="text-center mb-8">
              {/* Founder info - hidden visually, accessible for screen readers & SEO */}
              <span className="sr-only">Founded by Ruslani Melkoniani (Russo_str), CEO & Founder of SpecVerse and creator of CocktailSOP.com</span>

              {/* FREE Banner */}
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 px-6 py-3 rounded-full mb-6"
              >
                <Gift className="w-5 h-5 text-green-400" />
                <span className="text-sm font-bold text-green-400">100% FREE • No Hidden Fees • No Credit Card</span>
              </motion.div>

              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-3xl sm:text-5xl md:text-6xl font-bold text-gradient-primary tracking-tight mb-3"
              >
                SpecVerse
              </motion.h1>
              <motion.h2 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-xl sm:text-2xl md:text-3xl font-semibold text-white mb-4"
              >
                Your Career. Your Network. Your Future.
              </motion.h2>
            </div>

            {/* Main content grid */}
            <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
              {/* Left side - Promo Video Reel */}
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="flex justify-center lg:justify-end order-1 lg:order-1"
              >
                <PromoVideoReel />
              </motion.div>

              {/* Right side - Benefits & CTA */}
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="space-y-6 order-2 lg:order-2"
              >
                {/* Why Join Section */}
                <div className="glass rounded-2xl p-6 space-y-4">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Star className="w-5 h-5 text-yellow-400" />
                    Why Join SpecVerse?
                  </h3>
                  
                  <div className="space-y-3">
                    {[
                      { icon: Shield, text: "Get verified and stand out to employers", color: "text-primary" },
                      { icon: Users, text: "Connect with 2,400+ verified professionals", color: "text-accent" },
                      { icon: Briefcase, text: "Access 850+ job opportunities", color: "text-green-400" },
                      { icon: TrendingUp, text: "20+ free professional tools", color: "text-purple-400" },
                      { icon: Gift, text: "Everything is FREE. No tricks.", color: "text-emerald-400" },
                    ].map((item, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 + idx * 0.1 }}
                        className="flex items-center gap-3"
                      >
                        <div className={`w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center`}>
                          <item.icon className={`w-4 h-4 ${item.color}`} />
                        </div>
                        <span className="text-sm text-white/90">{item.text}</span>
                        <Check className="w-4 h-4 text-green-400 ml-auto" />
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="glass rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-gradient-gold">$2M+</div>
                    <div className="text-xs text-muted-foreground">Invested</div>
                  </div>
                  <div className="glass rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-gradient-primary">2.4K</div>
                    <div className="text-xs text-muted-foreground">Members</div>
                  </div>
                  <div className="glass rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-white">100%</div>
                    <div className="text-xs text-muted-foreground">Free</div>
                  </div>
                </div>

                {/* CTA Buttons */}
                <div className="flex flex-col gap-3">
                  <Button
                    size="lg"
                    onClick={() => navigate("/auth")}
                    className="w-full py-6 bg-gradient-to-r from-primary to-accent text-white font-bold text-lg rounded-xl hover:opacity-90 transition-all shadow-xl glow-primary"
                  >
                    Join Free Now
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => navigate("/introduction")}
                    className="w-full py-5 glass hover:border-accent/50 text-white"
                  >
                    Learn More
                  </Button>
                </div>

                {/* Trust badges */}
                <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Check className="w-3 h-3 text-green-400" />
                    No Credit Card
                  </span>
                  <span className="flex items-center gap-1">
                    <Check className="w-3 h-3 text-green-400" />
                    No Subscription
                  </span>
                  <span className="flex items-center gap-1">
                    <Check className="w-3 h-3 text-green-400" />
                    Free Forever
                  </span>
                </div>
              </motion.div>
            </div>

            {/* Features Grid - Below the fold */}
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="grid md:grid-cols-3 gap-4 mt-12"
            >
              <div className="glass rounded-2xl p-6 text-left space-y-3 glass-hover">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center glow-primary">
                  <TrendingUp className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-white">Career Growth</h3>
                <p className="text-sm text-muted-foreground">
                  Track your professional journey and showcase your achievements
                </p>
              </div>

              <div className="glass rounded-2xl p-6 text-left space-y-3 glass-hover">
                <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center glow-accent">
                  <Users className="w-6 h-6 text-accent" />
                </div>
                <h3 className="text-xl font-semibold text-white">Network Effect</h3>
                <p className="text-sm text-muted-foreground">
                  Connect with verified professionals and industry leaders
                </p>
              </div>

              <div className="glass rounded-2xl p-6 text-left space-y-3 glass-hover">
                <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center glow-gold">
                  <Briefcase className="w-6 h-6 text-yellow-500" />
                </div>
                <h3 className="text-xl font-semibold text-white">Smart Tools</h3>
                <p className="text-sm text-muted-foreground">
                  Access 20+ professional tools for free - batch calculators, recipes & more
                </p>
              </div>
            </motion.div>
          </div>
        </main>

        {/* Footer with Founder Credit */}
        <footer className="px-6 py-8 text-center space-y-2">
          <p className="text-[10px] text-muted-foreground/40">CEO & Founder: Ruslani Melkoniani</p>
          <p className="text-sm text-muted-foreground">© 2025 SpecVerse. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
};

export default Landing;
