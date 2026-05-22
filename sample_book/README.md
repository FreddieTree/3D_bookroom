# `sample_book/` — 离线 EPUB 样例目录

Git **忽略 `.epub` 文件**，团队各自把书放在此目录后即可跑入库脚本。

## 当前与 `BOOKS[]`（`app/lib/data/books.ts`）匹配的样例（仓库内）

- `小王子 (...).epub` → `little-prince`
- `阿Q正传 (...).epub` → `aq-zhengzhuan`
- `乡村教师·刘慈欣科幻自选集 (...).epub` → `village-teacher`
- `伊凡・伊里奇之死 ... (.epub` → `death-of-ivan-ilyich`

## 书单位已预留但**需自行放入 EPUB** 才有一致章节数

- `nineteen-eighty-four`（1984）：文件名含关键词如 `1984`、`Orwell`、`奥威尔` 等即可被 `match-catalog-epubs` 配对。
- `the-old-man-and-the-sea`（老人与海）：含 `老人与海`、`海明威`、`Hemingway` 等。

## 《后宫甄嬛传》

不在产品 `BOOKS[]` 内。若想避免误入库，**不要**带 `--orphans` 启动 ingest；若库里已有 `extrabook-*`，执行 `npm run db:prune` 清理。

## 推荐一条龙（Mongo）

```bash
npm run db:seed
npm run db:prune
npm run db:ingest -- --include-little-prince
npm run db:verify
```

- 不传 `--orphans` 时，`sample_book` 里多余 EPUB 只会列在 ingest 日志的 `orphans`，**不写库**。
- `db:prune` 删除所有不在 `BOOKS[]` 的 `bookId`（含历史 orphan）。
- **`--include-little-prince`**：用 EPUB 覆盖库里小王子的 demo 三章；不传则小王子仍沿用 `sample-content` 的手工段落。
