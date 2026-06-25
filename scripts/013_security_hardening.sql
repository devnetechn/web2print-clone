-- ============================================================
-- CRITICAL: profiles / orders / order_items had RLS specified in
-- scripts/002_enable_rls.sql, but that migration was never actually run
-- against this project (it has tables from a different setup path).
-- Confirmed live: an anonymous request with just the public anon key
-- could read every customer's email/phone/is_admin flag from profiles,
-- and every order's customer_email/total from orders, directly via the
-- REST API. This re-applies that missing migration.
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_designs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING ((SELECT is_admin FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
CREATE POLICY "Users can view own orders"
  ON public.orders FOR SELECT
  USING (auth.uid() = customer_id);

DROP POLICY IF EXISTS "Users can create own orders" ON public.orders;
CREATE POLICY "Users can create own orders"
  ON public.orders FOR INSERT
  WITH CHECK (auth.uid() = customer_id);

DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
CREATE POLICY "Admins can view all orders"
  ON public.orders FOR SELECT
  USING ((SELECT is_admin FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Admins can update all orders" ON public.orders;
CREATE POLICY "Admins can update all orders"
  ON public.orders FOR UPDATE
  USING ((SELECT is_admin FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can view own order items" ON public.order_items;
CREATE POLICY "Users can view own order items"
  ON public.order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
      AND orders.customer_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can view all order items" ON public.order_items;
CREATE POLICY "Admins can view all order items"
  ON public.order_items FOR SELECT
  USING ((SELECT is_admin FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Admins can manage order items" ON public.order_items;
CREATE POLICY "Admins can manage order items"
  ON public.order_items FOR ALL
  USING ((SELECT is_admin FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can manage own designs" ON public.saved_designs;
CREATE POLICY "Users can manage own designs"
  ON public.saved_designs FOR ALL
  USING (auth.uid() = user_id);

-- order_status_logs never had a policy anywhere in the codebase - same
-- exposure confirmed live (3 real status-history rows readable by anon).
ALTER TABLE public.order_status_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own order status logs" ON public.order_status_logs;
CREATE POLICY "Users can view own order status logs"
  ON public.order_status_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_status_logs.order_id
      AND orders.customer_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can manage order status logs" ON public.order_status_logs;
CREATE POLICY "Admins can manage order status logs"
  ON public.order_status_logs FOR ALL
  USING ((SELECT is_admin FROM public.profiles WHERE id = auth.uid()));

-- ============================================================
-- quote_requests (legacy apparel quote table) had NO row level security
-- at all - confirmed an anonymous request could read (and previously,
-- update) every row directly via the REST API, exposing customer
-- emails/phone numbers/company names. The app's own admin actions
-- already use the service-role client (bypasses RLS), so these policies
-- only affect direct/anon access.
-- ============================================================
ALTER TABLE public.quote_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can submit an apparel quote request" ON public.quote_requests;
CREATE POLICY "Anyone can submit an apparel quote request"
  ON public.quote_requests FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can manage apparel quote requests" ON public.quote_requests;
CREATE POLICY "Admins can manage apparel quote requests"
  ON public.quote_requests FOR ALL
  USING ((SELECT is_admin FROM public.profiles WHERE id = auth.uid()));

-- Tighten coupons: validateCoupon() now reads via the service-role client,
-- so the public SELECT policy (which exposed inactive/expired codes and
-- usage counts to anyone querying the table directly) is no longer needed.
DROP POLICY IF EXISTS "Anyone can read active coupons" ON public.coupons;

NOTIFY pgrst, 'reload schema';
