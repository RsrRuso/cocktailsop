import { useNavigate } from "react-router-dom";
import { useRef } from "react";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { Image, Video, Clock, Radio } from "lucide-react";

const Create = () => {
  const navigate = useNavigate();
  const reelInputRef = useRef<HTMLInputElement>(null);

  const handleReelFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      // Store selected files in sessionStorage to pass to CreateReel
      const fileData = Array.from(files).map(file => ({
        name: file.name,
        type: file.type,
        url: URL.createObjectURL(file)
      }));
      sessionStorage.setItem('reelMedia', JSON.stringify(fileData));
      navigate('/create/reel');
    }
  };

  const options = [
    {
      icon: Image,
      label: "Post",
      description: "Photo or text",
      action: () => navigate("/create/post"),
      gradient: "from-blue-500 to-purple-500"
    },
    {
      icon: Video,
      label: "Reel",
      description: "Short video",
      action: () => reelInputRef.current?.click(),
      gradient: "from-pink-500 to-red-500"
    },
    {
      icon: Clock,
      label: "Story",
      description: "24h content",
      action: () => navigate("/create/story"),
      gradient: "from-orange-500 to-yellow-500"
    },
    {
      icon: Radio,
      label: "Live",
      description: "Go live now",
      action: () => navigate("/live"),
      gradient: "from-red-500 to-pink-500"
    }
  ];

  return (
    <div className="min-h-screen bg-background pb-20 pt-16">
      <TopNav />

      <div className="px-6 py-8">
        <h1 className="text-xl font-semibold text-center mb-8">Create</h1>

        <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
          {options.map((option) => (
            <button
              key={option.label}
              onClick={option.action}
              className="flex flex-col items-center gap-3 p-5 rounded-2xl bg-card/50 hover:bg-card active:scale-95 transition-all"
            >
              <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${option.gradient} flex items-center justify-center shadow-lg`}>
                <option.icon className="w-6 h-6 text-white" />
              </div>
              <div className="text-center">
                <p className="font-medium text-sm">{option.label}</p>
                <p className="text-xs text-muted-foreground">{option.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Hidden file input for Reel */}
      <input
        ref={reelInputRef}
        type="file"
        accept="video/*,image/*"
        multiple
        className="hidden"
        onChange={handleReelFileSelect}
      />

      <BottomNav />
    </div>
  );
};

export default Create;
