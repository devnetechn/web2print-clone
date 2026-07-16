-- Idempotent seed: clear then insert sample data.
TRUNCATE products, categories RESTART IDENTITY CASCADE;

INSERT INTO categories (name, slug, description, image_url) VALUES
  ('Marketing',      'marketing',      'Business cards, flyers, and marketing print', NULL),
  ('Apparel',        'apparel',        'Custom printed shirts and apparel',           NULL),
  ('Signs & Banners','signs-banners',  'Large-format signage and banners',            NULL);

INSERT INTO products (category_id, name, slug, description, base_price, attributes) VALUES
  ((SELECT id FROM categories WHERE slug='marketing'),
    'Business Cards', 'business-cards', 'Premium 16pt business cards', 19.99,
    '{"sizes":["3.5x2"],"paper":["matte","glossy"],"quantities":[100,250,500]}'),
  ((SELECT id FROM categories WHERE slug='marketing'),
    'Flyers', 'flyers', 'Full-color flyers', 39.99,
    '{"sizes":["8.5x11","5.5x8.5"],"paper":["matte","glossy"],"quantities":[50,100,250]}'),
  ((SELECT id FROM categories WHERE slug='apparel'),
    'Custom T-Shirt', 'custom-t-shirt', 'Soft-style printed tee', 14.99,
    '{"sizes":["S","M","L","XL"],"colors":["black","white","navy"]}'),
  ((SELECT id FROM categories WHERE slug='signs-banners'),
    'Vinyl Banner', 'vinyl-banner', '13oz outdoor vinyl banner', 59.99,
    '{"sizes":["2x4","3x6","4x8"],"finish":["grommets","pole-pocket"]}');
