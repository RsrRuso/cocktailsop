import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Smartphone, Monitor, CheckCircle2, Apple, Chrome } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const InstallApp = () => {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    // Detect platform
    const userAgent = navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));
    setIsAndroid(/android/.test(userAgent));

    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo/Brand */}
        <div className="text-center space-y-2">
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-primary to-primary/70 rounded-2xl flex items-center justify-center shadow-lg">
            <span className="text-3xl font-bold text-primary-foreground">SV</span>
          </div>
          <h1 className="text-2xl font-bold">Install SpecVerse</h1>
          <p className="text-muted-foreground text-sm">
            Get quick access from your home screen
          </p>
        </div>

        {/* Already Installed */}
        {isInstalled && (
          <Card className="border-green-500/30 bg-green-500/10">
            <CardContent className="pt-6 text-center">
              <CheckCircle2 className="w-12 h-12 mx-auto text-green-500 mb-3" />
              <p className="font-medium text-green-600">App Already Installed!</p>
              <p className="text-sm text-muted-foreground mt-1">
                Open SV from your home screen
              </p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => navigate("/")}
              >
                Continue to App
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Install Button (Android/Desktop with prompt) */}
        {!isInstalled && deferredPrompt && (
          <Card className="border-primary/30">
            <CardContent className="pt-6">
              <Button 
                className="w-full h-14 text-lg gap-3" 
                onClick={handleInstall}
              >
                <Download className="w-6 h-6" />
                Install App
              </Button>
              <p className="text-xs text-muted-foreground text-center mt-3">
                Installs instantly • No app store needed
              </p>
            </CardContent>
          </Card>
        )}

        {/* iOS Instructions */}
        {!isInstalled && isIOS && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Apple className="w-5 h-5" />
                Install on iPhone/iPad
              </CardTitle>
              <CardDescription>Follow these steps</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-primary">1</span>
                </div>
                <div>
                  <p className="font-medium">Tap the Share button</p>
                  <p className="text-sm text-muted-foreground">
                    Located at the bottom of Safari (square with arrow)
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-primary">2</span>
                </div>
                <div>
                  <p className="font-medium">Scroll & tap "Add to Home Screen"</p>
                  <p className="text-sm text-muted-foreground">
                    May need to scroll down in the share menu
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-primary">3</span>
                </div>
                <div>
                  <p className="font-medium">Tap "Add"</p>
                  <p className="text-sm text-muted-foreground">
                    App will appear on your home screen
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Android Manual Instructions */}
        {!isInstalled && isAndroid && !deferredPrompt && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Chrome className="w-5 h-5" />
                Install on Android
              </CardTitle>
              <CardDescription>Follow these steps</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-primary">1</span>
                </div>
                <div>
                  <p className="font-medium">Tap the menu button</p>
                  <p className="text-sm text-muted-foreground">
                    Three dots (⋮) in the top right of Chrome
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-primary">2</span>
                </div>
                <div>
                  <p className="font-medium">Tap "Add to Home Screen" or "Install app"</p>
                  <p className="text-sm text-muted-foreground">
                    Option varies by browser version
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-primary">3</span>
                </div>
                <div>
                  <p className="font-medium">Confirm by tapping "Add"</p>
                  <p className="text-sm text-muted-foreground">
                    App will be added to your home screen
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Desktop Instructions */}
        {!isInstalled && !isIOS && !isAndroid && !deferredPrompt && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Monitor className="w-5 h-5" />
                Install on Desktop
              </CardTitle>
              <CardDescription>Add to your computer</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-primary">1</span>
                </div>
                <div>
                  <p className="font-medium">Look for the install icon</p>
                  <p className="text-sm text-muted-foreground">
                    In the address bar (right side) or browser menu
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-primary">2</span>
                </div>
                <div>
                  <p className="font-medium">Click "Install"</p>
                  <p className="text-sm text-muted-foreground">
                    App will open in its own window
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Benefits */}
        <Card className="bg-muted/30">
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="space-y-1">
                <Smartphone className="w-6 h-6 mx-auto text-primary" />
                <p className="text-xs font-medium">Works Offline</p>
              </div>
              <div className="space-y-1">
                <Download className="w-6 h-6 mx-auto text-primary" />
                <p className="text-xs font-medium">Quick Access</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Skip */}
        <Button 
          variant="ghost" 
          className="w-full text-muted-foreground"
          onClick={() => navigate("/")}
        >
          Continue without installing
        </Button>
      </div>
    </div>
  );
};

export default InstallApp;
