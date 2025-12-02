import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Heart, TrendingUp, Camera, Coffee, PartyPopper, Briefcase, Music } from "lucide-react";
import { cn } from "@/lib/utils";

interface Template {
  id: string;
  name: string;
  icon: any;
  gradient: string;
  textColor: string;
  layout: "center" | "top" | "bottom" | "corner";
  effect: string;
}

const templates: Template[] = [
  {
    id: "minimal",
    name: "Minimal",
    icon: Sparkles,
    gradient: "from-slate-900 to-slate-700",
    textColor: "#FFFFFF",
    layout: "center",
    effect: "Clean and simple"
  },
  {
    id: "vibrant",
    name: "Vibrant",
    icon: Heart,
    gradient: "from-pink-500 via-purple-500 to-blue-500",
    textColor: "#FFFFFF",
    layout: "bottom",
    effect: "Bold and colorful"
  },
  {
    id: "trending",
    name: "Trending",
    icon: TrendingUp,
    gradient: "from-orange-500 to-red-500",
    textColor: "#FFFFFF",
    layout: "top",
    effect: "Hot and viral"
  },
  {
    id: "aesthetic",
    name: "Aesthetic",
    icon: Camera,
    gradient: "from-rose-300 via-pink-200 to-purple-200",
    textColor: "#1F2937",
    layout: "corner",
    effect: "Soft and dreamy"
  },
  {
    id: "chill",
    name: "Chill Vibes",
    icon: Coffee,
    gradient: "from-amber-700 to-orange-900",
    textColor: "#FFFFFF",
    layout: "center",
    effect: "Relaxed mood"
  },
  {
    id: "party",
    name: "Party",
    icon: PartyPopper,
    gradient: "from-yellow-400 via-red-500 to-purple-600",
    textColor: "#FFFFFF",
    layout: "bottom",
    effect: "High energy"
  },
  {
    id: "professional",
    name: "Professional",
    icon: Briefcase,
    gradient: "from-slate-800 to-blue-900",
    textColor: "#FFFFFF",
    layout: "top",
    effect: "Business style"
  },
  {
    id: "music",
    name: "Music Mode",
    icon: Music,
    gradient: "from-indigo-500 via-purple-500 to-pink-500",
    textColor: "#FFFFFF",
    layout: "bottom",
    effect: "Music focused"
  },
];

interface StoryTemplatesProps {
  onSelectTemplate: (template: Template) => void;
}

export const StoryTemplates = ({ onSelectTemplate }: StoryTemplatesProps) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="text-center space-y-2">
        <h3 className="text-lg font-bold">Choose a Style</h3>
        <p className="text-sm text-muted-foreground">
          AI-powered templates to make your story stand out
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {templates.map((template) => {
          const Icon = template.icon;
          return (
            <motion.div
              key={template.id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Card
                className={cn(
                  "cursor-pointer transition-all overflow-hidden border-2",
                  selectedId === template.id
                    ? "border-primary shadow-lg"
                    : "border-transparent hover:border-primary/50"
                )}
                onClick={() => {
                  setSelectedId(template.id);
                  onSelectTemplate(template);
                }}
              >
                <CardContent className="p-0">
                  <div
                    className={cn(
                      "h-24 bg-gradient-to-br flex items-center justify-center relative",
                      template.gradient
                    )}
                  >
                    <Icon className="w-8 h-8" style={{ color: template.textColor }} />
                    {selectedId === template.id && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute top-2 right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center"
                      >
                        <Sparkles className="w-4 h-4 text-white" />
                      </motion.div>
                    )}
                  </div>
                  <div className="p-3">
                    <div className="font-semibold text-sm mb-1">{template.name}</div>
                    <div className="text-xs text-muted-foreground">{template.effect}</div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {selectedId && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center text-sm text-muted-foreground"
        >
          ✨ Template applied! Continue editing or share your story.
        </motion.div>
      )}
    </div>
  );
};
