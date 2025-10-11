-- Create triggers for post comment count updates
CREATE TRIGGER post_comment_count_trigger
AFTER INSERT OR DELETE ON public.post_comments
FOR EACH ROW
EXECUTE FUNCTION public.update_post_comment_count();

-- Create triggers for reel comment count updates  
CREATE TRIGGER reel_comment_count_trigger
AFTER INSERT OR DELETE ON public.reel_comments
FOR EACH ROW
EXECUTE FUNCTION public.update_reel_comment_count();