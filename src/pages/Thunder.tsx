import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { MessageCircle } from "lucide-react";

const Thunder = () => {
  return (
    <div className="min-h-screen bg-background pb-20 pt-16">
      <TopNav />

      <div className="px-4 py-6">
        <div className="glass rounded-2xl p-8 text-center space-y-4">
          <div className="mx-auto w-20 h-20 rounded-full glass-hover flex items-center justify-center glow-accent">
            <MessageCircle className="w-10 h-10 text-accent" />
          </div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Thunder Messenger
          </h2>
          <p className="text-muted-foreground">
            Connect with beverage professionals instantly
          </p>
          <p className="text-sm text-muted-foreground">
            Start conversations coming soon
          </p>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Thunder;
