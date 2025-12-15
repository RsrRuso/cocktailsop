-- Create reservations table for SevenRooms-style management
CREATE TABLE public.lab_ops_reservations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  outlet_id UUID NOT NULL REFERENCES public.lab_ops_outlets(id) ON DELETE CASCADE,
  table_id UUID REFERENCES public.lab_ops_tables(id) ON DELETE SET NULL,
  guest_name TEXT NOT NULL,
  guest_phone TEXT,
  guest_email TEXT,
  party_size INTEGER NOT NULL DEFAULT 2,
  reservation_date DATE NOT NULL,
  reservation_time TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'seated', 'completed', 'left', 'cancelled', 'no_show')),
  notes TEXT,
  special_requests TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  seated_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.lab_ops_reservations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view reservations" ON public.lab_ops_reservations
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert reservations" ON public.lab_ops_reservations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update reservations" ON public.lab_ops_reservations
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete reservations" ON public.lab_ops_reservations
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- Create index for better performance
CREATE INDEX idx_lab_ops_reservations_outlet ON public.lab_ops_reservations(outlet_id);
CREATE INDEX idx_lab_ops_reservations_date ON public.lab_ops_reservations(reservation_date);
CREATE INDEX idx_lab_ops_reservations_status ON public.lab_ops_reservations(status);

-- Add trigger for updated_at
CREATE TRIGGER update_lab_ops_reservations_updated_at
  BEFORE UPDATE ON public.lab_ops_reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();