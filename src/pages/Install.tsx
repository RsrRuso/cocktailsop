import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Smartphone, CheckCircle2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const Install = () => {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      toast.error("Installation not available", {
        description: "Please use your browser's menu to install this app"
      });
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      toast.success("App installed!", {
        description: "You can now access CocktailSOP from your home screen"
      });
      setIsInstalled(true);
    }

    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <Card className="border-2">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-32 h-32 rounded-3xl bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center shadow-2xl">
              <img src="/icon-512.png" alt="CocktailSOP" className="w-28 h-28 rounded-2xl" />
            </div>
            <div>
              <CardTitle className="text-3xl">Install CocktailSOP</CardTitle>
              <CardDescription className="text-base mt-2">
                Get instant access from your home screen
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {isInstalled ? (
              <div className="text-center space-y-4 py-6">
                <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
                <div>
                  <h3 className="text-xl font-semibold mb-2">Already Installed!</h3>
                  <p className="text-muted-foreground">
                    CocktailSOP is already installed on your device
                  </p>
                </div>
                <Button onClick={() => navigate('/home')} size="lg" className="w-full">
                  Open App
                </Button>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Why Install?</h3>
                  <div className="grid gap-3">
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                      <Smartphone className="w-5 h-5 text-primary mt-0.5" />
                      <div>
                        <p className="font-medium">Works Like a Native App</p>
                        <p className="text-sm text-muted-foreground">
                          Launch from your home screen, no browser needed
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                      <CheckCircle2 className="w-5 h-5 text-primary mt-0.5" />
                      <div>
                        <p className="font-medium">Works Offline</p>
                        <p className="text-sm text-muted-foreground">
                          Access your data even without internet connection
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                      <Download className="w-5 h-5 text-primary mt-0.5" />
                      <div>
                        <p className="font-medium">Fast & Lightweight</p>
                        <p className="text-sm text-muted-foreground">
                          Optimized performance with instant loading
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {isInstallable ? (
                  <Button
                    onClick={handleInstallClick}
                    size="lg"
                    className="w-full"
                  >
                    <Download className="w-5 h-5 mr-2" />
                    Install Now
                  </Button>
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg bg-muted/50 border">
                      <p className="font-medium mb-2">How to Install:</p>
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <p className="flex items-start gap-2">
                          <span className="font-bold">iOS (Safari):</span>
                          Tap Share button → "Add to Home Screen"
                        </p>
                        <p className="flex items-start gap-2">
                          <span className="font-bold">Android (Chrome):</span>
                          Tap menu (⋮) → "Install App" or "Add to Home Screen"
                        </p>
                        <p className="flex items-start gap-2">
                          <span className="font-bold">Desktop:</span>
                          Look for install icon (⊕) in address bar
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Install;
