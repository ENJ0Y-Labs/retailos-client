-- Optional demo data. Run only after db/schema.sql and only if you want sample products.
insert into products(name,category,selling_price,cost_price,stock_quantity)
select * from (values
 ('Coca-Cola','Beverages',1500,1100,20),
 ('Bread','Bakery',2250,1700,15),
 ('Rice 5kg','Groceries',3000,2450,12),
 ('Milk','Dairy',3750,3000,10),
 ('Biscuits','Snacks',4500,3500,14),
 ('Water','Beverages',5250,4000,0)
) as v(name,category,selling_price,cost_price,stock_quantity)
where not exists (select 1 from products p where lower(p.name)=lower(v.name) and p.active=true);
