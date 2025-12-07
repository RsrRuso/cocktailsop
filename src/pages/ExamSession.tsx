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

      if (q.question_type === 'multiple_choice' || q.question_type === 'true_false') {
        isCorrect = userAnswer === q.correct_answer;
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

  // Pre-exam screen
  if (!isStarted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full"
        >
          <Card className="text-center">
            <CardHeader>
              <CardTitle className="text-2xl">{category?.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-muted-foreground">{category?.description}</p>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="p-3 rounded-lg bg-muted">
                  <BookOpen className="h-5 w-5 mx-auto mb-1 text-primary" />
                  <p className="font-medium">10</p>
                  <p className="text-xs text-muted-foreground">AI-Generated Questions</p>
                </div>
                <div className="p-3 rounded-lg bg-muted">
                  <HelpCircle className="h-5 w-5 mx-auto mb-1 text-primary" />
                  <p className="font-medium">Unique</p>
                  <p className="text-xs text-muted-foreground">Fresh Every Time</p>
                </div>
                <div className="p-3 rounded-lg bg-muted">
                <Clock className="h-5 w-5 mx-auto mb-1 text-primary" />
                  <p className="font-medium">30 min</p>
                  <p className="text-xs text-muted-foreground">Time Limit</p>
                </div>
                <div className="p-3 rounded-lg bg-muted">
                  <CheckCircle className="h-5 w-5 mx-auto mb-1 text-green-500" />
                  <p className="font-medium">60%</p>
                  <p className="text-xs text-muted-foreground">Pass Score</p>
                </div>
              </div>

              <div className="space-y-3">
                <Button className="w-full" size="lg" onClick={startExam} disabled={isGenerating}>
                  {isGenerating ? (
                    <>
                      <div className="h-5 w-5 mr-2 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Generating Questions...
                    </>
                  ) : (
                    <>
                      <Play className="h-5 w-5 mr-2" />
                      Start Exam
                    </>
                  )}
                </Button>
                <Button variant="outline" className="w-full" onClick={() => navigate('/exam-center')}>
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Back to Categories
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // Results screen
  if (showResults && examResults) {
    const passed = examResults.score >= 60;
    
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-lg w-full"
        >
          <Card className="text-center overflow-hidden">
            <div className={`p-6 ${passed ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gradient-to-r from-red-500 to-orange-500'}`}>
              {passed ? (
                <CheckCircle className="h-16 w-16 mx-auto text-white mb-2" />
              ) : (
                <XCircle className="h-16 w-16 mx-auto text-white mb-2" />
              )}
              <h2 className="text-2xl font-bold text-white">
                {passed ? 'Congratulations!' : 'Keep Practicing!'}
              </h2>
            </div>
            
            <CardContent className="p-6 space-y-6">
              <div className="text-center">
                <p className="text-5xl font-bold text-primary mb-2">{examResults.score}%</p>
                <p className="text-muted-foreground">
                  {examResults.correct} of {examResults.total} correct
                </p>
              </div>

              {examResults.badge && (
                <div className="p-4 rounded-lg bg-gradient-to-r from-primary/20 to-purple-500/20">
                  <Badge className="text-lg py-1 px-4">
                    {examResults.badge.name} Badge Earned!
                  </Badge>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="p-3 rounded-lg bg-muted">
                  <p className="font-medium">{formatTime(examResults.timeTaken)}</p>
                  <p className="text-xs text-muted-foreground">Time Taken</p>
                </div>
                <div className="p-3 rounded-lg bg-muted">
                  <p className="font-medium">{examResults.earnedPoints}/{examResults.totalPoints}</p>
                  <p className="text-xs text-muted-foreground">Points Earned</p>
                </div>
              </div>

              <div className="space-y-3">
                {passed && sessionId && (
                  <Button className="w-full" onClick={async () => {
                    // Get the certificate for this session
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
                    View & Download Certificate
                  </Button>
                )}
                <Button 
                  variant={passed ? "outline" : "default"} 
                  className="w-full"
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
                <Button variant="ghost" className="w-full" onClick={() => navigate('/exam-center')}>
                  Back to Exam Center
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // Main exam interface
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="container max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="font-medium">
                {currentIndex + 1}/{questions?.length}
              </span>
              <Progress value={progress} className="w-32 h-2" />
            </div>
            
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${
              timeRemaining < 60 ? 'bg-red-500/20 text-red-500' : 'bg-muted'
            }`}>
              <Clock className="h-4 w-4" />
              <span className="font-mono font-bold">{formatTime(timeRemaining)}</span>
            </div>

            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setIsPaused(!isPaused)}
              >
                {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
              </Button>
              <Button 
                variant="destructive" 
                size="sm"
                onClick={() => setShowSubmitDialog(true)}
              >
                Submit
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Question Content */}
      <div className="container max-w-4xl mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          {currentQuestion && (
            <motion.div
              key={currentQuestion.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {currentQuestion.question_type === 'video_practical' ? 'Practical' : 'Theory'}
                      </Badge>
                      <Badge variant="secondary">{currentQuestion.points} pts</Badge>
                    </div>
                    {currentQuestion.time_limit_seconds && (
                      <Badge variant="outline">
                        <Clock className="h-3 w-3 mr-1" />
                        {currentQuestion.time_limit_seconds}s
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-xl mt-4">
                    {currentQuestion.question_text}
                  </CardTitle>
                </CardHeader>
                
                <CardContent className="space-y-6">
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
                      className="rounded-lg max-h-64 mx-auto"
                    />
                  )}

                  {/* Answer Options */}
                  {currentQuestion.question_type === 'multiple_choice' && (
                    <RadioGroup
                      value={answers[currentQuestion.id]?.answer || ''}
                      onValueChange={(value) => handleAnswer(currentQuestion.id, value)}
                      className="space-y-3"
                    >
                      {currentQuestion.options?.map((option, idx) => (
                        <div 
                          key={idx}
                          className={`flex items-center space-x-3 p-4 rounded-lg border transition-colors cursor-pointer ${
                            answers[currentQuestion.id]?.answer === option 
                              ? 'border-primary bg-primary/5' 
                              : 'hover:bg-muted'
                          }`}
                          onClick={() => handleAnswer(currentQuestion.id, option)}
                        >
                          <RadioGroupItem value={option} id={`option-${idx}`} />
                          <Label htmlFor={`option-${idx}`} className="flex-1 cursor-pointer">
                            {option}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  )}

                  {currentQuestion.question_type === 'true_false' && (
                    <RadioGroup
                      value={answers[currentQuestion.id]?.answer?.toString() || ''}
                      onValueChange={(value) => handleAnswer(currentQuestion.id, value === 'true')}
                      className="grid grid-cols-2 gap-4"
                    >
                      {[true, false].map((value) => (
                        <div
                          key={value.toString()}
                          className={`flex items-center justify-center p-6 rounded-lg border transition-colors cursor-pointer ${
                            answers[currentQuestion.id]?.answer === value
                              ? 'border-primary bg-primary/5'
                              : 'hover:bg-muted'
                          }`}
                          onClick={() => handleAnswer(currentQuestion.id, value)}
                        >
                          <RadioGroupItem value={value.toString()} id={value.toString()} className="sr-only" />
                          <Label htmlFor={value.toString()} className="text-lg font-medium cursor-pointer">
                            {value ? 'True' : 'False'}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  )}

                  {currentQuestion.question_type === 'multiple_select' && (
                    <div className="space-y-3">
                      {currentQuestion.options?.map((option, idx) => {
                        const selectedAnswers = (answers[currentQuestion.id]?.answer as string[]) || [];
                        const isChecked = selectedAnswers.includes(option);
                        
                        return (
                          <div
                            key={idx}
                            className={`flex items-center space-x-3 p-4 rounded-lg border transition-colors cursor-pointer ${
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
                            <span className="flex-1">{option}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {currentQuestion.question_type === 'short_answer' && (
                    <Textarea
                      placeholder="Type your answer here..."
                      value={answers[currentQuestion.id]?.answer || ''}
                      onChange={(e) => handleAnswer(currentQuestion.id, e.target.value)}
                      className="min-h-32"
                    />
                  )}

                  {currentQuestion.question_type === 'video_practical' && (
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Watch the video and answer the question based on what you observe.
                      </p>
                      <Textarea
                        placeholder="Describe what you observed and your answer..."
                        value={answers[currentQuestion.id]?.answer || ''}
                        onChange={(e) => handleAnswer(currentQuestion.id, e.target.value)}
                        className="min-h-32"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Navigation */}
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                  disabled={currentIndex === 0}
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>

                <div className="flex gap-1">
                  {questions?.map((_, idx) => (
                    <button
                      key={idx}
                      className={`w-3 h-3 rounded-full transition-colors ${
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
                  <Button onClick={() => setShowSubmitDialog(true)}>
                    <Send className="h-4 w-4 mr-2" />
                    Submit
                  </Button>
                ) : (
                  <Button
                    onClick={() => setCurrentIndex(prev => Math.min((questions?.length || 1) - 1, prev + 1))}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-2" />
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
