import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Briefcase, Calendar, MapPin, ExternalLink, Pencil, Trash2, Plus } from "lucide-react";
import { format } from "date-fns";
import { AddExperienceDialog } from "./AddExperienceDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Experience {
  id: string;
  company_name: string;
  position: string;
  employment_type: string;
  location: string | null;
  is_current: boolean;
  start_date: string;
  end_date: string | null;
  description: string | null;
  skills: string[] | null;
  is_project: boolean;
  project_link: string | null;
}

interface ExperienceTimelineProps {
  experiences: Experience[];
  userId: string;
  onUpdate: () => void;
  isOwnProfile: boolean;
}

export const ExperienceTimeline = ({ experiences, userId, onUpdate, isOwnProfile }: ExperienceTimelineProps) => {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingExperience, setEditingExperience] = useState<Experience | null>(null);

  const calculateDuration = (startDate: string, endDate: string | null, isCurrent: boolean) => {
    const start = new Date(startDate);
    const end = isCurrent ? new Date() : endDate ? new Date(endDate) : new Date();
    
    const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;

    if (years > 0 && remainingMonths > 0) {
      return `${years} yr ${remainingMonths} mo`;
    } else if (years > 0) {
      return `${years} yr`;
    } else {
      return `${remainingMonths} mo`;
    }
  };

  const formatDate = (date: string) => {
    return format(new Date(date), "MMM yyyy");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this experience?")) return;

    try {
      const { error } = await supabase
        .from("work_experiences")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Experience deleted");
      onUpdate();
    } catch (error) {
      console.error("Error deleting experience:", error);
      toast.error("Failed to delete experience");
    }
  };

  const handleEdit = (experience: Experience) => {
    setEditingExperience(experience);
    setShowAddDialog(true);
  };

  const sortedExperiences = [...experiences].sort((a, b) => {
    if (a.is_current && !b.is_current) return -1;
    if (!a.is_current && b.is_current) return 1;
    return new Date(b.start_date).getTime() - new Date(a.start_date).getTime();
  });

  return (
    <div className="space-y-4">
      {isOwnProfile && (
        <Button onClick={() => { setEditingExperience(null); setShowAddDialog(true); }} className="w-full">
          <Plus className="w-4 h-4 mr-2" />
          Add Experience
        </Button>
      )}

      {sortedExperiences.length === 0 ? (
        <div className="glass rounded-xl p-8 text-center border border-border/50">
          <Briefcase className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">
            {isOwnProfile ? "Add your first work experience or project" : "No experience added yet"}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedExperiences.map((exp, index) => (
            <div key={exp.id} className="relative">
              {/* Timeline line */}
              {index < sortedExperiences.length - 1 && (
                <div className="absolute left-5 top-12 bottom-0 w-0.5 bg-border/50" />
              )}

              <div className="glass rounded-xl p-4 border border-border/50 hover:border-primary/30 transition-colors">
                <div className="flex gap-4">
                  {/* Timeline dot */}
                  <div className="flex-shrink-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${exp.is_project ? 'bg-accent/20' : 'bg-primary/20'}`}>
                      <Briefcase className={`w-5 h-5 ${exp.is_project ? 'text-accent' : 'text-primary'}`} />
                    </div>
                  </div>

                  <div className="flex-1 space-y-2">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-bold text-lg">{exp.position}</h3>
                        <p className="text-primary font-medium">{exp.company_name}</p>
                        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mt-1">
                          <span className="glass px-2 py-0.5 rounded text-xs">{exp.employment_type}</span>
                          {exp.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {exp.location}
                            </span>
                          )}
                        </div>
                      </div>

                      {isOwnProfile && (
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" onClick={() => handleEdit(exp)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => handleDelete(exp.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Date */}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {formatDate(exp.start_date)} - {exp.is_current ? "Present" : exp.end_date ? formatDate(exp.end_date) : "N/A"}
                      </span>
                      <span className="text-xs">• {calculateDuration(exp.start_date, exp.end_date, exp.is_current)}</span>
                    </div>

                    {/* Description */}
                    {exp.description && (
                      <p className="text-sm text-muted-foreground whitespace-pre-line">{exp.description}</p>
                    )}

                    {/* Skills */}
                    {exp.skills && exp.skills.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {exp.skills.map((skill) => (
                          <span key={skill} className="glass px-3 py-1 rounded-full text-xs font-medium">
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Project Link */}
                    {exp.is_project && exp.project_link && (
                      <a
                        href={exp.project_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                      >
                        View Project
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <AddExperienceDialog
        open={showAddDialog}
        onOpenChange={(open) => {
          setShowAddDialog(open);
          if (!open) setEditingExperience(null);
        }}
        userId={userId}
        onSuccess={onUpdate}
        editData={editingExperience}
      />
    </div>
  );
};
