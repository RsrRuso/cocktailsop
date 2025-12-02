import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Zap, Workflow, ExternalLink, ArrowRight } from "lucide-react";

interface AutomationGettingStartedProps {
  onCreateWebhook: () => void;
}

export const AutomationGettingStarted = ({ onCreateWebhook }: AutomationGettingStartedProps) => {
  return (
    <Card className="p-6 border-2 border-dashed">
      <div className="max-w-2xl mx-auto text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
            <Zap className="w-10 h-10 text-primary" />
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-2">Welcome to Automation Hub</h2>
          <p className="text-muted-foreground">
            Connect your favorite tools and automate your workflows in 3 simple steps
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4 text-left">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
              1
            </div>
            <h3 className="font-semibold">Create a Zap</h3>
            <p className="text-sm text-muted-foreground">
              Go to Zapier and create a new Zap with a "Webhooks by Zapier" trigger
            </p>
            <Button 
              variant="link" 
              className="p-0 h-auto"
              onClick={() => window.open('https://zapier.com/app/editor', '_blank')}
            >
              Open Zapier <ExternalLink className="w-3 h-3 ml-1" />
            </Button>
          </div>

          <div className="space-y-2">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
              2
            </div>
            <h3 className="font-semibold">Add Webhook</h3>
            <p className="text-sm text-muted-foreground">
              Copy your Zapier webhook URL and paste it here
            </p>
            <Button 
              variant="link" 
              className="p-0 h-auto"
              onClick={onCreateWebhook}
            >
              Create Webhook <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </div>

          <div className="space-y-2">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
              3
            </div>
            <h3 className="font-semibold">Set Trigger</h3>
            <p className="text-sm text-muted-foreground">
              Choose what events should trigger your automation
            </p>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Workflow className="w-3 h-3" />
              <span>Configure after webhook</span>
            </div>
          </div>
        </div>

        <div className="pt-4">
          <Button onClick={onCreateWebhook} size="lg" className="gap-2">
            <Zap className="w-5 h-5" />
            Get Started
          </Button>
        </div>

        <div className="pt-4 border-t">
          <p className="text-xs text-muted-foreground mb-2">Popular automation ideas:</p>
          <div className="flex flex-wrap gap-2 justify-center">
            <span className="text-xs bg-muted px-3 py-1 rounded-full">
              📧 New follower → Send email
            </span>
            <span className="text-xs bg-muted px-3 py-1 rounded-full">
              💬 New message → Slack notification
            </span>
            <span className="text-xs bg-muted px-3 py-1 rounded-full">
              📝 New post → Tweet it
            </span>
            <span className="text-xs bg-muted px-3 py-1 rounded-full">
              🎵 Music share → Spotify playlist
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
};