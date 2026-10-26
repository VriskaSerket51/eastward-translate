# Eastward Translate

[English](README.md) | 한국어

Eastward 번역을 편집하는 비공식 웹 도구입니다. 한국어 외 다른 언어도 사용할 수 있습니다.

## 개발 방법

1. Node.js 24.13 이상을 설치하기
2. `eastward.js` 레포를 옆 폴더에 두고 먼저 빌드하기
3. `.env.example`을 `.env`로 복사한 뒤 경로를 설정하기
4. 아래 명령을 실행하기

```sh
npm ci
npm run db:deploy
npm run locale:import -- "/path/to/Eastward"
npm run dev
```

[localhost:3000](http://localhost:3000)으로 접속할 수 있습니다.

번역 DB는 `data/locale.db`입니다. 경로는 `LOCALE_DB_PATH`로 변경하며, `DATABASE_URL`이 있으면 우선 사용합니다. 원문 가져오기와 웹에서 같은 DB를 사용해야 합니다.

원본 SQ 구조를 보려면 `EASTWARD_GAME_ROOT`에 게임 설치 경로를 설정합니다.

## 사용 방법

화면 언어는 한국어와 영어를 지원합니다. 처음에는 브라우저 언어를 따르며, 상단에서 바꾸면 다음 접속에도 유지됩니다. 모바일에서는 메뉴 안에서 선택할 수 있습니다.

화면 언어와 번역 대상은 별개입니다. 한국어 화면에서 프랑스어를 번역하는 식으로 사용할 수 있습니다.

사용 방법은 다음과 같습니다.

1. `프로필`에서 수정 이력에 남길 이름을 설정하기
2. 파일을 선택하고 `번역 대상 언어`에 언어 코드를 입력한 뒤 `적용`하기
3. 비교할 언어를 고르고 문구를 수정하기
4. `저장` 또는 Ctrl/Cmd+S로 저장하기
5. `JSON 내보내기`로 선택한 대상 언어의 번역을 다운로드하기

저장 전 내용은 브라우저 초안으로 남습니다. 파일이나 화면 언어를 바꿔도 유지됩니다. 다른 사람의 수정과 충돌하면 서버 문구를 다시 불러와 비교한 뒤 저장할 수 있습니다.

`이력`에서는 파일이나 최근 작성자로 검색하고, 메시지별로 두 버전을 골라 변경된 부분을 비교할 수 있습니다. 파일 목록은 최근 수정된 100개까지 표시합니다.

`진행률`에서는 본편, Earthborn, 옥토피아의 번역 현황과 번역이 남은 파일을 확인할 수 있습니다.

JSON은 EastwardModTool의 `Mod > Create language patch...`에서 가져올 수 있습니다.
메뉴, 이미지, 폰트도 같은 모드에 추가할 수 있습니다.
자세한 사용법은 [언어 패치 가이드](https://github.com/VriskaSerket51/EastwardModLoader/blob/main/docs/language-patches.ko.md)에 있습니다.

## 운영 실행

```sh
npm run db:deploy
npm run build
npm start
```

[라이선스](LICENSE)
