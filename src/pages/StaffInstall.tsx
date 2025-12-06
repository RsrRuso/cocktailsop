import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { 
  Smartphone, Download, ChefHat, Wine, 
  CheckCircle, ArrowRight, Share, Plus
} from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function StaffInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    // Detect device type
    const userAgent = navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));
    setIsAndroid(/android/.test(userAgent));

    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      toast({
        title: "Installation not available",
        description: "Follow the manual steps below to install",
        variant: "destructive",
      });
      return;
    }

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === "accepted") {
      toast({ title: "App installed successfully!" });
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  const openStaffPOS = () => {
    window.location.href = "/staff-pos";
  };

  if (isInstalled) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
            <CardTitle className="text-2xl">App Installed!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              The Staff POS is ready to use. Open the app from your home screen.
            </p>
            <Button onClick={openStaffPOS} size="lg" className="w-full gap-2">
              <Wine className="w-5 h-5" />
              Open Staff POS
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground py-8 px-4 text-center">
        <div className="flex justify-center gap-3 mb-4">
          <div className="w-12 h-12 bg-primary-foreground/20 rounded-xl flex items-center justify-center">
            <Wine className="w-6 h-6" />
          </div>
          <div className="w-12 h-12 bg-primary-foreground/20 rounded-xl flex items-center justify-center">
            <ChefHat className="w-6 h-6" />
          </div>
        </div>
        <h1 className="text-2xl font-bold mb-2">Staff POS App</h1>
        <p className="text-primary-foreground/80">Install for quick access to your station</p>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-4 -mt-4">
        {/* Quick Install Card */}
        <Card className="border-2 border-primary">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-primary" />
              Install App
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isInstallable ? (
              <Button onClick={handleInstallClick} size="lg" className="w-full gap-2">
                <Download className="w-5 h-5" />
                Install Now
              </Button>
            ) : (
              <div className="space-y-3">
                {isIOS && (
                  <div className="space-y-3 text-sm">
                    <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                        <Share className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">Step 1</p>
                        <p className="text-muted-foreground">Tap the Share button at the bottom of Safari</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                        <Plus className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">Step 2</p>
                        <p className="text-muted-foreground">Scroll down and tap "Add to Home Screen"</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                        <CheckCircle className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">Step 3</p>
                        <p className="text-muted-foreground">Tap "Add" to install the app</p>
                      </div>
                    </div>
                  </div>
                )}
                {isAndroid && (
                  <div className="space-y-3 text-sm">
                    <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold">⋮</span>
                      </div>
                      <div>
                        <p className="font-medium">Step 1</p>
                        <p className="text-muted-foreground">Tap the menu (⋮) in Chrome</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                        <Download className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">Step 2</p>
                        <p className="text-muted-foreground">Tap "Install app" or "Add to Home screen"</p>
                      </div>
                    </div>
                  </div>
                )}
                {!isIOS && !isAndroid && (
                  <p className="text-sm text-muted-foreground text-center">
                    Use your browser menu to install this app
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Benefits Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Why Install?</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-3">
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span>One-tap access from home screen</span>
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span>Full-screen experience, no browser UI</span>
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span>Works offline for faster loading</span>
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span>Push notifications for orders</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Quick Access Button */}
        <Button 
          variant="outline" 
          onClick={openStaffPOS} 
          size="lg" 
          className="w-full gap-2"
        >
          Continue to Staff POS
          <ArrowRight className="w-4 h-4" />
        </Button>

        {/* How it works */}
        <Card className="bg-muted/50">
          <CardContent className="pt-4">
            <h3 className="font-medium mb-3">How it works:</h3>
            <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
              <li>Install app to your phone's home screen</li>
              <li>Open the app and select your outlet</li>
              <li>Enter your 4-digit PIN to log in</li>
              <li>Start taking orders or view KDS!</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
