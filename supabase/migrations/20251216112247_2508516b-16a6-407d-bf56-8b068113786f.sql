-- Enable realtime for stories table for instant updates across all devices
ALTER PUBLICATION supabase_realtime ADD TABLE public.stories;