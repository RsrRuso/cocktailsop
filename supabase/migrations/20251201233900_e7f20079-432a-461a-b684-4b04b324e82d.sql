-- Add RLS policy for order_items to allow sellers to view their order items
CREATE POLICY "Sellers can view order items for their orders" 
ON public.order_items 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM public.orders 
    WHERE orders.id = order_items.order_id 
    AND orders.seller_id = auth.uid()
  )
);