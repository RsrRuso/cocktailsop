import { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { 
  Search, Filter, ArrowUpDown, Copy, Trash2, Edit3, 
  Download, Upload, History, Grid3x3, List,
  Star, Archive, Tag, Share2, MoreHorizontal,
  Undo2, Redo2, Command, Lock
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface EditItem {
  id: string;
  title: string;
  category: string;
  type: string;
  status: "draft" | "published" | "archived";
  modified: string;
  favorite: boolean;
  locked: boolean;
  tags: string[];
  thumbnail?: string;
}

const AdvancedEditor = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const toolType = searchParams.get("type") || "recipe";

  const [items, setItems] = useState<EditItem[]>([
    {
      id: "1",
      title: "Classic Negroni",
      category: "Cocktails",
      type: "recipe",
      status: "published",
      modified: "2 hours ago",
      favorite: true,
      locked: false,
      tags: ["classic", "gin", "bitter"],
    },
    {
      id: "2",
      title: "Espresso Martini",
      category: "Cocktails",
      type: "recipe",
      status: "draft",
      modified: "5 hours ago",
      favorite: false,
      locked: false,
      tags: ["vodka", "coffee", "modern"],
    },
    {
      id: "3",
      title: "Grey Goose Vodka 750ml",
      category: "Spirits",
      type: "inventory",
      status: "published",
      modified: "1 day ago",
      favorite: false,
      locked: true,
      tags: ["vodka", "premium"],
    },
  ]);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [filterStatus, setFilterStatus] = useState<string[]>(["published", "draft"]);
  const [sortBy, setSortBy] = useState<"modified" | "title" | "category">("modified");
  const [undoStack, setUndoStack] = useState<EditItem[][]>([]);
  const [redoStack, setRedoStack] = useState<EditItem[][]>([]);

  const filteredItems = useMemo(() => {
    return items
      .filter((item) => {
        const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchesStatus = filterStatus.includes(item.status);
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === "title") return a.title.localeCompare(b.title);
        if (sortBy === "category") return a.category.localeCompare(b.category);
        return 0; // modified (keep original order)
      });
  }, [items, searchQuery, filterStatus, sortBy]);

  const selectedCount = selectedIds.size;
  const allSelected = filteredItems.length > 0 && selectedIds.size === filteredItems.length;

  const saveToHistory = () => {
    setUndoStack([...undoStack, [...items]]);
    setRedoStack([]);
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setRedoStack([...redoStack, [...items]]);
    setItems(previous);
    setUndoStack(undoStack.slice(0, -1));
    toast.success("Undo successful");
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack([...undoStack, [...items]]);
    setItems(next);
    setRedoStack(redoStack.slice(0, -1));
    toast.success("Redo successful");
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredItems.map(item => item.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const bulkAction = (action: string) => {
    saveToHistory();
    const selectedItems = items.filter(item => selectedIds.has(item.id));
    
    switch (action) {
      case "delete":
        setItems(items.filter(item => !selectedIds.has(item.id)));
        toast.success(`Deleted ${selectedCount} items`);
        break;
      case "archive":
        setItems(items.map(item => 
          selectedIds.has(item.id) ? { ...item, status: "archived" as const } : item
        ));
        toast.success(`Archived ${selectedCount} items`);
        break;
      case "publish":
        setItems(items.map(item => 
          selectedIds.has(item.id) ? { ...item, status: "published" as const } : item
        ));
        toast.success(`Published ${selectedCount} items`);
        break;
      case "favorite":
        setItems(items.map(item => 
          selectedIds.has(item.id) ? { ...item, favorite: !item.favorite } : item
        ));
        toast.success(`Toggled favorite for ${selectedCount} items`);
        break;
      case "lock":
        setItems(items.map(item => 
          selectedIds.has(item.id) ? { ...item, locked: !item.locked } : item
        ));
        toast.success(`Toggled lock for ${selectedCount} items`);
        break;
      case "duplicate":
        const duplicates = selectedItems.map(item => ({
          ...item,
          id: `${item.id}-copy-${Date.now()}`,
          title: `${item.title} (Copy)`,
          status: "draft" as const,
        }));
        setItems([...items, ...duplicates]);
        toast.success(`Duplicated ${selectedCount} items`);
        break;
      case "export":
        toast.success(`Exported ${selectedCount} items`);
        break;
    }
    setSelectedIds(new Set());
  };

  return (
    <div className="min-h-screen bg-background pb-20 pt-16">
      <TopNav />

      <div className="px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Advanced Editor
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Professional editing tools for your operations
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handleUndo}
              disabled={undoStack.length === 0}
            >
              <Undo2 className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleRedo}
              disabled={redoStack.length === 0}
            >
              <Redo2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="glass rounded-2xl p-4 space-y-4">
          {/* Search and View Toggle */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search items, tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <Filter className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  checked={filterStatus.includes("published")}
                  onCheckedChange={(checked) => {
                    setFilterStatus(checked 
                      ? [...filterStatus, "published"]
                      : filterStatus.filter(s => s !== "published")
                    );
                  }}
                >
                  Published
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={filterStatus.includes("draft")}
                  onCheckedChange={(checked) => {
                    setFilterStatus(checked 
                      ? [...filterStatus, "draft"]
                      : filterStatus.filter(s => s !== "draft")
                    );
                  }}
                >
                  Draft
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={filterStatus.includes("archived")}
                  onCheckedChange={(checked) => {
                    setFilterStatus(checked 
                      ? [...filterStatus, "archived"]
                      : filterStatus.filter(s => s !== "archived")
                    );
                  }}
                >
                  Archived
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <ArrowUpDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Sort By</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setSortBy("modified")}>
                  Last Modified
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy("title")}>
                  Title
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy("category")}>
                  Category
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
            >
              {viewMode === "grid" ? <List className="w-4 h-4" /> : <Grid3x3 className="w-4 h-4" />}
            </Button>
          </div>

          {/* Bulk Actions Bar */}
          {selectedCount > 0 && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/10 border border-primary/20">
              <Checkbox
                checked={allSelected}
                onCheckedChange={toggleSelectAll}
              />
              <span className="text-sm font-medium">
                {selectedCount} selected
              </span>
              <div className="flex-1" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => bulkAction("favorite")}
              >
                <Star className="w-4 h-4 mr-2" />
                Favorite
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => bulkAction("lock")}
              >
                <Lock className="w-4 h-4 mr-2" />
                Lock
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => bulkAction("publish")}
              >
                <Upload className="w-4 h-4 mr-2" />
                Publish
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => bulkAction("duplicate")}
              >
                <Copy className="w-4 h-4 mr-2" />
                Duplicate
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => bulkAction("export")}
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => bulkAction("archive")}>
                    <Archive className="w-4 h-4 mr-2" />
                    Archive
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => bulkAction("delete")}
                    className="text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        {/* Items Grid/List */}
        <div className={cn(
          viewMode === "grid" 
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            : "space-y-3"
        )}>
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className={cn(
                "glass rounded-xl p-4 hover:shadow-lg transition-all cursor-pointer group",
                selectedIds.has(item.id) && "ring-2 ring-primary"
              )}
              onClick={(e) => {
                if (e.target instanceof HTMLInputElement) return;
                toggleSelect(item.id);
              }}
            >
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={selectedIds.has(item.id)}
                  onCheckedChange={() => toggleSelect(item.id)}
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {item.favorite && (
                          <Star className="w-3.5 h-3.5 fill-yellow-500 text-yellow-500" />
                        )}
                        {item.locked && (
                          <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                        )}
                        <h3 className="font-semibold truncate">{item.title}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {item.category} • {item.modified}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={
                          item.status === "published" ? "default" :
                          item.status === "draft" ? "secondary" : "outline"
                        }>
                          {item.status}
                        </Badge>
                        {item.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Edit3 className="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Copy className="w-4 h-4 mr-2" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Share2 className="w-4 h-4 mr-2" />
                          Share
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <History className="w-4 h-4 mr-2" />
                          Version History
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredItems.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No items found</p>
          </div>
        )}

        {/* Keyboard Shortcuts Info */}
        <div className="glass rounded-xl p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Command className="w-4 h-4" />
            Keyboard Shortcuts
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-1 rounded bg-muted">Ctrl+A</kbd>
              <span className="text-muted-foreground">Select All</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-1 rounded bg-muted">Ctrl+Z</kbd>
              <span className="text-muted-foreground">Undo</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-1 rounded bg-muted">Ctrl+Y</kbd>
              <span className="text-muted-foreground">Redo</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-1 rounded bg-muted">Delete</kbd>
              <span className="text-muted-foreground">Delete Selected</span>
            </div>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default AdvancedEditor;
