import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Shield, TrendingUp, Users, Briefcase, Bell } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";

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
      <div className="absolute inset-0 bg-gradient-to-br from-background via-blue-950/20 to-background pointer-events-none" />
      
      {/* Glow effects - pointer-events-none to prevent blocking interactions */}
      <div className="absolute top-20 left-10 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse pointer-events-none" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse pointer-events-none" style={{ animationDelay: '1s' }} />

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-primary to-blue-600 glow-primary" />
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
              className="glass glow-primary border-primary/30 hover:border-primary/50 text-sm sm:text-base px-3 sm:px-4"
            >
              Get Started
            </Button>
          </div>
        </header>

        {/* Hero Section */}
        <main className="flex-1 flex items-center justify-center px-6 py-12">
          <div className="max-w-5xl w-full space-y-8 text-center">
            {/* Founder info - hidden visually, accessible for screen readers & SEO */}
            <span className="sr-only">Founded by Ruslani Melkoniani (Russo_str), CEO & Founder of SpecVerse and creator of CocktailSOP.com</span>

            {/* Verified Badge */}
            <div className="inline-flex items-center gap-2 glass px-6 py-3 rounded-full glow-primary">
              <Shield className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium">Verified Professional Network</span>
            </div>

            {/* Main Heading */}
            <div className="space-y-3 sm:space-y-4">
              <h1 className="text-4xl sm:text-6xl md:text-8xl font-bold text-gradient-primary tracking-tight">
                SpecVerse
              </h1>
              <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold text-white">
                Capital & Career
                <br />
                Ecosystem
              </h2>
            </div>

            {/* Description */}
            <p className="text-base sm:text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed px-4">
              The first proof-of-work platform connecting verified hospitality professionals 
              with investors, opportunities, and recognition.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 pt-6 sm:pt-8 px-4">
              <Button
                size="lg"
                onClick={() => navigate("/auth")}
                className="glass glow-primary border-primary/30 hover:border-primary/50 w-full sm:w-auto px-6 sm:px-8 py-5 sm:py-6 text-base sm:text-lg"
              >
                Join the Network
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate("/introduction")}
                className="glass hover:border-accent/50 w-full sm:w-auto px-6 sm:px-8 py-5 sm:py-6 text-base sm:text-lg"
              >
                Learn More
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6 pt-8 sm:pt-16 px-4">
              <div className="glass rounded-xl sm:rounded-2xl p-4 sm:p-6 space-y-1 sm:space-y-2 glow-primary">
                <div className="text-2xl sm:text-4xl font-bold text-gradient-gold">$2M+</div>
                <div className="text-xs sm:text-sm text-muted-foreground">Total Investment</div>
              </div>
              <div className="glass rounded-xl sm:rounded-2xl p-4 sm:p-6 space-y-1 sm:space-y-2">
                <div className="text-2xl sm:text-4xl font-bold text-gradient-primary">2.4K</div>
                <div className="text-xs sm:text-sm text-muted-foreground">Professionals</div>
              </div>
              <div className="glass rounded-xl sm:rounded-2xl p-4 sm:p-6 space-y-1 sm:space-y-2">
                <div className="text-2xl sm:text-4xl font-bold text-white">100%</div>
                <div className="text-xs sm:text-sm text-muted-foreground">Verified</div>
              </div>
              <div className="glass rounded-xl sm:rounded-2xl p-4 sm:p-6 space-y-1 sm:space-y-2 glow-gold">
                <div className="text-2xl sm:text-4xl font-bold text-gradient-gold">850+</div>
                <div className="text-xs sm:text-sm text-muted-foreground">Opportunities</div>
              </div>
            </div>

            {/* Features */}
            <div className="grid md:grid-cols-3 gap-4 sm:gap-6 pt-8 sm:pt-12 px-4">
              <div className="glass rounded-xl sm:rounded-2xl p-4 sm:p-6 text-left space-y-2 sm:space-y-3 glass-hover">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/20 flex items-center justify-center glow-primary">
                  <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold">Career Growth</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Track your professional journey and showcase your achievements
                </p>
              </div>

              <div className="glass rounded-xl sm:rounded-2xl p-4 sm:p-6 text-left space-y-2 sm:space-y-3 glass-hover">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-accent/20 flex items-center justify-center glow-accent">
                  <Users className="w-5 h-5 sm:w-6 sm:h-6 text-accent" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold">Network Effect</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Connect with verified professionals and industry leaders
                </p>
              </div>

              <div className="glass rounded-xl sm:rounded-2xl p-4 sm:p-6 text-left space-y-2 sm:space-y-3 glass-hover">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center glow-gold">
                  <Briefcase className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-500" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold">Smart Tools</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Access professional tools for batch calculations and recipes
                </p>
              </div>
            </div>
          </div>
        </main>

        {/* Footer with Founder Credit */}
        <footer className="px-6 py-8 text-center space-y-2">
          <p className="text-[10px] text-muted-foreground/40">CEO & Founder: Ruslani Melkoniani</p>
          <p className="text-sm text-muted-foreground">© 2024 SpecVerse. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
};

export default Landing;
