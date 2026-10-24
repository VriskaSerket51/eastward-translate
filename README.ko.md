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

> 번역 DB는 `data/locale.db`입니다. 경로는 `LOCALE_DB_PATH`로 변경하며, `DATABASE_URL`이 있으면 우선 사용합니다.
> 원문 가져오기와 웹에서 같은 DB를 사용해야 합니다.
> 기존 DB는 `db:deploy` 전에 백업해야 합니다.
> 원본 SQ 구조를 보려면 `EASTWARD_GAME_ROOT`를 설정합니다.

## 사용 방법

1. 언어 코드를 입력한 뒤 `Apply`를 선택하기
2. 문구를 수정한 뒤 `Save` 또는 Ctrl/Cmd+S로 저장하기
3. `Export JSON`으로 번역을 다운로드하기

저장 전 내용은 브라우저 초안으로 남습니다. 다른 사람의 수정과 충돌하면 서버 문구를 다시 불러와 비교한 뒤 저장할 수 있습니다.

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
