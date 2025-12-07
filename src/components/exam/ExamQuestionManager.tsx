import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Plus, 
  Edit, 
  Trash2, 
  BookOpen,
  Video,
  CheckCircle,
  HelpCircle,
  Save
} from "lucide-react";

interface Question {
  id: string;
  category_id: string;
  question_text: string;
  question_type: string;
  options: string[] | null;
  correct_answer: any;
  points: number;
  difficulty_level: string;
  video_url: string | null;
  image_url: string | null;
  explanation: string | null;
  is_active: boolean;
}

interface ExamQuestionManagerProps {
  categoryId: string;
}

const ExamQuestionManager = ({ categoryId }: ExamQuestionManagerProps) => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [formData, setFormData] = useState({
    question_text: '',
    question_type: 'multiple_choice',
    options: ['', '', '', ''],
    correct_answer: '',
    points: 10,
    difficulty_level: 'beginner',
    video_url: '',
    image_url: '',
    explanation: ''
  });

  const { data: questions, isLoading } = useQuery({
    queryKey: ['admin-exam-questions', categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exam_questions')
        .select('*')
        .eq('category_id', categoryId)
        .order('sort_order') as { data: Question[] | null, error: any };
      if (error) throw error;
      return data as Question[];
    }
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingQuestion) {
        const { error } = await supabase
          .from('exam_questions')
          .update(data)
          .eq('id', editingQuestion.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('exam_questions')
          .insert({ ...data, category_id: categoryId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-exam-questions', categoryId] });
      toast.success(editingQuestion ? 'Question updated!' : 'Question added!');
      resetForm();
      setIsDialogOpen(false);
    },
    onError: () => {
      toast.error('Failed to save question');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('exam_questions')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-exam-questions', categoryId] });
      toast.success('Question deleted');
    }
  });

  const resetForm = () => {
    setFormData({
      question_text: '',
      question_type: 'multiple_choice',
      options: ['', '', '', ''],
      correct_answer: '',
      points: 10,
      difficulty_level: 'beginner',
      video_url: '',
      image_url: '',
      explanation: ''
    });
    setEditingQuestion(null);
  };

  const handleEdit = (question: Question) => {
    setEditingQuestion(question);
    setFormData({
      question_text: question.question_text,
      question_type: question.question_type,
      options: question.options || ['', '', '', ''],
      correct_answer: typeof question.correct_answer === 'string' 
        ? question.correct_answer 
        : JSON.stringify(question.correct_answer),
      points: question.points,
      difficulty_level: question.difficulty_level,
      video_url: question.video_url || '',
      image_url: question.image_url || '',
      explanation: question.explanation || ''
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    let correctAnswer: any = formData.correct_answer;
    if (formData.question_type === 'true_false') {
      correctAnswer = formData.correct_answer === 'true';
    } else if (formData.question_type === 'multiple_select') {
      correctAnswer = formData.correct_answer.split(',').map(s => s.trim());
    }

    const data = {
      question_text: formData.question_text,
      question_type: formData.question_type,
      options: formData.question_type === 'true_false' ? null : formData.options.filter(o => o),
      correct_answer: correctAnswer,
      points: formData.points,
      difficulty_level: formData.difficulty_level,
      video_url: formData.video_url || null,
      image_url: formData.image_url || null,
      explanation: formData.explanation || null,
      is_active: true
    };

    saveMutation.mutate(data);
  };

  const getQuestionTypeIcon = (type: string) => {
    const icons: Record<string, any> = {
      'multiple_choice': HelpCircle,
      'true_false': CheckCircle,
      'multiple_select': CheckCircle,
      'short_answer': BookOpen,
      'video_practical': Video
    };
    const Icon = icons[type] || HelpCircle;
    return <Icon className="h-4 w-4" />;
  };

  const getDifficultyColor = (level: string) => {
    const colors: Record<string, string> = {
      'beginner': 'bg-green-500/20 text-green-600',
      'intermediate': 'bg-yellow-500/20 text-yellow-600',
      'advanced': 'bg-orange-500/20 text-orange-600',
      'expert': 'bg-red-500/20 text-red-600'
    };
    return colors[level] || 'bg-muted';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Questions ({questions?.length || 0})</h3>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Question
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>
                {editingQuestion ? 'Edit Question' : 'Add New Question'}
              </DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[70vh] pr-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Question Text</Label>
                  <Textarea
                    value={formData.question_text}
                    onChange={(e) => setFormData(prev => ({ ...prev, question_text: e.target.value }))}
                    placeholder="Enter your question..."
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Question Type</Label>
                    <Select
                      value={formData.question_type}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, question_type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                        <SelectItem value="true_false">True/False</SelectItem>
                        <SelectItem value="multiple_select">Multiple Select</SelectItem>
                        <SelectItem value="short_answer">Short Answer</SelectItem>
                        <SelectItem value="video_practical">Video Practical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Difficulty</Label>
                    <Select
                      value={formData.difficulty_level}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, difficulty_level: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">Beginner</SelectItem>
                        <SelectItem value="intermediate">Intermediate</SelectItem>
                        <SelectItem value="advanced">Advanced</SelectItem>
                        <SelectItem value="expert">Expert</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {(formData.question_type === 'multiple_choice' || formData.question_type === 'multiple_select') && (
                  <div className="space-y-2">
                    <Label>Options</Label>
                    {formData.options.map((option, idx) => (
                      <Input
                        key={idx}
                        value={option}
                        onChange={(e) => {
                          const newOptions = [...formData.options];
                          newOptions[idx] = e.target.value;
                          setFormData(prev => ({ ...prev, options: newOptions }));
                        }}
                        placeholder={`Option ${idx + 1}`}
                      />
                    ))}
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Correct Answer</Label>
                  {formData.question_type === 'true_false' ? (
                    <Select
                      value={formData.correct_answer}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, correct_answer: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select answer" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">True</SelectItem>
                        <SelectItem value="false">False</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      value={formData.correct_answer}
                      onChange={(e) => setFormData(prev => ({ ...prev, correct_answer: e.target.value }))}
                      placeholder={formData.question_type === 'multiple_select' 
                        ? "Enter answers separated by commas" 
                        : "Enter correct answer"}
                      required
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Points</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.points}
                    onChange={(e) => setFormData(prev => ({ ...prev, points: parseInt(e.target.value) }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Video URL (optional)</Label>
                  <Input
                    value={formData.video_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, video_url: e.target.value }))}
                    placeholder="https://..."
                  />
                </div>

                <div className="space-y-2">
                  <Label>Image URL (optional)</Label>
                  <Input
                    value={formData.image_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
                    placeholder="https://..."
                  />
                </div>

                <div className="space-y-2">
                  <Label>Explanation (shown after answer)</Label>
                  <Textarea
                    value={formData.explanation}
                    onChange={(e) => setFormData(prev => ({ ...prev, explanation: e.target.value }))}
                    placeholder="Explain why this is the correct answer..."
                  />
                </div>

                <Button type="submit" className="w-full" disabled={saveMutation.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  {saveMutation.isPending ? 'Saving...' : 'Save Question'}
                </Button>
              </form>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading questions...</div>
      ) : questions?.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No questions yet. Add your first question!
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {questions?.map((question, index) => (
            <Card key={question.id} className={!question.is_active ? 'opacity-50' : ''}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-sm font-medium">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      {getQuestionTypeIcon(question.question_type)}
                      <Badge variant="outline" className="text-xs">
                        {question.question_type.replace('_', ' ')}
                      </Badge>
                      <Badge className={`text-xs ${getDifficultyColor(question.difficulty_level)}`}>
                        {question.difficulty_level}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {question.points} pts
                      </Badge>
                    </div>
                    <p className="text-sm line-clamp-2">{question.question_text}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(question)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-destructive"
                      onClick={() => deleteMutation.mutate(question.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ExamQuestionManager;
