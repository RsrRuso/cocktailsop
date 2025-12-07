import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  GraduationCap, 
  Trophy, 
  Clock, 
  Star, 
  Play,
  Award,
  BookOpen,
  Video,
  CheckCircle,
  Lock,
  Sparkles,
  Upload
} from "lucide-react";
import MaterialUploadDialog from "@/components/exam/MaterialUploadDialog";

const ExamCenter = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("categories");

  const { data: categories, refetch: refetchCategories } = useQuery({
    queryKey: ['exam-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exam_categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data;
    }
  });

  const { data: badgeLevels } = useQuery({
    queryKey: ['exam-badge-levels'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exam_badge_levels')
        .select('*')
        .order('min_score');
      if (error) throw error;
      return data;
    }
  });

  const { data: performance } = useQuery({
    queryKey: ['exam-performance', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('exam_performance')
        .select('*, exam_categories(*)')
        .eq('user_id', user.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  const { data: certificates } = useQuery({
    queryKey: ['exam-certificates', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('exam_certificates')
        .select('*, exam_categories(*), exam_badge_levels(*)')
        .eq('user_id', user.id)
        .order('issued_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  const getCategoryIcon = (iconName: string) => {
    const icons: Record<string, any> = {
      'cocktail': GraduationCap,
      'wine': Trophy,
      'spirits': Star,
      'beer': BookOpen,
      'service': Award
    };
    return icons[iconName] || GraduationCap;
  };

  const getBadgeColor = (level: string) => {
    const colors: Record<string, string> = {
      'Bronze': 'bg-amber-700 text-white',
      'Silver': 'bg-slate-400 text-white',
      'Gold': 'bg-yellow-500 text-black',
      'Platinum': 'bg-gradient-to-r from-slate-300 to-slate-500 text-white',
      'Diamond': 'bg-gradient-to-r from-cyan-400 to-blue-500 text-white'
    };
    return colors[level] || 'bg-muted';
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <TopNav />
      
      <div className="container max-w-4xl mx-auto px-4 py-6 pt-20">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center gap-3 mb-2">
            <GraduationCap className="h-10 w-10 text-primary" />
            <h1 className="text-3xl font-bold">SpecVerse Exams</h1>
          </div>
          <p className="text-muted-foreground">
            Test your knowledge, earn badges, and get certified
          </p>
          
          {/* Material Upload Button */}
          <div className="mt-4">
            <MaterialUploadDialog onQuestionsGenerated={refetchCategories} />
          </div>
        </motion.div>

        {/* Quick Stats */}
        {user && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-3 gap-4 mb-8"
          >
            <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
              <CardContent className="p-4 text-center">
                <Trophy className="h-6 w-6 mx-auto mb-2 text-primary" />
                <p className="text-2xl font-bold">{certificates?.length || 0}</p>
                <p className="text-xs text-muted-foreground">Certificates</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5">
              <CardContent className="p-4 text-center">
                <Star className="h-6 w-6 mx-auto mb-2 text-yellow-500" />
                <p className="text-2xl font-bold">
                  {performance?.reduce((sum, p) => sum + (p.best_score || 0), 0) || 0}
                </p>
                <p className="text-xs text-muted-foreground">Total Points</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5">
              <CardContent className="p-4 text-center">
                <CheckCircle className="h-6 w-6 mx-auto mb-2 text-green-500" />
                <p className="text-2xl font-bold">{performance?.length || 0}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="badges">Badges</TabsTrigger>
            <TabsTrigger value="certificates">My Certs</TabsTrigger>
          </TabsList>

          {/* Categories Tab */}
          <TabsContent value="categories" className="space-y-4">
            {categories?.map((category, index) => {
              const Icon = getCategoryIcon(category.icon || 'cocktail');
              const userPerformance = performance?.find(p => p.category_id === category.id);
              
              return (
                <motion.div
                  key={category.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => navigate(`/exam/${category.id}`)}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="p-3 rounded-xl bg-primary/10">
                          <Icon className="h-8 w-8 text-primary" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-lg font-semibold">{category.name}</h3>
                            {userPerformance && (
                              <Badge variant="outline" className="text-xs">
                                Best: {userPerformance.best_score}%
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">
                            {category.description}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <BookOpen className="h-3 w-3" />
                              Theory
                            </span>
                            <span className="flex items-center gap-1">
                              <Video className="h-3 w-3" />
                              Practical
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              30 min
                            </span>
                          </div>
                          {userPerformance && (
                            <div className="mt-3">
                              <Progress value={userPerformance.best_score || 0} className="h-2" />
                            </div>
                          )}
                        </div>
                        <Button size="sm" className="shrink-0">
                          <Play className="h-4 w-4 mr-1" />
                          Start
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </TabsContent>

          {/* Badges Tab */}
          <TabsContent value="badges" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {badgeLevels?.map((badge, index) => (
                <motion.div
                  key={badge.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="relative overflow-hidden">
                    <div className={`absolute top-0 left-0 w-full h-1 ${getBadgeColor(badge.name)}`} />
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <div className={`p-4 rounded-full ${getBadgeColor(badge.name)}`}>
                          <Award className="h-8 w-8" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold">{badge.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            Score {badge.min_score}% - {badge.max_score}%
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </TabsContent>

          {/* Certificates Tab */}
          <TabsContent value="certificates" className="space-y-4">
            {!user ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Lock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    Sign in to view your certificates
                  </p>
                  <Button className="mt-4" onClick={() => navigate('/auth')}>
                    Sign In
                  </Button>
                </CardContent>
              </Card>
            ) : certificates?.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <GraduationCap className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-4">
                    No certificates yet. Complete exams to earn certificates!
                  </p>
                  <Button onClick={() => setActiveTab('categories')}>
                    Browse Exams
                  </Button>
                </CardContent>
              </Card>
            ) : (
              certificates?.map((cert, index) => (
                <motion.div
                  key={cert.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-full ${getBadgeColor(cert.exam_badge_levels?.name || '')}`}>
                          <Award className="h-6 w-6" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{cert.exam_categories?.name}</h3>
                            <Badge className={getBadgeColor(cert.exam_badge_levels?.name || '')}>
                              {cert.exam_badge_levels?.name}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Score: {cert.score}% • {new Date(cert.issued_at).toLocaleDateString()}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Certificate #{cert.certificate_number}
                          </p>
                        </div>
                        <Button variant="outline" size="sm"
                          onClick={() => navigate(`/certificate/${cert.id}`)}
                        >
                          View
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </TabsContent>
        </Tabs>

        {/* AI Study Assistant Promo */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-8"
        >
          <Card className="bg-gradient-to-r from-primary/20 to-purple-500/20 border-primary/30">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-primary/20">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">MATRIX AI Study Assistant</h3>
                  <p className="text-sm text-muted-foreground">
                    Get personalized study recommendations and instant answers
                  </p>
                </div>
                <Button onClick={() => navigate('/matrix-ai')}>
                  Open MATRIX
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <BottomNav />
    </div>
  );
};

export default ExamCenter;
