-- Seed product descriptions for Roll Labels & Stickers + Promo Products
-- Sourced from 4over.com category pages
-- Run in Supabase SQL Editor

INSERT INTO product_content (category_slug, description)
VALUES

-- Roll Labels & Stickers
('roll-labels',
 'Roll Labels offer full-color impact that sticks around. Perfect for a variety of packaging and promotional needs, our Roll Labels have a permanent adhesive that sticks to many different surfaces. Use as content labels, print labels, packaging seals, and more. White ink is offered as a fifth color option on Clear BOPP and bright silver metallic substrates.'),

('stickers', 
 'Our Custom Stickers have a permanent adhesive on paper material with slit backing—easy to peel and stick on a variety of clean flat surfaces. Ideal for use as product labels, box and envelope seals, and promotional campaigns. Add Akuafoil to achieve glittering multi-color foils for high-end appeal!'),

-- Promo Products
('t-shirts',
 'Spark conversations and raise brand awareness with custom T-Shirts! Great for gifts, giveaways, employee or team uniforms, and commemorative souvenirs. To see more promo products, visit Promo.4over.com.'),

('tote-bags',
 'Custom Tote Bags are a practical, eco-friendly promotional item that keeps your brand in front of customers every day. Printed on durable cotton canvas, they''re perfect for retail, events, and branded giveaways. To see more promo products, visit Promo.4over.com.'),

('mugs',
 'Custom printed Mugs put your brand in customers'' hands every morning. Available in popular 11oz and 15oz white ceramic styles with full-color sublimation printing for vibrant, long-lasting designs. To see more promo products, visit Promo.4over.com.'),

('buttons',
 'Promotional Buttons are a fun, affordable way to spread your message. Available in a variety of sizes and shapes—perfect for campaigns, events, and brand awareness. Produced locally with low minimum quantities. To see more promo products, visit Promo.4over.com.')

ON CONFLICT (category_slug) DO UPDATE
  SET description = EXCLUDED.description,
      updated_at  = NOW();
