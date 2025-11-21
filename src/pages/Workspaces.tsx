import { useState } from 'react';
import { useWorkspace } from '@/hooks/useWorkspace';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Building2, Plus, Users, Check } from 'lucide-react';
import { toast } from 'sonner';
import TopNav from '@/components/TopNav';
import BottomNav from '@/components/BottomNav';

const Workspaces = () => {
  const { workspaces, currentWorkspace, switchWorkspace, createWorkspace, isLoading } = useWorkspace();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [newWorkspaceDescription, setNewWorkspaceDescription] = useState('');

  const handleCreateWorkspace = async () => {
    if (!newWorkspaceName.trim()) {
      toast.error('Please enter a workspace name');
      return;
    }

    const workspace = await createWorkspace(newWorkspaceName, newWorkspaceDescription);
    if (workspace) {
      toast.success('Workspace created successfully');
      setIsCreateDialogOpen(false);
      setNewWorkspaceName('');
      setNewWorkspaceDescription('');
    } else {
      toast.error('Failed to create workspace');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <TopNav />
        <div className="flex items-center justify-center h-[calc(100vh-120px)]">
          <p className="text-muted-foreground">Loading workspaces...</p>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <TopNav />
      
      <div className="container max-w-6xl mx-auto p-4 pt-20">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Workspaces</h1>
            <p className="text-muted-foreground mt-1">Create and manage your workspaces</p>
          </div>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                New Workspace
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Workspace</DialogTitle>
                <DialogDescription>
                  Create a workspace to organize your team and inventory
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Workspace Name</Label>
                  <Input
                    id="name"
                    value={newWorkspaceName}
                    onChange={(e) => setNewWorkspaceName(e.target.value)}
                    placeholder="e.g., Main Kitchen, Bar Team"
                  />
                </div>
                
                <div>
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    value={newWorkspaceDescription}
                    onChange={(e) => setNewWorkspaceDescription(e.target.value)}
                    placeholder="Describe the purpose of this workspace"
                    rows={3}
                  />
                </div>
                
                <Button onClick={handleCreateWorkspace} className="w-full">
                  Create Workspace
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {workspaces.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Building2 className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Workspaces Yet</h3>
              <p className="text-muted-foreground text-center mb-4">
                Create your first workspace to get started
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Workspace
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {workspaces.map((workspace) => (
              <Card 
                key={workspace.id}
                className={`cursor-pointer transition-all hover:shadow-lg ${
                  currentWorkspace?.id === workspace.id ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => switchWorkspace(workspace.id)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <Building2 className="w-8 h-8 text-primary" />
                    {currentWorkspace?.id === workspace.id && (
                      <div className="bg-primary text-primary-foreground rounded-full p-1">
                        <Check className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                  <CardTitle className="mt-2">{workspace.name}</CardTitle>
                  {workspace.description && (
                    <CardDescription>{workspace.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Users className="w-4 h-4 mr-2" />
                    <span>Team workspace</span>
                  </div>
                  {currentWorkspace?.id === workspace.id && (
                    <div className="mt-3 text-sm font-medium text-primary">
                      Currently Active
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>About Workspaces</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>• Workspaces help you organize inventory, teams, and stores</p>
            <p>• Each workspace has its own team members and permissions</p>
            <p>• Switch between workspaces to manage different locations or teams</p>
            <p>• Invite team members to specific workspaces</p>
          </CardContent>
        </Card>
      </div>

      <BottomNav />
    </div>
  );
};

export default Workspaces;
