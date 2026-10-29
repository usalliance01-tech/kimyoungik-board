# 김영익 교수님 데이터 보드 (Netlify용)

## 폴더 구성

| 경로 | 내용 |
|---|---|
| `index.html` | 보드 화면 전체 (디자인, 차트, 검색·필터) |
| `data/latest.json` | 핵심 지표 최신값 (코스피, 환율, 선행지수, 버핏지수 등) |
| `data/voices.json` | 교수님 한마디 (영상·출연 요약) |
| `data/catalog.json` | 지표 카탈로그 (한 줄 요약, 설명, 출처, 발표 일정) |
| `fonts/` | 프리텐다드 폰트 (SIL OFL 라이선스) |
| `js/d3.min.js` | 차트 라이브러리 (ISC 라이선스) |
| `netlify.toml` | 데이터 파일은 캐시하지 않도록 하는 설정 |

## 처음 올리기

1. 이 폴더(zip을 푼 `kimyoungik-board` 폴더)를 통째로 Netlify에 올립니다.
   - 가장 간단한 방법: Netlify의 Deploy 화면에서 폴더를 끌어다 놓기
2. 배포가 끝나면 `https://<사이트이름>.netlify.app` 주소로 열립니다.

## 숫자 바꾸기

화면은 건드리지 않고 `data/` 폴더의 JSON 파일만 고치면 됩니다.

- 지표값: `data/latest.json`에서 해당 지표의 `value`(숫자), `display`(화면 표시), `asof`(기준일), `note`(메모)를 수정
- 새 발언: `data/voices.json` 맨 앞에 `{date, channel, title, summary, url}` 한 줄 추가
- 고친 뒤 폴더를 다시 올리면(재배포) 반영됩니다.

## 자동 갱신 (선택)

이 폴더를 GitHub 저장소에 올리고 Netlify를 그 저장소에 연결하면, 저장소의 `data/` 파일이 바뀔 때마다 사이트가 자동으로 다시 배포됩니다. Claude 예약 작업이 이 저장소의 JSON을 직접 고치도록 연결할 수 있습니다.
