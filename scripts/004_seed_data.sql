-- Seed sample products
INSERT INTO public.products (id, name, description, category, base_price, print_provider, turnaround_days) VALUES
('11111111-1111-1111-1111-111111111111', 'Business Cards', 'Premium business cards with multiple finish options', 'Cards', 49.99, '4over', 3),
('22222222-2222-2222-2222-222222222222', 'Postcards', 'High-quality postcards for direct mail campaigns', 'Cards', 89.99, '4over', 4),
('33333333-3333-3333-3333-333333333333', 'Flyers', 'Eye-catching flyers for promotions and events', 'Marketing', 79.99, '4over', 3),
('44444444-4444-4444-4444-444444444444', 'Brochures', 'Professional tri-fold brochures', 'Marketing', 129.99, '4over', 5),
('55555555-5555-5555-5555-555555555555', 'Posters', 'Large format posters for displays', 'Signage', 39.99, '4over', 4),
('66666666-6666-6666-6666-666666666666', 'Banners', 'Vinyl banners for indoor/outdoor use', 'Signage', 149.99, '4over', 7);

-- Seed product options for business cards
INSERT INTO public.product_options (product_id, option_name, option_value, price_modifier) VALUES
('11111111-1111-1111-1111-111111111111', 'size', '3.5" x 2"', 0.00),
('11111111-1111-1111-1111-111111111111', 'size', '4" x 6"', 15.00),
('11111111-1111-1111-1111-111111111111', 'finish', 'Matte', 0.00),
('11111111-1111-1111-1111-111111111111', 'finish', 'Glossy', 10.00),
('11111111-1111-1111-1111-111111111111', 'finish', 'UV Coating', 25.00),
('11111111-1111-1111-1111-111111111111', 'quantity', '250', 0.00),
('11111111-1111-1111-1111-111111111111', 'quantity', '500', 20.00),
('11111111-1111-1111-1111-111111111111', 'quantity', '1000', 35.00);

-- Seed product options for postcards
INSERT INTO public.product_options (product_id, option_name, option_value, price_modifier) VALUES
('22222222-2222-2222-2222-222222222222', 'size', '4" x 6"', 0.00),
('22222222-2222-2222-2222-222222222222', 'size', '5" x 7"', 20.00),
('22222222-2222-2222-2222-222222222222', 'size', '6" x 9"', 35.00),
('22222222-2222-2222-2222-222222222222', 'finish', 'Matte', 0.00),
('22222222-2222-2222-2222-222222222222', 'finish', 'Glossy', 15.00),
('22222222-2222-2222-2222-222222222222', 'quantity', '500', 0.00),
('22222222-2222-2222-2222-222222222222', 'quantity', '1000', 30.00),
('22222222-2222-2222-2222-222222222222', 'quantity', '2500', 60.00);
