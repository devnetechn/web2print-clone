-- EMERGENCY FIX: every "Admins can ..." policy does
-- (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) - and now
-- that profiles itself has RLS enabled, evaluating THAT subquery requires
-- re-checking profiles' own policies, one of which runs the same
-- subquery again. Infinite recursion, breaking every table that checks
-- is_admin (which is most of them). Standard fix: a SECURITY DEFINER
-- function bypasses RLS for this one lookup, breaking the loop.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE((SELECT is_admin FROM public.profiles WHERE id = auth.uid()), false);
$$;

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
CREATE POLICY "Admins can view all orders"
  ON public.orders FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update all orders" ON public.orders;
CREATE POLICY "Admins can update all orders"
  ON public.orders FOR UPDATE
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can view all order items" ON public.order_items;
CREATE POLICY "Admins can view all order items"
  ON public.order_items FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can manage order items" ON public.order_items;
CREATE POLICY "Admins can manage order items"
  ON public.order_items FOR ALL
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can manage order status logs" ON public.order_status_logs;
CREATE POLICY "Admins can manage order status logs"
  ON public.order_status_logs FOR ALL
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can manage apparel quote requests" ON public.quote_requests;
CREATE POLICY "Admins can manage apparel quote requests"
  ON public.quote_requests FOR ALL
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can manage custom quote requests" ON public.custom_quote_requests;
CREATE POLICY "Admins can manage custom quote requests"
  ON public.custom_quote_requests FOR ALL
  USING (public.is_admin());

DROP POLICY IF EXISTS "Users can view own custom quote requests" ON public.custom_quote_requests;
CREATE POLICY "Users can view own custom quote requests"
  ON public.custom_quote_requests FOR SELECT
  USING (auth.uid() = customer_id);

DROP POLICY IF EXISTS "Admins can manage coupons" ON public.coupons;
CREATE POLICY "Admins can manage coupons"
  ON public.coupons FOR ALL
  USING (public.is_admin());

NOTIFY pgrst, 'reload schema';
