import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { 
  Target, TrendingUp, Award, Calendar, MapPin, Briefcase, 
  Sparkles, Clock, CheckCircle2, XCircle, BookOpen, Trophy
} from "lucide-react";
import { motion } from "framer-motion";

export const MatrixCareerTab = () => {
  const [loading, setLoading] = useState(false);
  const [careerProfile, setCareerProfile] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [skills, setSkills] = useState<any[]>([]);
  const [analysis, setAnalysis] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  // Form state for career profile
  const [formData, setFormData] = useState({
    role_title: "",
    experience_years: 0,
    career_goals: [] as string[],
    target_positions: [] as string[],
    skills: [] as string[],
    interests: [] as string[],
    preferred_locations: [] as string[]
  });

  useEffect(() => {
    loadCareerData();
  }, []);

  const loadCareerData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load career profile
      const { data: profile } = await supabase
        .from("career_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profile) {
        setCareerProfile(profile);
        setFormData({
          role_title: profile.role_title || "",
          experience_years: profile.experience_years || 0,
          career_goals: profile.career_goals || [],
          target_positions: profile.target_positions || [],
          skills: profile.skills || [],
          interests: profile.interests || [],
          preferred_locations: profile.preferred_locations || []
        });
      }

      // Load recommendations
      const { data: recs } = await supabase
        .from("career_recommendations")
        .select("*")
        .eq("user_id", user.id)
        .order("priority", { ascending: false })
        .limit(10);

      setRecommendations(recs || []);

      // Load skills
      const { data: skillsData } = await supabase
        .from("skill_progress")
        .select("*")
        .eq("user_id", user.id);

      setSkills(skillsData || []);
    } catch (error) {
      console.error("Error loading career data:", error);
    }
  };

  const saveCareerProfile = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("career_profiles")
        .upsert({
          user_id: user.id,
          ...formData
        });

      if (error) throw error;

      toast.success("Career profile updated!");
      setIsEditing(false);
      loadCareerData();
    } catch (error) {
      console.error("Error saving profile:", error);
      toast.error("Failed to save profile");
    } finally {
      setLoading(false);
    }
  };

  const analyzeCareer = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke("career-ai-mentor", {
        body: { action: "analyze_career" }
      });

      if (error) throw error;
      setAnalysis(data.result);
      toast.success("Career analysis complete!");
    } catch (error) {
      console.error("Error analyzing career:", error);
      toast.error("Failed to analyze career");
    } finally {
      setLoading(false);
    }
  };

  const generateRecommendations = async () => {
    try {
      setLoading(true);
      console.log("Generating recommendations with profile:", careerProfile);
      
      const { data, error } = await supabase.functions.invoke("career-ai-mentor", {
        body: { action: "generate_recommendations" }
      });

      console.log("Generate recommendations response:", { data, error });

      if (error) throw error;
      
      toast.success("New recommendations generated!");
      await loadCareerData();
    } catch (error) {
      console.error("Error generating recommendations:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate recommendations");
    } finally {
      setLoading(false);
    }
  };

  const updateRecommendationStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from("career_recommendations")
        .update({ status })
        .eq("id", id);

      if (error) throw error;
      loadCareerData();
      toast.success(`Recommendation ${status}!`);
    } catch (error) {
      console.error("Error updating recommendation:", error);
      toast.error("Failed to update");
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "competition": return <Trophy className="w-4 h-4" />;
      case "job": return <Briefcase className="w-4 h-4" />;
      case "event": return <Calendar className="w-4 h-4" />;
      case "course": return <BookOpen className="w-4 h-4" />;
      case "skill": return <Target className="w-4 h-4" />;
      default: return <Sparkles className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "competition": return "bg-yellow-500/20 text-yellow-300 border-yellow-500/30";
      case "job": return "bg-blue-500/20 text-blue-300 border-blue-500/30";
      case "event": return "bg-purple-500/20 text-purple-300 border-purple-500/30";
      case "course": return "bg-green-500/20 text-green-300 border-green-500/30";
      case "skill": return "bg-pink-500/20 text-pink-300 border-pink-500/30";
      default: return "bg-gray-500/20 text-gray-300 border-gray-500/30";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6 p-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Target className="w-6 h-6 text-primary" />
            AI Career Intelligence
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Advanced AI-powered career strategy and predictive analytics
          </p>
        </div>
        <Button 
          onClick={analyzeCareer} 
          disabled={loading || !careerProfile}
          className="gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
        >
          <Sparkles className="w-4 h-4" />
          AI Deep Analysis
        </Button>
      </div>

      {/* Smart Features Badge */}
      {careerProfile && (
        <div className="flex gap-2 mb-4">
          <Badge variant="secondary" className="gap-1">
            <Sparkles className="w-3 h-3" />
            Predictive Analytics
          </Badge>
          <Badge variant="secondary" className="gap-1">
            <TrendingUp className="w-3 h-3" />
            Market Intelligence
          </Badge>
          <Badge variant="secondary" className="gap-1">
            <Target className="w-3 h-3" />
            Smart Matching
          </Badge>
        </div>
      )}

      {/* Career Profile Section */}
      <Card className="p-6 bg-gradient-to-br from-card via-card to-primary/5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-primary" />
            Career Profile
            {careerProfile && <Badge variant="secondary" className="ml-2">AI-Enhanced</Badge>}
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
          >
            {isEditing ? "Cancel" : "Edit"}
          </Button>
        </div>

        {isEditing ? (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Current Role</label>
              <Input
                value={formData.role_title}
                onChange={(e) => setFormData({ ...formData, role_title: e.target.value })}
                placeholder="e.g., Senior Bartender"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Years of Experience</label>
              <Input
                type="number"
                value={formData.experience_years}
                onChange={(e) => setFormData({ ...formData, experience_years: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Career Goals (comma-separated)</label>
              <Textarea
                value={formData.career_goals.join(", ")}
                onChange={(e) => setFormData({ ...formData, career_goals: e.target.value.split(",").map(s => s.trim()) })}
                placeholder="e.g., Become Head Bartender, Open own bar"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Skills (comma-separated)</label>
              <Textarea
                value={formData.skills.join(", ")}
                onChange={(e) => setFormData({ ...formData, skills: e.target.value.split(",").map(s => s.trim()) })}
                placeholder="e.g., Mixology, Flair Bartending, Customer Service"
              />
            </div>
            <Button onClick={saveCareerProfile} disabled={loading} className="w-full">
              Save Profile
            </Button>
          </div>
        ) : careerProfile ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-primary" />
              <span className="font-medium">{careerProfile.role_title || "Not specified"}</span>
              <Badge variant="secondary">{careerProfile.experience_years || 0} years</Badge>
            </div>
            {careerProfile.career_goals?.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Career Goals:</p>
                <div className="flex flex-wrap gap-2">
                  {careerProfile.career_goals.map((goal: string, i: number) => (
                    <Badge key={i} variant="outline">{goal}</Badge>
                  ))}
                </div>
              </div>
            )}
            {careerProfile.skills?.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Skills:</p>
                <div className="flex flex-wrap gap-2">
                  {careerProfile.skills.map((skill: string, i: number) => (
                    <Badge key={i} className="bg-primary/20">{skill}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-muted-foreground">No career profile yet. Click Edit to create one.</p>
        )}
      </Card>

      {/* Analysis Results */}
      {analysis && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="p-6 bg-gradient-to-br from-primary/5 to-purple-500/5 border-primary/20">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              AI Career Analysis
            </h3>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              {analysis.split("\n").map((paragraph, i) => (
                <p key={i} className="text-sm leading-relaxed">{paragraph}</p>
              ))}
            </div>
          </Card>
        </motion.div>
      )}

      {/* Recommendations */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              AI-Powered Career Opportunities
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Intelligent recommendations based on your profile and market trends
            </p>
          </div>
          <Button
            onClick={generateRecommendations}
            disabled={loading || !careerProfile}
            className="gap-2"
          >
            <Sparkles className="w-4 h-4" />
            Generate Smart Recs
          </Button>
        </div>

        <div className="grid gap-4">
          {recommendations.filter(r => r.status === "pending").map((rec) => (
            <motion.div
              key={rec.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <Card className="p-4 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={getTypeColor(rec.recommendation_type)}>
                        {getTypeIcon(rec.recommendation_type)}
                        <span className="ml-1">{rec.recommendation_type}</span>
                      </Badge>
                      <Badge variant="outline" className="ml-auto">
                        Priority: {rec.priority}/10
                      </Badge>
                    </div>
                    <h4 className="font-semibold text-base mb-2">{rec.title}</h4>
                    <p className="text-sm text-muted-foreground mb-3">{rec.description}</p>
                    {rec.ai_reasoning && (
                      <div className="bg-muted/50 rounded-lg p-3 mb-3">
                        <p className="text-xs text-muted-foreground italic">
                          <Sparkles className="w-3 h-3 inline mr-1" />
                          {rec.ai_reasoning}
                        </p>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => updateRecommendationStatus(rec.id, "accepted")}
                      >
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => updateRecommendationStatus(rec.id, "dismissed")}
                      >
                        <XCircle className="w-3 h-3 mr-1" />
                        Dismiss
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
          {recommendations.filter(r => r.status === "pending").length === 0 && (
            <Card className="p-8 text-center">
              <Target className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground">
                No active recommendations. Click "Generate New" to get personalized career suggestions!
              </p>
            </Card>
          )}
        </div>
      </div>

      {/* Skills Progress */}
      {skills.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Target className="w-5 h-5" />
            Skill Progress
          </h3>
          <div className="space-y-4">
            {skills.map((skill) => (
              <div key={skill.id}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{skill.skill_name}</span>
                  <span className="text-xs text-muted-foreground">
                    {skill.current_level}/{skill.target_level}
                  </span>
                </div>
                <Progress value={(skill.current_level / skill.target_level) * 100} />
              </div>
            ))}
          </div>
        </Card>
      )}
    </motion.div>
  );
};