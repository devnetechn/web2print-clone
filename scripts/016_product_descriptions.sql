-- Seed product descriptions sourced from 4over.com category pages
-- Run in Supabase SQL Editor

INSERT INTO product_content (category_slug, description)
VALUES

('business-cards-standard',
 'Help your customers present themselves perfectly with our high-quality Business Cards. 4over''s extensive selection makes it easy to select the ideal Business Card for each customer from our variety of sizes, stocks, finishes, and enhancements. 4over proudly uses WestRock paper.'),

('flyers-and-brochures',
 'Available in a variety of sizes with a wide range of folding options, Flyers and Brochures are ideal for showcasing all types of products and services.'),

('postcards',
 'Printed on premium quality card stock, Postcards are a durable, versatile tool for attracting new business, promoting new deals, and keeping in touch with clients. Stand out in the mail with our next-level range of sizes, stocks and finishes—including the radiance of Majestic options.'),

('trading-cards',
 'Pocket-sized Trading Cards are memorable tokens for customers. Go classic and share player stats (or product details) or get creative with crowdfunding rewards and trade show swag. Share the story of a brand, highlight fun facts, or even use them as event invites or location guides.'),

('presentation-folders',
 'Presentation Folders are the perfect choice for organizing and displaying pertinent information, pricing, and promotional materials for business meetings, conferences, trade shows, and more. Available in a variety of standard and premium stocks.'),

('door-hangers',
 '4over Door Hangers are printed on various durable paper stocks, perfect for at-home or in-room marketing outreach. They allow ample space for text and visuals for maximum marketing impact with great efficiency.'),

('envelopes',
 '4over''s premium quality Envelopes are available in three distinct styles with multiple stock and size options to suit virtually all business needs. We offer both print-and-convert options and imprinting on pre-converted blanks—add variable data addressing for time-saving convenience on envelopes for mailings.'),

('hang-tags',
 'Perfect for apparel and retail products, Hang Tags allow customers to attach essential information to their merchandise. Available in a variety of sizes and stocks to represent the value of any product.'),

('sell-sheets',
 'Premium quality Sell Sheets are ideal for creating lasting impressions. Produced on a variety of durable card stocks, with a wide range of sizes and finishing options.'),

('rack-cards',
 'Rack Cards work well anywhere that gets a lot of foot traffic—tourist centers, hotel lobbies, convenience stores, and expos. They''re the ideal quick pitch for products, services, or events to people on the go.'),

('table-tent-cards',
 'Table Tents ship flat with standard die cuts that make them easy to set up in seconds! Available in two popular sizes with a variety of stocks and finishes.'),

('posters',
 'Posters showcase impactful messaging to reach a wider audience. With a range of sizes and stocks to choose from, you can fill any open ad space with large-scale signage that can''t help but be seen.'),

('tear-off-cards',
 'Tear-off cards combine convenience with impact—perforated sections allow recipients to keep important contact info, coupons, or offers while the main piece does the heavy marketing lifting.'),

('eddm',
 'Every Door Direct Mail (EDDM) is one of the most effective marketing mediums for generating new leads, selling products and services, acquiring new customers, and increasing profitability. We offer the convenience of printing your mailpieces, plus addressing, sorting, and delivering them to the Post Office—so you can focus on your customers.'),

('rigid-signs',
 'Whatever your signage needs, our wide range of Rigid Signs has the perfect option for you—lightweight to durable, promotional to permanent.'),

('outdoor-banners',
 'Outdoor Banners are perfect for when you need marketing that goes the extra mile. Wrapped around fences or draped across storefronts, banners help your customers gain visibility.'),

('indoor-banners',
 'Go bigger and bolder with Indoor Banners! Hang them on walls, punch up POP setups, customize trade show signage—these banners can take it.'),

('flags',
 'Attention-getters for retailers, events, and trade shows, our Flags are produced on premium quality 3oz polyester using superior dye sublimation equipment for long-lasting color. Flags can be folded, stored, and assembled with ease—indoor and outdoor hardware available.'),

('window-graphics',
 'Window Clings and Graphics are produced in a variety of styles, from opaque to clear to see-through, so it''s easy to see what sticks with customers, shoppers, restaurant-goers, and more!'),

('wall-decals',
 'Wall Decals are offered in both low-tack and high-tack adhesive backing to cover a wide variety of potential uses and placements.'),

('displays',
 'From tabletop displays to large fabric tube displays, our trade show and event display solutions help your brand make a statement at any venue. Available in a range of sizes and styles for indoor and outdoor events.'),

('table-covers',
 'Our Table Covers are printed on premium 9oz polyester, using superior quality dye sublimation equipment for the longest-lasting color available. Fully customizable across the entire surface, they add a finished, professional look to table displays, trade show booths, and more.'),

('packaging',
 'Premium custom packaging printed on high-quality card stock, available in a variety of box styles and sizes. Fully customizable to showcase your brand and protect your products in style.'),

('custom-boxes',
 'Print and Trim Boxes are cut and scored after printing, letting you create custom packaging shapes and sizes. Ideal for retail products, gifts, and specialty items requiring a unique unboxing experience.'),

('header-cards',
 'Header Cards are the finishing touch for retail packaging—printed on premium card stock, they display your brand and product information above bagged or carded merchandise.')

ON CONFLICT (category_slug) DO UPDATE
  SET description = EXCLUDED.description,
      updated_at  = NOW();
