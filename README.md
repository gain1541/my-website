# 아기쇼핑 가격비교

육아용품(기저귀·분유·물티슈 등)의 쇼핑몰별 가격과 과거 가격 추이를 비교하는 정적 웹사이트입니다. PC·모바일 반응형입니다.

## 구조
- `index.html`, `css/style.css`, `js/app.js`: 화면
- `data/products.json`: 제품·브랜드·가격 데이터
- `data/prices_template.csv`: 가격 입력용 템플릿
- `scripts/gen_sample.js`: 샘플 데이터 생성
- `scripts/import_csv.js`: 실제 가격 CSV 반영

## 가격 판단 기준
쇼핑몰별 최저가를 주 단위로 모아 최근 26주 평균과 비교합니다. 5% 이상 낮으면 저렴, 5% 이상 높으면 비쌈, 그 사이는 보통입니다. 기록이 4주 미만이면 **판단 보류**로 표시합니다.

## 실제 가격 넣기
1. `data/prices_template.csv`를 엑셀/구글시트로 열어 `price` 열을 채웁니다. (날짜는 확인한 날짜로 수정, 제품명 열은 참고용)
2. 저장한 CSV를 반영합니다.
```bash
node scripts/import_csv.js prices.csv
```
CSV 형식: `date,productId,shop,price` (헤더 포함, 예: `2026-11-30,p001,쿠팡,24900`). 같은 날짜에 다시 넣으면 덮어씁니다. 새 날짜는 자동으로 추가되며, 과거 날짜 삽입은 지원하지 않습니다.

가격이 입력되지 않은 제품은 "가격 수집 전"으로 표시됩니다.

## 제품 목록 바꾸기
- `data/products.json`의 `products`를 직접 수정하거나,
- `scripts/gen_sample.js`의 목록을 고친 뒤 `node scripts/gen_sample.js --empty`로 제품 목록과 CSV 템플릿을 다시 만드세요. (가격 데이터가 이미 있다면 덮어쓰이니 주의)
- `node scripts/gen_sample.js`(옵션 없음)는 화면 확인용 가상 가격 샘플을 만듭니다.

> 제품명·브랜드 설명·가격대(상/중/가성비)는 후보 초안입니다. 공개 전에 실제 판매 제품과 맞는지 확인해 수정하세요.

## 로컬 실행
```bash
python3 -m http.server 8000
```
`http://localhost:8000` 접속 (파일을 직접 열면 데이터를 불러오지 못합니다.)

## 배포
GitHub 저장소 Settings → Pages에서 브랜치 `main`, 폴더 `/ (root)`를 선택하세요.
