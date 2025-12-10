-- Create triggers for post_comments
CREATE TRIGGER on_post_comment_insert
AFTER INSERT ON public.post_comments
FOR EACH ROW
EXECUTE FUNCTION public.update_post_comment_count();

CREATE TRIGGER on_post_comment_delete
AFTER DELETE ON public.post_comments
FOR EACH ROW
EXECUTE FUNCTION public.update_post_comment_count();

-- Create triggers for reel_comments
CREATE TRIGGER on_reel_comment_insert
AFTER INSERT ON public.reel_comments
FOR EACH ROW
EXECUTE FUNCTION public.update_reel_comment_count();

CREATE TRIGGER on_reel_comment_delete
AFTER DELETE ON public.reel_comments
FOR EACH ROW
EXECUTE FUNCTION public.update_reel_comment_count();