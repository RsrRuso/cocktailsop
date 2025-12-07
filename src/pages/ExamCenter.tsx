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
    <div className="min-h-screen bg-background pb-24">
      <TopNav />
      
      <div className="px-4 py-4 pt-16 sm:pt-20 max-w-2xl mx-auto">
        {/* Header - Mobile Optimized */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6"
        >
          <div className="flex items-center justify-center gap-2 mb-1">
            <GraduationCap className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
            <h1 className="text-2xl sm:text-3xl font-bold">Exams</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Test your knowledge & get certified
          </p>
          
          {/* Material Upload Button */}
          <div className="mt-3">
            <MaterialUploadDialog onQuestionsGenerated={refetchCategories} />
          </div>
        </motion.div>

        {/* Quick Stats - Mobile Optimized */}
        {user && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-3 gap-2 sm:gap-4 mb-6"
          >
            <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
              <CardContent className="p-3 text-center">
                <Trophy className="h-5 w-5 mx-auto mb-1 text-primary" />
                <p className="text-xl font-bold">{certificates?.length || 0}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Certs</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5">
              <CardContent className="p-3 text-center">
                <Star className="h-5 w-5 mx-auto mb-1 text-yellow-500" />
                <p className="text-xl font-bold">
                  {performance?.reduce((sum, p) => sum + (p.best_score || 0), 0) || 0}
                </p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Points</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5">
              <CardContent className="p-3 text-center">
                <CheckCircle className="h-5 w-5 mx-auto mb-1 text-green-500" />
                <p className="text-xl font-bold">{performance?.length || 0}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Done</p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Tabs - Mobile Optimized */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 h-10">
            <TabsTrigger value="categories" className="text-xs sm:text-sm">Exams</TabsTrigger>
            <TabsTrigger value="badges" className="text-xs sm:text-sm">Badges</TabsTrigger>
            <TabsTrigger value="certificates" className="text-xs sm:text-sm">My Certs</TabsTrigger>
          </TabsList>

          {/* Categories Tab - Mobile Optimized */}
          <TabsContent value="categories" className="space-y-3">
            {categories?.map((category, index) => {
              const Icon = getCategoryIcon(category.icon || 'cocktail');
              const userPerformance = performance?.find(p => p.category_id === category.id);
              
              return (
                <motion.div
                  key={category.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card 
                    className="hover:shadow-lg transition-shadow cursor-pointer active:scale-[0.98]"
                    onClick={() => navigate(`/exam/${category.id}`)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 sm:p-3 rounded-xl bg-primary/10 shrink-0">
                          <Icon className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <h3 className="text-base sm:text-lg font-semibold truncate">{category.name}</h3>
                            {userPerformance && (
                              <Badge variant="outline" className="text-[10px] sm:text-xs shrink-0">
                                {userPerformance.best_score}%
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 mb-2">
                            {category.description}
                          </p>
                          <div className="flex items-center gap-3 text-[10px] sm:text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <BookOpen className="h-3 w-3" />
                              Theory
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              30 min
                            </span>
                          </div>
                          {userPerformance && (
                            <div className="mt-2">
                              <Progress value={userPerformance.best_score || 0} className="h-1.5" />
                            </div>
                          )}
                        </div>
                        <Button size="sm" className="shrink-0 h-9 px-3">
                          <Play className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </TabsContent>

          {/* Badges Tab - Mobile Optimized */}
          <TabsContent value="badges" className="space-y-3">
            <div className="grid grid-cols-2 gap-2 sm:gap-4">
              {badgeLevels?.map((badge, index) => (
                <motion.div
                  key={badge.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="relative overflow-hidden">
                    <div className={`absolute top-0 left-0 w-full h-1 ${getBadgeColor(badge.name)}`} />
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex flex-col items-center text-center gap-2">
                        <div className={`p-2 sm:p-3 rounded-full ${getBadgeColor(badge.name)}`}>
                          <Award className="h-5 w-5 sm:h-6 sm:w-6" />
                        </div>
                        <div>
                          <h3 className="text-sm sm:text-base font-bold">{badge.name}</h3>
                          <p className="text-[10px] sm:text-xs text-muted-foreground">
                            {badge.min_score}% - {badge.max_score}%
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </TabsContent>

          {/* Certificates Tab - Mobile Optimized */}
          <TabsContent value="certificates" className="space-y-3">
            {!user ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <Lock className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Sign in to view certificates
                  </p>
                  <Button className="mt-3" size="sm" onClick={() => navigate('/auth')}>
                    Sign In
                  </Button>
                </CardContent>
              </Card>
            ) : certificates?.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <GraduationCap className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-3">
                    No certificates yet
                  </p>
                  <Button size="sm" onClick={() => setActiveTab('categories')}>
                    Take an Exam
                  </Button>
                </CardContent>
              </Card>
            ) : (
              certificates?.map((cert, index) => (
                <motion.div
                  key={cert.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="hover:shadow-lg transition-shadow active:scale-[0.98]">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full shrink-0 ${getBadgeColor(cert.exam_badge_levels?.name || '')}`}>
                          <Award className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm font-semibold truncate">{cert.exam_categories?.name}</h3>
                            <Badge className={`text-[10px] ${getBadgeColor(cert.exam_badge_levels?.name || '')}`}>
                              {cert.exam_badge_levels?.name}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {cert.score}% • {new Date(cert.issued_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="shrink-0 h-8 px-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/certificate/${cert.id}`);
                          }}
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

        {/* AI Study Assistant Promo - Mobile Optimized */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-6"
        >
          <Card className="bg-gradient-to-r from-primary/20 to-purple-500/20 border-primary/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/20 shrink-0">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold">MATRIX AI Assistant</h3>
                  <p className="text-xs text-muted-foreground truncate">
                    Study recommendations & help
                  </p>
                </div>
                <Button size="sm" className="shrink-0" onClick={() => navigate('/matrix-ai')}>
                  Open
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
