import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  File,
  Folder,
  Upload,
  Search,
  Grid,
  List,
  Download,
  Share2,
  Trash2,
  FileText,
  Image as ImageIcon,
  Video,
  Archive,
} from "lucide-react";
import { format } from "date-fns";

interface Document {
  id: string;
  name: string;
  file_type: string;
  file_size: number;
  file_url: string;
  is_folder: boolean;
  created_at: string;
  tags: string[];
}

export default function Documents() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchDocuments();
  }, [user, navigate]);

  const fetchDocuments = async () => {
    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .eq("folder_id", null)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch documents:", error);
      return;
    }

    setDocuments(data || []);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setFileName(file.name);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !user) return;

    const fileExt = selectedFile.name.split(".").pop();
    const filePath = `${user.id}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(filePath, selectedFile);

    if (uploadError) {
      toast.error("Failed to upload file");
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("documents")
      .getPublicUrl(filePath);

    const { error: dbError } = await supabase.from("documents").insert({
      user_id: user.id,
      name: fileName,
      file_type: selectedFile.type,
      file_size: selectedFile.size,
      file_url: publicUrl,
      is_folder: false,
    });

    if (dbError) {
      toast.error("Failed to save document");
      return;
    }

    toast.success("Document uploaded successfully");
    setUploadDialogOpen(false);
    setSelectedFile(null);
    setFileName("");
    fetchDocuments();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return <ImageIcon className="w-8 h-8" />;
    if (type.startsWith("video/")) return <Video className="w-8 h-8" />;
    if (type.includes("pdf")) return <FileText className="w-8 h-8" />;
    if (type.includes("zip") || type.includes("rar")) return <Archive className="w-8 h-8" />;
    return <File className="w-8 h-8" />;
  };

  const filteredDocuments = documents.filter((doc) =>
    doc.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <TopNav />

      <div className="container mx-auto pt-20 pb-20 px-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Documents</h1>
            <p className="text-muted-foreground">Manage and share your files</p>
          </div>
          <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Upload className="w-4 h-4 mr-2" />
                Upload
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload Document</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Select File</Label>
                  <Input type="file" onChange={handleFileSelect} />
                </div>
                <div>
                  <Label>File Name</Label>
                  <Input
                    value={fileName}
                    onChange={(e) => setFileName(e.target.value)}
                    placeholder="Document name"
                  />
                </div>
                <Button onClick={handleUpload} disabled={!selectedFile} className="w-full">
                  Upload Document
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search documents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant={viewMode === "grid" ? "secondary" : "ghost"}
                  size="icon"
                  onClick={() => setViewMode("grid")}
                >
                  <Grid className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "secondary" : "ghost"}
                  size="icon"
                  onClick={() => setViewMode("list")}
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {filteredDocuments.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Folder className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No documents yet</h3>
              <p className="text-muted-foreground mb-4">Upload your first document to get started</p>
              <Button onClick={() => setUploadDialogOpen(true)}>
                <Upload className="w-4 h-4 mr-2" />
                Upload Document
              </Button>
            </CardContent>
          </Card>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredDocuments.map((doc) => (
              <Card key={doc.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex flex-col items-center text-center">
                    <div className="p-4 rounded-lg bg-muted mb-3">
                      {doc.is_folder ? <Folder className="w-8 h-8" /> : getFileIcon(doc.file_type)}
                    </div>
                    <h4 className="font-semibold truncate w-full mb-1">{doc.name}</h4>
                    <p className="text-xs text-muted-foreground mb-2">
                      {format(new Date(doc.created_at), "MMM d, yyyy")}
                    </p>
                    {!doc.is_folder && (
                      <Badge variant="outline" className="text-xs">
                        {formatFileSize(doc.file_size)}
                      </Badge>
                    )}
                    <div className="flex gap-1 mt-3">
                      <Button size="sm" variant="ghost">
                        <Download className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="ghost">
                        <Share2 className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="ghost">
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {filteredDocuments.map((doc) => (
                  <div key={doc.id} className="p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-muted">
                        {doc.is_folder ? <Folder className="w-5 h-5" /> : getFileIcon(doc.file_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold truncate">{doc.name}</h4>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                          <span>{format(new Date(doc.created_at), "MMM d, yyyy")}</span>
                          {!doc.is_folder && <span>{formatFileSize(doc.file_size)}</span>}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost">
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost">
                          <Share2 className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
