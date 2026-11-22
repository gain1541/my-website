# 아기쇼핑 가격비교

육아용품(기저귀·분유·물티슈 등)의 쇼핑몰별 가격과 과거 가격 추이를 비교하는 정적 웹사이트입니다. PC·모바일 반응형입니다.

## 구조
- `index.html`, `css/style.css`, `js/app.js`: 화면
- `data/products.json`: 제품·브랜드·가격 데이터 (현재는 **가상의 샘플**)
- `scripts/gen_sample.js`: 샘플 데이터 생성
- `scripts/import_csv.js`: 실제 가격 CSV 반영

## 가격 판단 기준
쇼핑몰별 최저가를 주 단위로 모아 최근 26주 평균과 비교합니다. 5% 이상 낮으면 저렴, 5% 이상 높으면 비쌈, 그 사이는 보통입니다.

## 실제 데이터 넣기
```bash
node scripts/import_csv.js prices.csv
```
CSV 형식: `date,productId,shop,price` (헤더 포함, 예: `2026-11-29,p001,쿠팡,24900`)

제품 추가는 `data/products.json`의 `products`에 항목을 추가하면 됩니다.

## 로컬 실행
```bash
python3 -m http.server 8000
```
`http://localhost:8000` 접속 (파일을 직접 열면 데이터를 불러오지 못합니다.)

## 배포
GitHub 저장소 Settings → Pages에서 브랜치 `main`, 폴더 `/ (root)`를 선택하세요.
