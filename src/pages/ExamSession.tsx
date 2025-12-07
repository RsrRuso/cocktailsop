import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle,
  XCircle,
  AlertTriangle,
  Play,
  Pause,
  RotateCcw,
  Send,
  BookOpen,
  Video,
  HelpCircle,
  Award
} from "lucide-react";

interface Question {
  id: string;
  question_text: string;
  question_type: 'multiple_choice' | 'true_false' | 'multiple_select' | 'short_answer' | 'video_practical';
  options: string[] | null;
  correct_answer: any;
  points: number;
  video_url: string | null;
  image_url: string | null;
  explanation: string | null;
  time_limit_seconds: number | null;
}

interface Answer {
  questionId: string;
  answer: any;
  isCorrect?: boolean;
  timeTaken?: number;
}

const ExamSession = () => {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isStarted, setIsStarted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [examResults, setExamResults] = useState<any>(null);
  const [showAnswerReview, setShowAnswerReview] = useState(false);

  const { data: category } = useQuery({
    queryKey: ['exam-category', categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exam_categories')
        .select('*')
        .eq('id', categoryId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!categoryId
  });

  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

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

  // Timer effect
  useEffect(() => {
    if (!isStarted || isPaused || timeRemaining <= 0) return;
    
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isStarted, isPaused, timeRemaining]);

  const startExam = async () => {
    if (!user || !category) {
      toast.error("Please sign in to take exams");
      navigate('/auth');
      return;
    }

    setIsGenerating(true);
    
    try {
      // First, try to fetch stored questions from database
      const { data: storedQuestions, error: fetchError } = await supabase
        .from('exam_questions')
        .select('*')
        .eq('category_id', categoryId)
        .eq('is_active', true)
        .order('sort_order');

      let examQuestions: Question[] = [];

      if (storedQuestions && storedQuestions.length >= 5) {
        // Use stored questions - shuffle and pick random subset
        const shuffled = [...storedQuestions].sort(() => Math.random() - 0.5);
        const selected = shuffled.slice(0, Math.min(10, shuffled.length));
        
        examQuestions = selected.map((q: any) => ({
          id: q.id,
          question_text: q.question_text,
          question_type: q.question_type === 'true_false' ? 'true_false' : 
                         q.question_type === 'fill_blank' ? 'short_answer' : 'multiple_choice',
          options: q.options || null,
          correct_answer: q.correct_answer,
          points: q.points || 10,
          video_url: q.question_media_url || null,
          image_url: null,
          explanation: q.explanation || null,
          time_limit_seconds: q.time_limit_seconds || null
        }));
      } else {
        // Fall back to AI generation if no stored questions
        const { data: funcData, error: funcError } = await supabase.functions.invoke('generate-exam-questions', {
          body: {
            content: category.description || `Comprehensive examination on ${category.name}. Test knowledge of key concepts, best practices, techniques, and industry standards.`,
            categoryName: category.name,
            questionCount: 10,
            categoryId: categoryId
          }
        });

        if (funcError) throw funcError;

        examQuestions = (funcData.questions || []).map((q: any, idx: number) => ({
          id: `gen-${Date.now()}-${idx}`,
          question_text: q.question_text,
          question_type: q.question_type === 'true_false' ? 'true_false' : 
                         q.question_type === 'fill_blank' ? 'short_answer' : 'multiple_choice',
          options: q.options || null,
          correct_answer: q.correct_answer,
          points: q.points || 10,
          video_url: null,
          image_url: null,
          explanation: q.explanation || null,
          time_limit_seconds: null
        }));
      }

      if (examQuestions.length === 0) {
        throw new Error('No questions available for this exam');
      }

      setQuestions(examQuestions);

      // Create exam session
      const { data, error } = await supabase
        .from('exam_sessions')
        .insert({
          user_id: user.id,
          category_id: categoryId,
          status: 'in_progress'
        })
        .select()
        .single();

      if (error) throw error;

      setSessionId(data.id);
      setTimeRemaining(30 * 60);
      setIsStarted(true);
    } catch (err: any) {
      console.error('Failed to start exam:', err);
      toast.error(err.message || 'Failed to load exam questions');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAnswer = useCallback((questionId: string, answer: any) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: { questionId, answer }
    }));
  }, []);

  const calculateScore = useCallback(() => {
    if (!questions) return { score: 0, correct: 0, total: 0, details: [] };
    
    let correct = 0;
    let totalPoints = 0;
    let earnedPoints = 0;
    const details: any[] = [];

    questions.forEach(q => {
      totalPoints += q.points;
      const userAnswer = answers[q.id]?.answer;
      let isCorrect = false;

      if (q.question_type === 'multiple_choice') {
        isCorrect = userAnswer === q.correct_answer;
      } else if (q.question_type === 'true_false') {
        // Handle true/false - compare as strings to handle both boolean and string formats
        const userAnswerStr = String(userAnswer).toLowerCase();
        const correctAnswerStr = String(q.correct_answer).toLowerCase();
        isCorrect = userAnswerStr === correctAnswerStr;
      } else if (q.question_type === 'multiple_select') {
        const correctSet = new Set(q.correct_answer as string[]);
        const userSet = new Set(userAnswer as string[] || []);
        isCorrect = correctSet.size === userSet.size && 
          [...correctSet].every(x => userSet.has(x));
      } else if (q.question_type === 'short_answer') {
        const correctAnswers = (q.correct_answer as string).toLowerCase().split('|');
        isCorrect = correctAnswers.some(a => 
          userAnswer?.toLowerCase().trim() === a.trim()
        );
      }

      if (isCorrect) {
        correct++;
        earnedPoints += q.points;
      }

      details.push({
        question: q,
        userAnswer,
        isCorrect,
        points: isCorrect ? q.points : 0
      });
    });

    const score = Math.round((earnedPoints / totalPoints) * 100);
    return { score, correct, total: questions.length, earnedPoints, totalPoints, details };
  }, [questions, answers]);

  const getBadgeLevel = (score: number) => {
    if (!badgeLevels) return null;
    return badgeLevels.find(b => score >= b.min_score && score <= b.max_score);
  };

  const handleSubmit = async () => {
    if (!sessionId || !user || !categoryId) return;
    
    const results = calculateScore();
    const badge = getBadgeLevel(results.score);
    const timeTaken = 30 * 60 - timeRemaining;

    // Update session
    await supabase
      .from('exam_sessions')
      .update({
        status: 'completed',
        score: results.score,
        completed_at: new Date().toISOString(),
        time_taken_seconds: timeTaken,
        badge_level_id: badge?.id
      })
      .eq('id', sessionId);

    // Save answers
    const answersToSave = results.details.map((d: any) => ({
      session_id: sessionId,
      question_id: d.question.id,
      user_id: user.id,
      selected_answer: typeof d.userAnswer === 'string' ? d.userAnswer : JSON.stringify(d.userAnswer),
      is_correct: d.isCorrect,
      points_earned: d.points,
      time_taken_seconds: Math.floor(timeTaken / results.total)
    }));

    await supabase.from('exam_answers').insert(answersToSave);

    // Create certificate if passed
    if (results.score >= 60 && badge) {
      await supabase.from('exam_certificates').insert([{
        user_id: user.id,
        category_id: categoryId,
        session_id: sessionId,
        badge_level_id: badge.id,
        score: results.score,
        percentage: results.score
      }]);
    }

    setExamResults({ ...results, badge, timeTaken });
    setShowResults(true);
    setShowSubmitDialog(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const currentQuestion = questions?.[currentIndex];
  const progress = questions ? ((currentIndex + 1) / questions.length) * 100 : 0;

  // Pre-exam screen - Mobile Optimized
  if (!isStarted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-sm"
        >
          <Card className="text-center">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl sm:text-2xl">{category?.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <p className="text-sm text-muted-foreground line-clamp-3">{category?.description}</p>
              
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-lg bg-muted">
                  <BookOpen className="h-4 w-4 mx-auto mb-1 text-primary" />
                  <p className="text-sm font-medium">10</p>
                  <p className="text-[10px] text-muted-foreground">Questions</p>
                </div>
                <div className="p-2.5 rounded-lg bg-muted">
                  <HelpCircle className="h-4 w-4 mx-auto mb-1 text-primary" />
                  <p className="text-sm font-medium">Unique</p>
                  <p className="text-[10px] text-muted-foreground">Fresh Set</p>
                </div>
                <div className="p-2.5 rounded-lg bg-muted">
                  <Clock className="h-4 w-4 mx-auto mb-1 text-primary" />
                  <p className="text-sm font-medium">30 min</p>
                  <p className="text-[10px] text-muted-foreground">Time Limit</p>
                </div>
                <div className="p-2.5 rounded-lg bg-muted">
                  <CheckCircle className="h-4 w-4 mx-auto mb-1 text-green-500" />
                  <p className="text-sm font-medium">60%</p>
                  <p className="text-[10px] text-muted-foreground">To Pass</p>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <Button className="w-full h-12" onClick={startExam} disabled={isGenerating}>
                  {isGenerating ? (
                    <>
                      <div className="h-4 w-4 mr-2 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Play className="h-5 w-5 mr-2" />
                      Start Exam
                    </>
                  )}
                </Button>
                <Button variant="outline" className="w-full h-10" onClick={() => navigate('/exam-center')}>
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // Results screen - Mobile Optimized
  if (showResults && examResults) {
    const passed = examResults.score >= 60;
    
    // Answer Review Screen - Mobile Optimized
    if (showAnswerReview) {
      return (
        <div className="min-h-screen bg-background pb-24">
          <div className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b px-3 py-2">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => setShowAnswerReview(false)}>
                <ChevronLeft className="h-4 w-4" />
                <span className="ml-1 text-sm">Back</span>
              </Button>
              <h2 className="text-sm font-semibold">Answer Review</h2>
              <div className="w-16" />
            </div>
          </div>
          
          <div className="px-3 py-3 space-y-3 max-w-lg mx-auto">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-green-500">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">{examResults.correct}</span>
                </div>
                <div className="flex items-center gap-1.5 text-red-500">
                  <XCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">{examResults.total - examResults.correct}</span>
                </div>
              </div>
              <Badge variant={passed ? "default" : "destructive"} className="text-xs">
                {examResults.score}%
              </Badge>
            </div>
            
            {examResults.details?.map((detail: any, index: number) => (
              <motion.div
                key={detail.question.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <Card className={`overflow-hidden border-l-4 ${
                  detail.isCorrect ? 'border-l-green-500' : 'border-l-red-500'
                }`}>
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-medium text-muted-foreground">Q{index + 1}</span>
                        {detail.isCorrect ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                      <Badge variant="outline" className="text-[10px] h-5">
                        {detail.points}/{detail.question.points}
                      </Badge>
                    </div>
                    
                    <p className="font-medium text-xs leading-relaxed">{detail.question.question_text}</p>
                    
                    <div className="space-y-1.5 text-xs">
                      <div className={`p-2 rounded ${
                        detail.isCorrect ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'
                      }`}>
                        <p className="text-[10px] text-muted-foreground mb-0.5">Your Answer:</p>
                        <p className={`text-xs ${detail.isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                          {Array.isArray(detail.userAnswer) 
                            ? detail.userAnswer.join(', ') 
                            : detail.userAnswer || 'Not answered'}
                        </p>
                      </div>
                      
                      {!detail.isCorrect && (
                        <div className="p-2 rounded bg-green-500/10 border border-green-500/30">
                          <p className="text-[10px] text-muted-foreground mb-0.5">Correct:</p>
                          <p className="text-xs text-green-600">
                            {Array.isArray(detail.question.correct_answer) 
                              ? detail.question.correct_answer.join(', ') 
                              : detail.question.correct_answer}
                          </p>
                        </div>
                      )}
                      
                      {detail.question.explanation && (
                        <div className="p-2 rounded bg-blue-500/10 border border-blue-500/30">
                          <p className="text-[10px] text-muted-foreground mb-0.5">Explanation:</p>
                          <p className="text-[10px] text-blue-600">{detail.question.explanation}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      );
    }
    
    // Results Summary Screen - Mobile Optimized
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-sm"
        >
          <Card className="text-center overflow-hidden">
            <div className={`p-4 sm:p-6 ${passed ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gradient-to-r from-red-500 to-orange-500'}`}>
              {passed ? (
                <CheckCircle className="h-12 w-12 sm:h-16 sm:w-16 mx-auto text-white mb-2" />
              ) : (
                <XCircle className="h-12 w-12 sm:h-16 sm:w-16 mx-auto text-white mb-2" />
              )}
              <h2 className="text-xl sm:text-2xl font-bold text-white">
                {passed ? 'Congratulations!' : 'Keep Practicing!'}
              </h2>
            </div>
            
            <CardContent className="p-4 space-y-4">
              <div className="text-center">
                <p className="text-4xl sm:text-5xl font-bold text-primary mb-1">{examResults.score}%</p>
                <p className="text-sm text-muted-foreground">
                  {examResults.correct} of {examResults.total} correct
                </p>
              </div>

              {examResults.badge && (
                <div className="p-3 rounded-lg bg-gradient-to-r from-primary/20 to-purple-500/20">
                  <Badge className="text-sm py-0.5 px-3">
                    {examResults.badge.name} Earned!
                  </Badge>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-lg bg-muted">
                  <p className="text-sm font-medium">{formatTime(examResults.timeTaken)}</p>
                  <p className="text-[10px] text-muted-foreground">Time Taken</p>
                </div>
                <div className="p-2.5 rounded-lg bg-muted">
                  <p className="text-sm font-medium">{examResults.earnedPoints}/{examResults.totalPoints}</p>
                  <p className="text-[10px] text-muted-foreground">Points</p>
                </div>
              </div>

              <div className="space-y-2">
                <Button 
                  variant="outline" 
                  className="w-full h-10"
                  onClick={() => setShowAnswerReview(true)}
                >
                  <BookOpen className="h-4 w-4 mr-2" />
                  View Answer Report
                </Button>
                
                {passed && sessionId && (
                  <Button className="w-full h-10 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700" onClick={async () => {
                    const { data: cert } = await supabase
                      .from('exam_certificates')
                      .select('id')
                      .eq('session_id', sessionId)
                      .single();
                    if (cert) {
                      navigate(`/certificate/${cert.id}`);
                    } else {
                      navigate('/exam-center');
                    }
                  }}>
                    <Award className="h-4 w-4 mr-2" />
                    View Certificate
                  </Button>
                )}
                <Button 
                  variant={passed ? "outline" : "default"} 
                  className="w-full h-10"
                  onClick={() => {
                    setIsStarted(false);
                    setShowResults(false);
                    setAnswers({});
                    setCurrentIndex(0);
                  }}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
                <Button variant="ghost" className="w-full h-9 text-sm" onClick={() => navigate('/exam-center')}>
                  Back to Exams
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // Loading state - Mobile Optimized
  if (!questions || questions.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-xs text-center p-6">
          <div className="h-10 w-10 border-3 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-3" />
          <h3 className="text-base font-semibold">Loading...</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Preparing questions
          </p>
        </Card>
      </div>
    );
  }

  // Main exam interface - Mobile Optimized
  return (
    <div className="min-h-screen bg-background pb-4">
      {/* Header - Mobile Optimized */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1">
              <span className="text-sm font-medium whitespace-nowrap">
                {currentIndex + 1}/{questions?.length}
              </span>
              <Progress value={progress} className="flex-1 h-1.5 max-w-24" />
            </div>
            
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-sm ${
              timeRemaining < 60 ? 'bg-red-500/20 text-red-500' : 'bg-muted'
            }`}>
              <Clock className="h-3.5 w-3.5" />
              <span className="font-mono font-bold">{formatTime(timeRemaining)}</span>
            </div>

            <div className="flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="icon"
                className="h-8 w-8"
                onClick={() => setIsPaused(!isPaused)}
              >
                {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
              </Button>
              <Button 
                variant="destructive" 
                size="sm"
                className="h-8 px-3 text-xs"
                onClick={() => setShowSubmitDialog(true)}
              >
                Submit
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Question Content - Mobile Optimized */}
      <div className="px-3 py-4 max-w-lg mx-auto">
        <AnimatePresence mode="wait">
          {currentQuestion && (
            <motion.div
              key={currentQuestion.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className="text-[10px] h-5">
                        {currentQuestion.question_type === 'video_practical' ? 'Practical' : 'Theory'}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px] h-5">{currentQuestion.points} pts</Badge>
                    </div>
                    {currentQuestion.time_limit_seconds && (
                      <Badge variant="outline" className="text-[10px] h-5">
                        <Clock className="h-2.5 w-2.5 mr-0.5" />
                        {currentQuestion.time_limit_seconds}s
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-base sm:text-lg mt-3 leading-relaxed">
                    {currentQuestion.question_text}
                  </CardTitle>
                </CardHeader>
                
                <CardContent className="space-y-4 pt-0">
                  {/* Video/Image */}
                  {currentQuestion.video_url && (
                    <div className="aspect-video rounded-lg overflow-hidden bg-black">
                      <video 
                        src={currentQuestion.video_url} 
                        controls 
                        className="w-full h-full"
                      />
                    </div>
                  )}
                  {currentQuestion.image_url && (
                    <img 
                      src={currentQuestion.image_url} 
                      alt="Question" 
                      className="rounded-lg max-h-48 mx-auto"
                    />
                  )}

                  {/* Answer Options - Mobile Optimized */}
                  {currentQuestion.question_type === 'multiple_choice' && (
                    <RadioGroup
                      value={answers[currentQuestion.id]?.answer || ''}
                      onValueChange={(value) => handleAnswer(currentQuestion.id, value)}
                      className="space-y-2"
                    >
                      {currentQuestion.options?.map((option, idx) => (
                        <div 
                          key={idx}
                          className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors cursor-pointer active:scale-[0.98] ${
                            answers[currentQuestion.id]?.answer === option 
                              ? 'border-primary bg-primary/5' 
                              : 'hover:bg-muted'
                          }`}
                          onClick={() => handleAnswer(currentQuestion.id, option)}
                        >
                          <RadioGroupItem value={option} id={`option-${idx}`} />
                          <Label htmlFor={`option-${idx}`} className="flex-1 cursor-pointer text-sm">
                            {option}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  )}

                  {currentQuestion.question_type === 'true_false' && (
                    <RadioGroup
                      value={answers[currentQuestion.id]?.answer || ''}
                      onValueChange={(value) => handleAnswer(currentQuestion.id, value)}
                      className="grid grid-cols-2 gap-3"
                    >
                      {['True', 'False'].map((value) => (
                        <div
                          key={value}
                          className={`flex items-center justify-center p-4 rounded-lg border transition-colors cursor-pointer active:scale-[0.98] ${
                            answers[currentQuestion.id]?.answer === value
                              ? 'border-primary bg-primary/5'
                              : 'hover:bg-muted'
                          }`}
                          onClick={() => handleAnswer(currentQuestion.id, value)}
                        >
                          <RadioGroupItem value={value} id={value} className="sr-only" />
                          <Label htmlFor={value} className="text-base font-medium cursor-pointer">
                            {value}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  )}

                  {currentQuestion.question_type === 'multiple_select' && (
                    <div className="space-y-2">
                      {currentQuestion.options?.map((option, idx) => {
                        const selectedAnswers = (answers[currentQuestion.id]?.answer as string[]) || [];
                        const isChecked = selectedAnswers.includes(option);
                        
                        return (
                          <div
                            key={idx}
                            className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors cursor-pointer active:scale-[0.98] ${
                              isChecked ? 'border-primary bg-primary/5' : 'hover:bg-muted'
                            }`}
                            onClick={() => {
                              const newAnswers = isChecked
                                ? selectedAnswers.filter(a => a !== option)
                                : [...selectedAnswers, option];
                              handleAnswer(currentQuestion.id, newAnswers);
                            }}
                          >
                            <Checkbox checked={isChecked} />
                            <span className="flex-1 text-sm">{option}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {currentQuestion.question_type === 'short_answer' && (
                    <Textarea
                      placeholder="Type your answer..."
                      value={answers[currentQuestion.id]?.answer || ''}
                      onChange={(e) => handleAnswer(currentQuestion.id, e.target.value)}
                      className="min-h-24 text-sm"
                    />
                  )}

                  {currentQuestion.question_type === 'video_practical' && (
                    <div className="space-y-3">
                      <p className="text-xs text-muted-foreground">
                        Watch the video and answer based on what you observe.
                      </p>
                      <Textarea
                        placeholder="Describe what you observed..."
                        value={answers[currentQuestion.id]?.answer || ''}
                        onChange={(e) => handleAnswer(currentQuestion.id, e.target.value)}
                        className="min-h-24 text-sm"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Navigation - Mobile Optimized */}
              <div className="flex items-center justify-between gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-10 px-3"
                  onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                  disabled={currentIndex === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="hidden sm:inline ml-1">Prev</span>
                </Button>

                <div className="flex gap-1 flex-wrap justify-center max-w-[180px]">
                  {questions?.map((_, idx) => (
                    <button
                      key={idx}
                      className={`w-2.5 h-2.5 rounded-full transition-colors ${
                        idx === currentIndex
                          ? 'bg-primary'
                          : answers[questions[idx].id]
                            ? 'bg-green-500'
                            : 'bg-muted'
                      }`}
                      onClick={() => setCurrentIndex(idx)}
                    />
                  ))}
                </div>

                {currentIndex === (questions?.length || 0) - 1 ? (
                  <Button size="sm" className="h-10 px-3" onClick={() => setShowSubmitDialog(true)}>
                    <Send className="h-4 w-4" />
                    <span className="hidden sm:inline ml-1">Submit</span>
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="h-10 px-3"
                    onClick={() => setCurrentIndex(prev => Math.min((questions?.length || 1) - 1, prev + 1))}
                  >
                    <span className="hidden sm:inline mr-1">Next</span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Submit Dialog */}
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit Exam?</AlertDialogTitle>
            <AlertDialogDescription>
              You have answered {Object.keys(answers).length} of {questions?.length} questions.
              {Object.keys(answers).length < (questions?.length || 0) && (
                <span className="block mt-2 text-yellow-600">
                  <AlertTriangle className="h-4 w-4 inline mr-1" />
                  Some questions are unanswered!
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Exam</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmit}>Submit Now</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ExamSession;
