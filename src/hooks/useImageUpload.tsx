import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useImageUpload = () => {
  const uploadAvatar = async (file: File, userId: string): Promise<string | null> => {
    try {
      // Validate file type and size
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        toast.error("Invalid file type. Please upload JPEG, PNG, WebP, or GIF");
        return null;
      }
      
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        toast.error("File too large. Maximum size is 5MB");
        return null;
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          upsert: true,
        });

      if (error) {
        toast.error("Failed to upload avatar");
        return null;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(data.path);

      return publicUrl;
    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast.error("Failed to upload avatar");
      return null;
    }
  };

  const uploadCover = async (file: File, userId: string): Promise<string | null> => {
    try {
      // Validate file type and size
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        toast.error("Invalid file type. Please upload JPEG, PNG, or WebP");
        return null;
      }
      
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        toast.error("File too large. Maximum size is 10MB");
        return null;
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('covers')
        .upload(fileName, file, {
          upsert: true,
        });

      if (error) {
        toast.error("Failed to upload cover photo");
        return null;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('covers')
        .getPublicUrl(data.path);

      return publicUrl;
    } catch (error) {
      console.error("Error uploading cover:", error);
      toast.error("Failed to upload cover photo");
      return null;
    }
  };

  return { uploadAvatar, uploadCover };
};
