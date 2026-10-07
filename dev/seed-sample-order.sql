do $$
declare
  sample_order_id uuid;
begin
  insert into public.orders (
    shop_id,
    order_number,
    customer_name,
    customer_email,
    customer_phone,
    delivery_address,
    delivery_city,
    delivery_postal_code,
    delivery_note,
    payment_method,
    total,
    status
  ) values (
    '00000000-0000-4000-8000-000000000001',
    'PP-DEMO-' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISSMS'),
    'Sample Customer',
    'sample@example.com',
    '555-0100',
    '100 Market Street',
    'San Francisco',
    '94105',
    'Demo order only',
    'cash',
    12.75,
    'pending'
  ) returning id into sample_order_id;

  insert into public.order_items (order_id, product_id, product_name, quantity, unit_price)
  values
    (sample_order_id, 'prod-1', 'Matcha Boba Latte', 1, 6.50),
    (sample_order_id, 'prod-2', 'Classic Brown Sugar Boba', 1, 6.25);
end $$;
