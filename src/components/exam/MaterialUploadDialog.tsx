import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { 
  Upload, 
  FileText, 
  Loader2, 
  Sparkles, 
  CheckCircle,
  X,
  File,
  BookOpen
} from "lucide-react";

interface MaterialUploadDialogProps {
  onQuestionsGenerated?: () => void;
}

const MaterialUploadDialog = ({ onQuestionsGenerated }: MaterialUploadDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [questionCount, setQuestionCount] = useState(10);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState("");
  const [generatedCount, setGeneratedCount] = useState(0);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/markdown': ['.md']
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024 // 10MB
  });

  const extractTextFromFile = async (file: File): Promise<string> => {
    if (file.type === 'text/plain' || file.type === 'text/markdown') {
      return await file.text();
    }
    
    // For PDF and other files, we'll read as text or use basic extraction
    // In production, you'd use a proper PDF parser
    const reader = new FileReader();
    return new Promise((resolve, reject) => {
      reader.onload = (e) => {
        const text = e.target?.result as string;
        resolve(text || '');
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  const handleGenerate = async () => {
    if (!file || !categoryName.trim() || !user) {
      toast({
        title: "Missing information",
        description: "Please upload a file and enter a category name",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    setProgress(10);
    setStage("Reading file...");

    try {
      // Extract text from file
      const fileContent = await extractTextFromFile(file);
      
      if (!fileContent || fileContent.length < 100) {
        throw new Error("File content is too short or couldn't be read");
      }

      setProgress(20);
      setStage("Creating exam category...");

      // Create or get category
      let categoryId: string;
      
      const { data: existingCategory } = await supabase
        .from('exam_categories')
        .select('id')
        .eq('name', categoryName)
        .single();

      if (existingCategory) {
        categoryId = existingCategory.id;
      } else {
        const { data: newCategory, error: catError } = await supabase
          .from('exam_categories')
          .insert({
            name: categoryName,
            description: `Generated from ${file.name}`,
            icon: 'cocktail',
            is_active: true,
            sort_order: 99
          })
          .select('id')
          .single();

        if (catError) throw catError;
        categoryId = newCategory.id;
      }

      setProgress(30);
      setStage("Generating questions with AI...");

      // Call AI to generate questions
      const { data: aiResponse, error: aiError } = await supabase.functions.invoke(
        'generate-exam-questions',
        {
          body: {
            content: fileContent.substring(0, 15000), // Limit content size
            categoryName,
            questionCount,
            categoryId
          }
        }
      );

      if (aiError) throw aiError;

      setProgress(80);
      setStage("Saving questions...");

      const questions = aiResponse?.questions || [];
      
      if (questions.length === 0) {
        throw new Error("No questions were generated");
      }

      // Insert questions into database
      const { error: insertError } = await supabase
        .from('exam_questions')
        .insert(questions.map((q: any, index: number) => ({
          category_id: categoryId,
          question_text: q.question_text,
          question_type: q.question_type || 'multiple_choice',
          options: q.options,
          correct_answer: q.correct_answer,
          points: q.points || 10,
          explanation: q.explanation,
          sort_order: index + 1,
          is_active: true
        })));

      if (insertError) throw insertError;

      setProgress(100);
      setStage("Complete!");
      setGeneratedCount(questions.length);

      toast({
        title: "Questions generated!",
        description: `Created ${questions.length} unique questions from your material`
      });

      setTimeout(() => {
        setOpen(false);
        resetForm();
        onQuestionsGenerated?.();
      }, 1500);

    } catch (error: any) {
      console.error('Generation error:', error);
      toast({
        title: "Generation failed",
        description: error.message || "Failed to generate questions",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setCategoryName("");
    setQuestionCount(10);
    setProgress(0);
    setStage("");
    setGeneratedCount(0);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="h-4 w-4" />
          Upload Material
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Exam Generator
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* File Upload Zone */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
              isDragActive 
                ? 'border-primary bg-primary/10' 
                : file 
                  ? 'border-green-500 bg-green-500/10' 
                  : 'border-muted-foreground/30 hover:border-primary/50'
            }`}
          >
            <input {...getInputProps()} />
            
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <FileText className="h-10 w-10 text-green-500" />
                <div className="text-left">
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="ml-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <>
                <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                <p className="font-medium">Drop your study material here</p>
                <p className="text-sm text-muted-foreground mt-1">
                  PDF, TXT, DOC, DOCX, or MD (max 10MB)
                </p>
              </>
            )}
          </div>

          {/* Category Name */}
          <div className="space-y-2">
            <Label htmlFor="categoryName">Exam Category Name</Label>
            <Input
              id="categoryName"
              placeholder="e.g., Cocktail History, Wine Regions"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              disabled={isGenerating}
            />
          </div>

          {/* Question Count */}
          <div className="space-y-2">
            <Label htmlFor="questionCount">Number of Questions</Label>
            <div className="flex items-center gap-4">
              <Input
                id="questionCount"
                type="number"
                min={5}
                max={50}
                value={questionCount}
                onChange={(e) => setQuestionCount(parseInt(e.target.value) || 10)}
                disabled={isGenerating}
                className="w-24"
              />
              <div className="flex gap-2">
                {[5, 10, 20, 30].map(num => (
                  <Badge
                    key={num}
                    variant={questionCount === num ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => !isGenerating && setQuestionCount(num)}
                  >
                    {num}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Progress */}
          {isGenerating && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{stage}</span>
                <span className="font-medium">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {/* Success Message */}
          {generatedCount > 0 && !isGenerating && (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-green-500/10 border border-green-500/30">
              <CheckCircle className="h-6 w-6 text-green-500" />
              <div>
                <p className="font-medium text-green-500">Success!</p>
                <p className="text-sm text-muted-foreground">
                  {generatedCount} unique questions created
                </p>
              </div>
            </div>
          )}

          {/* Generate Button */}
          <Button
            onClick={handleGenerate}
            disabled={!file || !categoryName.trim() || isGenerating}
            className="w-full gap-2"
            size="lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate {questionCount} Questions
              </>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            AI will analyze your material and create unique, randomized exam questions
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MaterialUploadDialog;
