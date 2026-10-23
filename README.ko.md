# Eastward Translate

[English](README.md) | 한국어

Eastward 번역을 편집하는 비공식 웹 도구입니다. 한국어 외의 언어도 사용할 수 있습니다.

## 필요한 것

- Node.js 24.13 이상.
- 나란히 둔 `eastward.js` 저장소. 먼저 의존성을 설치하고 빌드하세요.
- 원문을 가져올 Eastward 설치본.

## 사용 방법

`.env.example`을 참고해 `.env`를 만듭니다.

```sh
npm ci
npm run db:deploy
npm run locale:import -- "/path/to/Eastward"
npm run dev
```

[localhost:3000](http://localhost:3000)에서 엽니다.

### 데이터

번역 DB는 `data/locale.db`에 저장합니다. `LOCALE_DB_PATH`로 경로를 지정할 수 있고, `DATABASE_URL`이 있으면 우선 사용합니다.

기존 DB는 백업한 뒤 `npm run db:deploy`를 실행하세요. 원문을 가져올 때도 웹에서 쓰는 DB 경로를 지정하세요. `EASTWARD_GAME_ROOT`를 지정하면 원본 SQ 구조도 볼 수 있습니다.

### 번역

언어 코드를 입력하고 **Apply**를 누릅니다. 문구를 수정한 뒤 **Save** 또는 Ctrl/Cmd+S로 저장합니다.

저장하지 않은 내용은 브라우저 초안으로 남습니다. 다른 사람이 먼저 수정해 충돌이 나면 서버 문구를 다시 불러와 비교한 뒤 저장하세요.

### 내보내기

**Export JSON**으로 대상 언어를 내보냅니다.

```json
{"language":"ko","translations":[{"path":"asset/path","key":"message-id","value":"번역"}]}
```

내보낸 JSON을 EastwardModTool의 **Mod > Create language patch...** 창에서 선택합니다. 메뉴, 이미지, 폰트와 함께 `.ewmod`로 만들 수 있습니다. 자세한 방법은 [언어 패치 가이드](https://github.com/VriskaSerket51/EastwardModLoader/blob/main/docs/language-patches.ko.md)를 참고하세요.

## 운영

```sh
npm run db:deploy
npm run build
npm start
```

## 라이선스

[LICENSE](LICENSE)를 참고하세요.
