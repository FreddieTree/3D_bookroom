# MongoDB 示例文档（各 collection）

以下与 `app/lib/db/models/*.ts` 对齐，供成员 2 / 3 写入或手写验证。**字段名为示意**，以实际 schema + TypeScript interface 为准。

---

## `books`

```json
{
  "bookId": "little-prince",
  "title": "小王子 · 共读演示",
  "titleEn": "The Little Prince (demo scaffold)",
  "language": "bilingual",
  "tags": ["经典"],
  "totalParagraphs": 32,
  "createdAt": "2026-05-01T00:00:00.000Z"
}
```

## `chapters`

```json
{
  "bookId": "little-prince",
  "chapterIndex": 0,
  "title": "第 1 章",
  "paragraphs": [
    {
      "id": "p-c1-1",
      "text": "当我还只有六岁的时候，在一本描写原始森林的著名书中，看见过一幅令人惊叹的插画。"
    }
  ]
}
```

## `spoilerMaps`

```json
{
  "bookId": "little-prince",
  "version": 1,
  "paragraphGuards": [
    {
      "paragraphId": "p-c2-11",
      "risk": "medium",
      "hint": "避免直接剧透出走结局。"
    }
  ],
  "updatedAt": "2026-05-10T08:00:00.000Z"
}
```

## `visualStyles`

```json
{
  "bookId": "little-prince",
  "isActive": true,
  "stylePrompt": "soft watercolor dusk, amber paper grain, celestial motifs",
  "negativePrompt": "photoreal crowds, neon",
  "referencePalette": ["#3d342b", "#b8763e", "#e8c088"],
  "updatedAt": "2026-05-08T08:00:00.000Z"
}
```

## `chapterAssets`

```json
{
  "bookId": "little-prince",
  "chapterIndex": 1,
  "slots": {
    "hero": { "url": "https://cdn.example/book/lp/ch1-cover.jpg", "mime": "image/jpeg" },
    "ambience_loop": { "url": "https://cdn.example/book/lp/ch1-loop.mp3", "mime": "audio/mpeg" }
  }
}
```

---

## `users`（演示）

```json
{
  "authSub": "demo-user-local",
  "displayName": "演示读者",
  "plan": "free",
  "createdAt": "2026-04-01T00:00:00.000Z"
}
```

## `readingprogresses`

```json
{
  "userId": "demo-user-001",
  "bookId": "little-prince",
  "chapterIndex": 1,
  "paragraphId": "p-c2-5",
  "scrollOffset": 864,
  "percentComplete": 42,
  "syncVersion": 3,
  "updatedAt": "2026-05-18T10:21:33.000Z"
}
```

## `conversations`（话题默认 `default`）

```json
{
  "userId": "demo-user-001",
  "bookId": "little-prince",
  "topic": "default",
  "messages": [
    {
      "role": "user",
      "content": "玫瑰为什么还要玻璃罩？",
      "sentAt": "2026-05-18T10:05:00.000Z"
    },
    {
      "role": "assistant",
      "content": "（Mock）占位回复。",
      "sentAt": "2026-05-18T10:05:02.000Z"
    }
  ]
}
```

## `pendingquestions`

```json
{
  "userId": "demo-user-001",
  "bookId": "little-prince",
  "userQuestion": "猴面包树的隐喻更像哪种成人疏忽？",
  "spoilerBrief": "",
  "revealAfterChapter": 3,
  "expectedReleaseParagraphId": "p-c3-9",
  "status": "queued",
  "createdAt": "2026-05-17T09:30:00.000Z"
}
```

## `generatedcontents`

```json
{
  "userId": "demo-user-001",
  "bookId": "little-prince",
  "paragraphId": "p-c2-8",
  "kind": "image",
  "status": "ready",
  "urls": ["https://cdn.example/gen/xxxx.png"],
  "createdAt": "2026-05-17T08:44:21.000Z"
}
```

## `bookmarks` / `communityshares` / `usagelogs`

- **bookmarks**：用户段落书签引用。
- **communityshares**：`/api/community` 瀑布流占位用。
- **usagelogs**：`/api/usage` 占位计量。

结构与 seed 脚本一致：`npm run db:seed` 可产出可查询样例。
