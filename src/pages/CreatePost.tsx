import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Send, Image } from "lucide-react";
import { toast } from "sonner";
import TopNav from "@/components/TopNav";

const CreatePost = () => {
  const navigate = useNavigate();
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  const handlePost = async () => {
    if (!content.trim()) {
      toast.error("Please write something");
      return;
    }

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { error } = await supabase
      .from("posts")
      .insert({
        user_id: user.id,
        content: content,
      });

    if (error) {
      toast.error("Failed to create post");
    } else {
      toast.success("Post created successfully!");
      navigate("/home");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background pb-20 pt-16">
      <TopNav />

      <div className="px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/create")}
            className="glass-hover"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">Create Post</h1>
          <div className="w-10" />
        </div>

        <div className="glass rounded-2xl p-6 space-y-6">
          <Textarea
            placeholder="What's on your mind?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="glass border-primary/20 min-h-[200px] text-lg resize-none"
          />

          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              className="glass-hover flex-1"
              onClick={() => toast.info("Photo upload coming soon!")}
            >
              <Image className="w-5 h-5 mr-2" />
              Add Photo
            </Button>
          </div>

          <Button
            onClick={handlePost}
            disabled={loading || !content.trim()}
            className="w-full glow-primary h-12"
          >
            <Send className="w-5 h-5 mr-2" />
            {loading ? "Posting..." : "Post"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CreatePost;
