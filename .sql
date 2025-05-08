-- 查询所有关联数据
SELECT
    store.id AS '店铺ID',
    CASE
        WHEN store.brand = 1 THEN '小铁'
        WHEN store.brand = 2 THEN 'KO'
        WHEN store.brand = 3 THEN '麻利友'
        WHEN store.brand = 4 THEN '小野'
        WHEN store.brand = 5 THEN '碰碰侠'
        ELSE '未知品牌'
    END AS 品牌名,
    store.city AS '城市',
    store.name AS '店名',
    store.address AS '店铺地址',
    tb.id AS '台桌ID',
    tb.address AS '台桌',
    tb.type AS '台桌类型',
--     use_time AS '使用时间',
    strftime('%Y-%m-%d %H:%M', datetime(appoint.use_time, 'unixepoch', 'localtime')) AS '使用时间',
    duration AS '持续时间'
FROM store
JOIN store_table tb ON store.id = tb.store_id
JOIN appoint_record appoint ON tb.id = appoint.table_id AND tb.store_id=appoint.store_id
