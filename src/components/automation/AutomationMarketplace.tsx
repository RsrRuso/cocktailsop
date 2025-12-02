import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Download, Star, Search, TrendingUp, Package } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const AutomationMarketplace = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const { data: templates, isLoading } = useQuery({
    queryKey: ['automation-templates', selectedCategory, searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('automation_templates')
        .select('*')
        .eq('is_public', true);

      if (selectedCategory !== "all") {
        query = query.eq('category', selectedCategory);
      }

      if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query.order('install_count', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const installMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from('automation_template_installs')
        .insert({ template_id: templateId, user_id: user.id });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Template installed successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['automation-templates'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const categories = ["all", "social", "productivity", "data", "notifications", "integrations"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Package className="w-6 h-6 text-primary" />
            Automation Marketplace
          </h2>
          <p className="text-muted-foreground mt-1">
            Discover and install pre-built automation templates
          </p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Category Tabs */}
      <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
        <TabsList>
          {categories.map(cat => (
            <TabsTrigger key={cat} value={cat} className="capitalize">
              {cat}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={selectedCategory} className="mt-6">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <Card key={i} className="p-6 animate-pulse">
                  <div className="h-4 bg-muted rounded w-3/4 mb-4" />
                  <div className="h-3 bg-muted rounded w-full mb-2" />
                  <div className="h-3 bg-muted rounded w-2/3" />
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates?.map(template => (
                <Card key={template.id} className="p-6 hover:shadow-lg transition-all">
                  <div className="flex items-start justify-between mb-3">
                    <Badge variant="secondary" className="capitalize">
                      {template.category}
                    </Badge>
                    <div className="flex items-center gap-1 text-sm">
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      <span className="font-medium">{template.rating.toFixed(1)}</span>
                    </div>
                  </div>

                  <h3 className="font-semibold text-lg mb-2">{template.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {template.description}
                  </p>

                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <TrendingUp className="w-4 h-4" />
                      <span>{template.install_count} installs</span>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => installMutation.mutate(template.id)}
                      disabled={installMutation.isPending}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Install
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {!isLoading && (!templates || templates.length === 0) && (
            <Card className="p-12 text-center">
              <Package className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Templates Found</h3>
              <p className="text-muted-foreground">
                Try adjusting your search or browse different categories
              </p>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};