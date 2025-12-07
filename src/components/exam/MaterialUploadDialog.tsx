import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
  Edit3
} from "lucide-react";

interface MaterialUploadDialogProps {
  onQuestionsGenerated?: () => void;
}

const MaterialUploadDialog = ({ onQuestionsGenerated }: MaterialUploadDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [manualContent, setManualContent] = useState("");
  const [useManualInput, setUseManualInput] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [questionCount, setQuestionCount] = useState(10);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState("");
  const [generatedCount, setGeneratedCount] = useState(0);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setUseManualInput(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/plain': ['.txt'],
      'text/markdown': ['.md']
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024
  });

  const extractTextFromFile = async (file: File): Promise<string> => {
    return await file.text();
  };

  const handleGenerate = async () => {
    // Get content based on input mode
    let content = "";
    if (useManualInput) {
      content = manualContent.trim();
    } else if (file) {
      content = await extractTextFromFile(file);
    }
    
    // Validate required fields
    if (!content) {
      toast({
        title: "Missing content",
        description: "Please paste or upload study material",
        variant: "destructive"
      });
      return;
    }

    if (!categoryName.trim()) {
      toast({
        title: "Missing category",
        description: "Please enter an exam category name",
        variant: "destructive"
      });
      return;
    }

    if (!user) {
      toast({
        title: "Not logged in",
        description: "Please log in to generate questions",
        variant: "destructive"
      });
      return;
    }

    if (content.length < 50) {
      toast({
        title: "Content too short",
        description: "Please provide more content (at least 50 characters)",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    setProgress(10);
    setStage("Processing content...");

      try {
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
            description: useManualInput ? `Generated from pasted content` : `Generated from ${file?.name || 'uploaded file'}`,
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
            content: content.substring(0, 15000), // Limit content size
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
    setManualContent("");
    setUseManualInput(false);
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
          <DialogDescription>
            Upload study material or paste content to generate unique exam questions
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Toggle between file upload and manual input */}
          <div className="flex gap-2">
            <Button
              variant={!useManualInput ? "default" : "outline"}
              size="sm"
              onClick={() => setUseManualInput(false)}
              className="flex-1"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload File
            </Button>
            <Button
              variant={useManualInput ? "default" : "outline"}
              size="sm"
              onClick={() => setUseManualInput(true)}
              className="flex-1"
            >
              <Edit3 className="h-4 w-4 mr-2" />
              Paste Content
            </Button>
          </div>

          {/* File Upload Zone or Manual Input */}
          {!useManualInput ? (
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
                    TXT or MD files (max 10MB)
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Study Content</Label>
              <Textarea
                placeholder="Paste your study material here... (e.g., cocktail recipes, wine regions info, spirits knowledge)"
                value={manualContent}
                onChange={(e) => setManualContent(e.target.value)}
                disabled={isGenerating}
                className="min-h-[150px] resize-none"
              />
              <p className="text-xs text-muted-foreground">
                {manualContent.length} characters
              </p>
            </div>
          )}

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
            disabled={
              isGenerating || 
              !categoryName.trim() ||
              (useManualInput ? !manualContent.trim() : !file)
            }
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
