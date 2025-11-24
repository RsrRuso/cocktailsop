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
      <div className="absolute inset-0 bg-gradient-to-br from-background via-blue-950/20 to-background" />
      
      {/* Glow effects */}
      <div className="absolute top-20 left-10 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-blue-600 glow-primary" />
            <span className="text-2xl font-bold text-gradient-primary">SpecVerse</span>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleTestNotification}
              className="text-foreground hover:text-primary"
              title="Test Notification"
            >
              <Bell className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              onClick={() => navigate("/auth")}
              className="text-foreground hover:text-primary"
            >
              Sign In
            </Button>
            <Button
              onClick={() => navigate("/auth")}
              className="glass glow-primary border-primary/30 hover:border-primary/50"
            >
              Get Started
            </Button>
          </div>
        </header>

        {/* Hero Section */}
        <main className="flex-1 flex items-center justify-center px-6 py-12">
          <div className="max-w-5xl w-full space-y-8 text-center">
            {/* Verified Badge */}
            <div className="inline-flex items-center gap-2 glass px-6 py-3 rounded-full glow-primary">
              <Shield className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium">Verified Professional Network</span>
            </div>

            {/* Main Heading */}
            <div className="space-y-4">
              <h1 className="text-6xl md:text-8xl font-bold text-gradient-primary tracking-tight">
                SpecVerse
              </h1>
              <h2 className="text-4xl md:text-5xl font-bold text-white">
                Capital & Career
                <br />
                Ecosystem
              </h2>
            </div>

            {/* Description */}
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              The first proof-of-work platform connecting verified hospitality professionals 
              with investors, opportunities, and recognition.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
              <Button
                size="lg"
                onClick={() => navigate("/auth")}
                className="glass glow-primary border-primary/30 hover:border-primary/50 px-8 py-6 text-lg"
              >
                Join the Network
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="glass hover:border-accent/50 px-8 py-6 text-lg"
              >
                Learn More
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-16">
              <div className="glass rounded-2xl p-6 space-y-2 glow-primary">
                <div className="text-4xl font-bold text-gradient-gold">$2M+</div>
                <div className="text-sm text-muted-foreground">Total Investment</div>
              </div>
              <div className="glass rounded-2xl p-6 space-y-2">
                <div className="text-4xl font-bold text-gradient-primary">2.4K</div>
                <div className="text-sm text-muted-foreground">Professionals</div>
              </div>
              <div className="glass rounded-2xl p-6 space-y-2">
                <div className="text-4xl font-bold text-white">100%</div>
                <div className="text-sm text-muted-foreground">Verified</div>
              </div>
              <div className="glass rounded-2xl p-6 space-y-2 glow-gold">
                <div className="text-4xl font-bold text-gradient-gold">850+</div>
                <div className="text-sm text-muted-foreground">Opportunities</div>
              </div>
            </div>

            {/* Features */}
            <div className="grid md:grid-cols-3 gap-6 pt-12">
              <div className="glass rounded-2xl p-6 text-left space-y-3 glass-hover">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center glow-primary">
                  <TrendingUp className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">Career Growth</h3>
                <p className="text-sm text-muted-foreground">
                  Track your professional journey and showcase your achievements
                </p>
              </div>

              <div className="glass rounded-2xl p-6 text-left space-y-3 glass-hover">
                <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center glow-accent">
                  <Users className="w-6 h-6 text-accent" />
                </div>
                <h3 className="text-xl font-semibold">Network Effect</h3>
                <p className="text-sm text-muted-foreground">
                  Connect with verified professionals and industry leaders
                </p>
              </div>

              <div className="glass rounded-2xl p-6 text-left space-y-3 glass-hover">
                <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center glow-gold">
                  <Briefcase className="w-6 h-6 text-yellow-500" />
                </div>
                <h3 className="text-xl font-semibold">Smart Tools</h3>
                <p className="text-sm text-muted-foreground">
                  Access professional tools for batch calculations and recipes
                </p>
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="px-6 py-6 text-center text-sm text-muted-foreground">
          <p>© 2024 SpecVerse. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
};

export default Landing;
