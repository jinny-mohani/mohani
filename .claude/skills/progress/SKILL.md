---
name: progress
description: 허진희의 업무 진행 상황을 기록하고 진행판을 갱신한다. "/progress", "진행 기록", "○○ 시안 끝났어", "이 흔적은 ○○ 업무야", "현황 보여줘"처럼 업무 진행을 알려 주거나 현황을 물을 때 사용.
---

# 업무 진행 기록 (/progress)

평일에는 따로 적지 않아도 된다. 흔적은 금요일에 `/friday`가 Claude Code 세션·슬랙·노션에서 모은다.
`/progress`는 **흔적이 안 남는 일**(회의 결정, 오프라인 작업, 단계 변경)을 한 줄 남기거나, 현황을 볼 때 쓴다.

## 데이터 (원본은 이 저장소)

- `work/tasks.json` — 업무 목록. `{rows: [...]}`
  - `id`(t1, t2…) · `name`(`[영역] 내용`) · `alias` · `category`(UX 개선/디자인 자동화/상시 진행) · `status`(진행중/기획중/보류/완료) · `stage`(1~5, 모르면 null) · `stageName`(기획/시안/검토/개발 전달/완료, 또는 "단계 확인 필요"/"보류") · `now` · `next` · `sessionHint`(이 업무의 세션 이름에 들어가는 글자) · `lastUpdate`(YYYY-MM-DD)
- `work/log.json` — 날짜별 흔적. `{rows: [...]}`
  - `id`(l1, l2… 겹치지 않게 다음 번호) · `date` · `task`(업무 id, 모르면 "") · `text` · `from`(예: "세션 · 🔥 과제2_…", "슬랙 DM", "노션 업무일지 4주차", "직접 말함") · `link`

## 기록하기

1. 두 파일을 읽는다.
2. 말한 내용을 어느 업무에 넣을지 정한다. 애매하면 후보를 보여 주고 묻는다. 새 업무면 tasks에 행을 추가한다(카테고리를 모르면 묻는다).
3. `log.json`에 행을 추가한다(`from: "직접 말함"`). 사용자가 말한 사실만 쓴다.
4. 해당 업무의 `now`, `lastUpdate`를 고친다. 단계가 바뀐 것 같으면 "2 시안 → 3 검토로 바꿀까요?"라고 확인하고 `stage`, `stageName`을 고친다.
5. "이 흔적은 ○○ 업무야"라고 하면 그 log 행의 `task`만 채운다.
6. 스크린샷 같은 파일은 저장소에 넣지 않는다. 금요일 업무일지에 올릴 수 있게 `text`에 "(스크린샷 있음: 금요일에 노션 업로드)"라고 남기고, 사용자에게 금요일 `/friday` 때 다시 첨부해 달라고 말한다. 링크는 `link`에 넣는다.
7. **진행판 갱신**(아래)과 커밋·푸시를 한다.

## 진행판 갱신 (파일을 바꿀 때마다)

진행판: https://claude.ai/artifact/9SbbHdQnifVityV5oLvffN (Data 타입 아티팩트, 데이터는 업로드한 파일)

1. 바뀐 파일을 업로드한다: Artifact `publish`, `url` = 진행판, `asset: true`, `file_path` = `work/tasks.json`(또는 `work/log.json`). 결과의 `/_blob/<id>`를 받는다.
2. ArtifactData로 `datasets/tasks`(또는 `datasets/log`)를 `get`해서 version을 확인하고, `update`로 `source.url`을 새 `/_blob/<id>`로, `updated`를 `{at: 지금 ISO 시각, by: "Claude"}`로 바꾼다(`if_version` 필수).
3. 이전 blob은 `Artifact` `delete`(`url` + `path` = 이전 id)로 지운다.
4. 화면(`files/index.html`)은 건드리지 않는다. 화면 원본은 `work/dashboard/index.html`이고, 바꿀 일이 있을 때만 사용자 요청을 받아 고친다.

## 현황 보여주기

`tasks.json`을 읽어 짧게 보여 주고 진행판 링크를 준다.

```
■■□□□ 시안   [AI 서술형] 미리보기 화면 — 미리보기 만드는 중 (다음: 담당자 회의)
□□□□□ 단계 확인 필요   [교재비 청구] 이용률 향상 — 피드백 요청 중
```

진행중인데 `lastUpdate`가 5일 넘은 업무, `task`가 빈 흔적은 따로 짚어 준다.
