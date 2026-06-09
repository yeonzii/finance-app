-- ================================================
-- 공통코드 초기 데이터
-- ID 할당 순서:
--   1-3   대분류    (INCOME=1, EXPENSE=2, INVEST=3)
--   4-6   소득유형  (parentId=1)
--   7-12  비용유형  (parentId=2)
--   13-14 투자유형  (parentId=3)
--   15-18 기관유형  (CARD_CO=15, INS_CO=16, BANK=17, BROK=18)
--   19-24 카드사    (parentId=15)
--   25-28 보험사    (parentId=16)
--   29-33 은행      (parentId=17)
--   34-35 증권사    (parentId=18)
-- ================================================

-- 1. 대분류
INSERT IGNORE INTO common_codes (code_group, parent_id, code_val, code_name, sort_order, del_yn)
VALUES ('대분류', NULL, 'INCOME',  '소득', 1, 'N');   -- id=1
INSERT IGNORE INTO common_codes (code_group, parent_id, code_val, code_name, sort_order, del_yn)
VALUES ('대분류', NULL, 'EXPENSE', '비용', 2, 'N');   -- id=2
INSERT IGNORE INTO common_codes (code_group, parent_id, code_val, code_name, sort_order, del_yn)
VALUES ('대분류', NULL, 'INVEST',  '투자', 3, 'N');   -- id=3

-- 2. 소득유형 (parentId=1 = 소득)
INSERT IGNORE INTO common_codes (code_group, parent_id, code_val, code_name, sort_order, del_yn)
VALUES ('소득유형', 1, 'SALARY',   '급여',     1, 'N');  -- id=4
INSERT IGNORE INTO common_codes (code_group, parent_id, code_val, code_name, sort_order, del_yn)
VALUES ('소득유형', 1, 'INTEREST', '이자소득', 2, 'N');  -- id=5
INSERT IGNORE INTO common_codes (code_group, parent_id, code_val, code_name, sort_order, del_yn)
VALUES ('소득유형', 1, 'DIVIDEND', '배당소득', 3, 'N');  -- id=6

-- 3. 비용유형 (parentId=2 = 비용)
INSERT IGNORE INTO common_codes (code_group, parent_id, code_val, code_name, sort_order, del_yn)
VALUES ('비용유형', 2, 'COMM',     '통신비',     1, 'N');  -- id=7
INSERT IGNORE INTO common_codes (code_group, parent_id, code_val, code_name, sort_order, del_yn)
VALUES ('비용유형', 2, 'MGMT',     '관리비/세금', 2, 'N'); -- id=8
INSERT IGNORE INTO common_codes (code_group, parent_id, code_val, code_name, sort_order, del_yn)
VALUES ('비용유형', 2, 'INSUR',    '보험비',     3, 'N');  -- id=9
INSERT IGNORE INTO common_codes (code_group, parent_id, code_val, code_name, sort_order, del_yn)
VALUES ('비용유형', 2, 'SUBS',     '정기구독',   4, 'N');  -- id=10
INSERT IGNORE INTO common_codes (code_group, parent_id, code_val, code_name, sort_order, del_yn)
VALUES ('비용유형', 2, 'CARD_PAY', '카드값',     5, 'N');  -- id=11
INSERT IGNORE INTO common_codes (code_group, parent_id, code_val, code_name, sort_order, del_yn)
VALUES ('비용유형', 2, 'ETC',      '기타',       6, 'N');  -- id=12

-- 4. 투자유형 (parentId=3 = 투자)
INSERT IGNORE INTO common_codes (code_group, parent_id, code_val, code_name, sort_order, del_yn)
VALUES ('투자유형', 3, 'DIV_INVEST', '배당투자', 1, 'N'); -- id=13
INSERT IGNORE INTO common_codes (code_group, parent_id, code_val, code_name, sort_order, del_yn)
VALUES ('투자유형', 3, 'PENSION',    '퇴직연금', 2, 'N'); -- id=14

-- 5. 기관유형 최상위
INSERT IGNORE INTO common_codes (code_group, parent_id, code_val, code_name, sort_order, del_yn)
VALUES ('기관유형', NULL, 'CARD_CO', '카드사', 1, 'N'); -- id=15
INSERT IGNORE INTO common_codes (code_group, parent_id, code_val, code_name, sort_order, del_yn)
VALUES ('기관유형', NULL, 'INS_CO',  '보험사', 2, 'N'); -- id=16
INSERT IGNORE INTO common_codes (code_group, parent_id, code_val, code_name, sort_order, del_yn)
VALUES ('기관유형', NULL, 'BANK',    '은행',   3, 'N'); -- id=17
INSERT IGNORE INTO common_codes (code_group, parent_id, code_val, code_name, sort_order, del_yn)
VALUES ('기관유형', NULL, 'BROK',    '증권사', 4, 'N'); -- id=18

-- 6. 카드사 (parentId=15 = CARD_CO)
INSERT IGNORE INTO common_codes (code_group, parent_id, code_val, code_name, sort_order, del_yn)
VALUES ('카드사', 15, 'SAMSUNG_CARD', '삼성카드', 1, 'N'); -- id=19
INSERT IGNORE INTO common_codes (code_group, parent_id, code_val, code_name, sort_order, del_yn)
VALUES ('카드사', 15, 'SHINHAN_CARD', '신한카드', 2, 'N'); -- id=20
INSERT IGNORE INTO common_codes (code_group, parent_id, code_val, code_name, sort_order, del_yn)
VALUES ('카드사', 15, 'HYUNDAI_CARD', '현대카드', 3, 'N'); -- id=21
INSERT IGNORE INTO common_codes (code_group, parent_id, code_val, code_name, sort_order, del_yn)
VALUES ('카드사', 15, 'KOOKMIN_CARD', '국민카드', 4, 'N'); -- id=22
INSERT IGNORE INTO common_codes (code_group, parent_id, code_val, code_name, sort_order, del_yn)
VALUES ('카드사', 15, 'BC_CARD',      '비씨카드', 5, 'N'); -- id=23
INSERT IGNORE INTO common_codes (code_group, parent_id, code_val, code_name, sort_order, del_yn)
VALUES ('카드사', 15, 'HANA_CARD',    '하나카드', 6, 'N'); -- id=24

-- 7. 보험사 (parentId=16 = INS_CO)
INSERT IGNORE INTO common_codes (code_group, parent_id, code_val, code_name, sort_order, del_yn)
VALUES ('보험사', 16, 'SAMSUNG_FIRE', '삼성화재',   1, 'N'); -- id=25
INSERT IGNORE INTO common_codes (code_group, parent_id, code_val, code_name, sort_order, del_yn)
VALUES ('보험사', 16, 'HYUNDAI_INS',  '현대해상',   2, 'N'); -- id=26
INSERT IGNORE INTO common_codes (code_group, parent_id, code_val, code_name, sort_order, del_yn)
VALUES ('보험사', 16, 'DONGYANG',     '동양생명',   3, 'N'); -- id=27
INSERT IGNORE INTO common_codes (code_group, parent_id, code_val, code_name, sort_order, del_yn)
VALUES ('보험사', 16, 'DB_INS',       'DB손해보험', 4, 'N'); -- id=28

-- 8. 은행 (parentId=17 = BANK)
INSERT IGNORE INTO common_codes (code_group, parent_id, code_val, code_name, sort_order, del_yn)
VALUES ('은행', 17, 'WOORI',     '우리은행',       1, 'N'); -- id=29
INSERT IGNORE INTO common_codes (code_group, parent_id, code_val, code_name, sort_order, del_yn)
VALUES ('은행', 17, 'SHINHAN',   '신한은행',       2, 'N'); -- id=30
INSERT IGNORE INTO common_codes (code_group, parent_id, code_val, code_name, sort_order, del_yn)
VALUES ('은행', 17, 'OKAY_SAVE', '오케이저축은행', 3, 'N'); -- id=31
INSERT IGNORE INTO common_codes (code_group, parent_id, code_val, code_name, sort_order, del_yn)
VALUES ('은행', 17, 'DAESHIN',   '대신저축은행',   4, 'N'); -- id=32
INSERT IGNORE INTO common_codes (code_group, parent_id, code_val, code_name, sort_order, del_yn)
VALUES ('은행', 17, 'SAEMAUL',   '새마을금고',     5, 'N'); -- id=33

-- 9. 증권사 (parentId=18 = BROK)
INSERT IGNORE INTO common_codes (code_group, parent_id, code_val, code_name, sort_order, del_yn)
VALUES ('증권사', 18, 'MIRAE', '미래에셋', 1, 'N'); -- id=34
INSERT IGNORE INTO common_codes (code_group, parent_id, code_val, code_name, sort_order, del_yn)
VALUES ('증권사', 18, 'TOSS',  '토스',     2, 'N'); -- id=35
