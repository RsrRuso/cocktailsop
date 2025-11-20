import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { TasteProfile } from "@/types/cocktail";

interface TasteProfileSlidersProps {
  profile: TasteProfile;
  onChange: (profile: TasteProfile) => void;
}

const TasteProfileSliders = ({ profile, onChange }: TasteProfileSlidersProps) => {
  const updateTaste = (key: keyof TasteProfile, value: number) => {
    onChange({ ...profile, [key]: value });
  };

  const tastes: { key: keyof TasteProfile; label: string; color: string }[] = [
    { key: "sweet", label: "Sweet", color: "text-pink-500" },
    { key: "sour", label: "Sour", color: "text-yellow-500" },
    { key: "bitter", label: "Bitter", color: "text-orange-500" },
    { key: "salty", label: "Salty", color: "text-blue-500" },
    { key: "umami", label: "Umami", color: "text-purple-500" },
  ];

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-4">Taste Profile</h2>
      <div className="space-y-6">
        {tastes.map(({ key, label, color }) => (
          <div key={key}>
            <div className="flex justify-between mb-2">
              <Label className={color}>{label}</Label>
              <span className="text-sm text-muted-foreground">{profile[key]}/10</span>
            </div>
            <Slider
              value={[profile[key]]}
              onValueChange={([value]) => updateTaste(key, value)}
              max={10}
              step={1}
              className="w-full"
            />
          </div>
        ))}
      </div>
    </Card>
  );
};

export default TasteProfileSliders;
