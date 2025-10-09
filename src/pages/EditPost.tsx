import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";
import TopNav from "@/components/TopNav";

const EditPost = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    fetchPost();
  }, [id]);

  const fetchPost = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error || !data) {
      toast.error("Post not found or you don't have permission");
      navigate("/home");
      return;
    }

    setContent(data.content || "");
    setFetching(false);
  };

  const handleSave = async () => {
    if (!content.trim()) {
      toast.error("Post content cannot be empty");
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from("posts")
      .update({
        content: content,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      toast.error("Failed to update post");
    } else {
      toast.success("Post updated successfully!");
      navigate("/home");
    }
    setLoading(false);
  };

  if (fetching) {
    return (
      <div className="min-h-screen bg-background pb-20 pt-16">
        <TopNav />
        <div className="flex items-center justify-center h-[50vh]">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 pt-16">
      <TopNav />

      <div className="px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/home")}
            className="glass-hover"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">Edit Post</h1>
          <div className="w-10" />
        </div>

        <div className="glass rounded-2xl p-6 space-y-6">
          <Textarea
            placeholder="What's on your mind?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="glass border-primary/20 min-h-[200px] text-lg resize-none"
          />

          <Button
            onClick={handleSave}
            disabled={loading || !content.trim()}
            className="w-full glow-primary h-12"
          >
            <Save className="w-5 h-5 mr-2" />
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EditPost;
