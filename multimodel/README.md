# Book AI Enricher — Developer Guide

把一本小说 (`.epub` / `.pdf` / `.txt`) 喂进去，自动产出每章一张插画 + 一段背景配乐 + 关键对白配音，以及一份 `chapter_manifest.json` 把音频 ↔ 原文一一对应起来。

整套管线后端默认走 **MiniMax**（文本理解 / 图像 / 音乐 / 语音都用它）。代码里保留了 OpenAI / ElevenLabs / Replicate 的实现作为备用，可在 `orchestrator.py` 一行切换。

---

## 1. 目录

- [2. 架构总览](#2-架构总览)
- [3. 安装 & 环境变量](#3-安装--环境变量)
- [4. 命令行用法](#4-命令行用法)
- [5. 交互式问询流程](#5-交互式问询流程)
- [6. 输出目录结构](#6-输出目录结构)
- [7. 关键 JSON Schema](#7-关键-json-schema)
- [8. 程序化调用 (Python API)](#8-程序化调用-python-api)
- [9. 配置项 (`Config`) 完整参考](#9-配置项-config-完整参考)
- [10. 项目级硬约束](#10-项目级硬约束)
- [11. 缓存与重跑](#11-缓存与重跑)
- [12. 扩展指南](#12-扩展指南)
- [13. 常见错误排查](#13-常见错误排查)
- [14. 成本估算](#14-成本估算)

---

## 2. 架构总览

```
parse_book(path)                               ──→  Book
   │
   ├─[TXT/PDF only]
   │   章节切分启发式可疑？                    ──→  LLMChapterDetector
   │
   │   交互式：用户选生成几章 / 是否画人脸
   │
   ▼
StoryAnalyzer.analyze(book)                    ──→  StoryProfile
   │   产出全局风格档案（art_style, music_baseline,
   │   角色名册含 appearance + voice_description）
   │
   ▼
MiniMaxVoiceCaster.cast(profile)               ──→  voice_id 锁定
   │   LLM 根据 voice_description 智能匹配音色
   │
   ▼
MiniMaxCharacterPortraitGenerator (一次性)      ──→  portraits.json
   │   每个角色生成一张参考肖像，URL 用于后续 subject_reference
   │
   ▼
For each chapter (并行):
   ├─ ChapterAnalyzer.plan(chapter, profile)   ──→  ChapterPlan
   │
   ├─ 并行执行：
   │   ├─ MiniMaxImageGenerator                ──→  illustration.png
   │   │     (传入角色肖像 URL 做 subject_reference)
   │   ├─ MiniMaxMusicGenerator                ──→  music.mp3
   │   └─ MiniMaxVoiceGenerator × N            ──→  voices/*.mp3
   │
   └─ 写出 chapter_manifest.json (音频↔原文映射)
```

**两阶段管线，一致性来源**：
- **图像一致性**：全书共用一份 `art_style`；每个角色一张固定的参考肖像
- **音色一致性**：voice casting 一次锁定，整本书复用同一份 `name → voice_id` 映射
- **音乐一致性**：全书共用 `music_baseline`，章节只对它做小幅 `music_mood` 偏移

### 文件职责

| 文件 | 内容 |
|---|---|
| `main.py` | CLI 入口、解析命令行参数 |
| `config.py` | `Config` dataclass：所有可调参数 |
| `parsers.py` | epub / pdf / txt → `Book` |
| `chapter_detector.py` | LLM 兜底章节切分（TXT/PDF 启发式失败时） |
| `models.py` | Pydantic 数据模型（管线各阶段间的契约） |
| `analyzer.py` | `StoryAnalyzer` / `ChapterAnalyzer` —— 调 LLM 出 JSON 计划 |
| `generators.py` | 所有图像 / 音乐 / 语音生成器；音乐硬约束验证器 |
| `orchestrator.py` | 把上面这些串起来，并行调度，写盘 |

---

## 3. 安装 & 环境变量

### 安装

```bash
python -m pip install pydantic python-dotenv anthropic openai httpx replicate \
                      elevenlabs ebooklib pdfplumber beautifulsoup4 tqdm
```

Windows 上 `elevenlabs` 装不上没关系——`generators.py` 顶部有 stub 兜底，pipeline 默认根本不用 elevenlabs。

### 必填的环境变量 (`.env`)

```bash
MINIMAX_TEXT_KEY=...      # 给 analyzer/casting 用，调 https://api.minimax.io/anthropic
MINIMAX_PAYGO_KEY=...     # 给图像/音乐/语音生成 API 用
```

只有 `MINIMAX_PAYGO_KEY` 被 `Config.validate()` 强校验。其他 `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` / `ELEVENLABS_API_KEY` / `REPLICATE_API_TOKEN` 仅在你切回对应 generator 时才需要。

---

## 4. 命令行用法

```bash
python main.py SOURCE [OPTIONS]
```

### 位置参数

| 参数 | 必填 | 说明 |
|---|---|---|
| `SOURCE` | ✓ | `.epub` / `.pdf` / `.txt` 文件路径 |

### 选项

| Flag | 默认 | 说明 |
|---|---|---|
| `--output PATH` | `./output` | 输出根目录 |
| `--max-chapters N` | 全部 | 只跑前 N 章。传了之后跳过"几章"交互问询 |
| `--no-interactive` | off | 跳过所有交互问询，用默认值跑 |
| `--no-skip` | off | 强制重新生成所有文件（默认 skip 已存在的） |
| `--chapter-workers N` | 2 | 章节并行 worker 数 |
| `--music-seconds N` | 30 | 配乐时长（秒） |
| `--max-dialogues N` | 5 | 每章最多配音几条对白 |
| `--no-people` | off | 章节插图**绝不**画人物 / 人脸（环境/物件only）。隐含 `--no-portraits` |
| `--no-portraits` | off | 跳过一次性参考肖像生成（章节图仍可有人物，但角色长相可能跨章漂移） |

### 常用组合

```bash
# 测试单章效果，省钱（约 $0.3-0.8）
python main.py book.epub --max-chapters 1

# 完整跑，跳过所有问询
python main.py book.epub --no-interactive

# 只生成环境插图（适合诗集 / 纯叙事氛围向）
python main.py book.epub --no-people

# 强制重跑某章（先删该章 dir 再跑）
rm -rf output/<book_title>/chapters/ch003
python main.py book.epub --no-skip
```

---

## 5. 交互式问询流程

默认（不传 `--no-interactive` 时），跑起来会经历三个问询：

### Q1: 章节范围

```
📑 章节清单（共 9 章）：
   ch001  1                                           8,666 字
   ch002  2                                           6,185 字
   ...

📚 检测到 9 章。要生成多少章？(输入 1-9 的数字，回车=全部，q=退出):
```

- 数字 → 只跑前 N 章
- 回车 / `all` → 全部章节
- `q` / `quit` → 立即退出

传了 `--max-chapters` 的话，此问询跳过。

### Q2: 是否画人物

```
🎨 章节插图是否包含人物 / 人脸？
   y = 是（推荐：场景里出现的角色会被画出来）
   n = 否（只画环境 / 物件 / 氛围，不画任何人脸）
   (y/n，回车=y):
```

- `n` → 设置 `include_people_in_scenes=False`，**同时自动跳过 Q3**（不画人物就不需要肖像）

传了 `--no-people` 的话，此问询跳过。

### Q3: 是否生成角色参考肖像

```
🖼  是否为每个角色一次性生成「参考肖像」？
   y = 是（每角色加 1 张图的成本，换跨章节角色长相一致）
   n = 否（省钱；每章人物可能长得略有不同）
   (y/n，回车=y):
```

肖像生成约占每角色 1 张图的成本。一本小说 5-10 个主要角色 → 5-10 张额外的肖像图（约 $0.07-0.15 一次性投入），但所有章节插图里的角色长相会保持一致。

传了 `--no-portraits` 的话，此问询跳过。

---

## 6. 输出目录结构

```
output/
└── <safe_book_title>/                  # 书名做安全文件名转换
    ├── story_profile.json              # ★ 全局风格档案（见 7.1）
    ├── voice_cast.json                 # 角色 → voice_id 映射
    ├── portraits.json                  # 角色 → 肖像 URL 映射
    ├── portraits/
    │   ├── <角色1>.png                  # 9:16 角色参考肖像
    │   └── ...
    └── chapters/
        ├── ch001/
        │   ├── plan.json                # ChapterPlan 原始 JSON
        │   ├── chapter_manifest.json    # ★ 给前端用的接口文件（见 7.2）
        │   ├── illustration.png         # 16:9 章节插画
        │   ├── music.mp3                # 30s 背景音乐
        │   └── voices/
        │       ├── 01_<canonical>.mp3   # 对白音频，01-05 编号
        │       └── ...
        ├── ch002/
        └── ...
```

**前端 / 下游开发者只需要读两类文件**：
1. `story_profile.json` —— 拿到角色名册、voice_id、肖像 URL
2. 每章的 `chapter_manifest.json` —— 拿到该章所有资源 + 对白↔音频映射

---

## 7. 关键 JSON Schema

### 7.1 `story_profile.json`

全书共用，一次生成后整本书复用。

```json
{
  "title": "了不起的盖茨比",
  "author": "菲茨杰拉德",
  "genre": "现实主义文学 / 美国梦悲剧",
  "tone": "怀旧而幻灭的低饱和叙事",
  "setting": "1922 年夏天的纽约长岛与曼哈顿",
  "summary": "中西部青年尼克搬到长岛西卵...",

  "art_style": "Oil-on-canvas painterly digital art. Palette: burnt sienna, indigo, ivory...",
  "art_style_negative": "no on-image text, no captions, no logos, no anachronistic modern objects",
  "music_baseline": "A loopable, low-intensity, fully instrumental ambient underscore. Instrumentation: felt-hammer piano, soft bowed strings...",

  "characters": [
    {
      "name": "盖茨比",
      "aliases": ["杰伊·盖茨比", "杰伊·盖兹"],
      "gender": "male",
      "age_group": "adult",
      "description": "白手起家的神秘富豪，深爱黛西",
      "appearance": "金发碧眼，常着粉色西装...",
      "voice_description": "温暖中年男中音，措辞讲究，时有迟疑",
      "voice_id": "Chinese (Mandarin)_Gentleman",
      "voice_name": "Gentleman",
      "portrait_url": "https://cdn.minimax.io/.../portrait.png",
      "portrait_path": "portraits/盖茨比.png"
    }
  ]
}
```

### 7.2 `chapter_manifest.json` — **下游核心接口**

每章一份，把这一章所有产出（图 / 乐 / 配音）和原始 prompt / 文本绑在一起。

```json
{
  "chapter_index": 0,
  "chapter_number": 1,
  "chapter_title": "第一章",
  "chapter_summary": "尼克搬到长岛西卵...",
  "word_count": 8666,

  "illustration": {
    "path": "illustration.png",
    "image_focus": "尼克站在西卵自家小屋前凝望对岸",
    "image_scene_details": "wide shot, golden hour, ...",
    "has_people": true,
    "characters": ["尼克"],
    "reference_portraits_used": 1,
    "status": "ok"
  },

  "music": {
    "path": "music.mp3",
    "music_mood": "slightly warmer; add muted felt-piano motif",
    "status": "ok"
  },

  "dialogues": [
    {
      "order": 1,
      "character_canonical": "盖茨比",
      "character_as_written": "盖茨比",
      "text": "老兄，我可什么都没说。",
      "emotion": "wry",
      "voice_id": "Chinese (Mandarin)_Gentleman",
      "voice_name": "Gentleman",
      "audio_path": "voices/01_盖茨比.mp3",
      "audio_filename": "01_盖茨比.mp3",
      "status": "ok"
    }
  ]
}
```

#### 字段说明

| 字段 | 类型 | 说明 |
|---|---|---|
| `chapter_index` | int | 0-based 索引（程序用） |
| `chapter_number` | int | 1-based，给人看 |
| `chapter_title` | string | 原书章节标题 |
| `chapter_summary` | string | LLM 生成的 2-3 句章节摘要 |
| `word_count` | int | 字数 |
| `illustration.has_people` | bool | 这张图是否包含人物 |
| `illustration.characters` | string[] | 出场角色 canonical 名（用来对应 `story_profile.characters[i].name`） |
| `illustration.reference_portraits_used` | int | 实际传给 API 的 subject_reference 数量 |
| `illustration.status` | string | `"ok"` / `"cached"` / `"failed"` |
| `music.status` | string | 同上 |
| `dialogues[i].order` | int | 1-based，对白在本章的出现顺序 |
| `dialogues[i].character_canonical` | string | 标准名（对应 voice cast） |
| `dialogues[i].character_as_written` | string | 原文出现的形式（可能是别名） |
| `dialogues[i].text` | string | **干净的对白文本**（不含 sound tag、不含引号、不含 narrator 标签） |
| `dialogues[i].emotion` | string | 9 选 1：`neutral` / `angry` / `tender` / `fearful` / `sad` / `joyful` / `wry` / `desperate` / `awed` |
| `dialogues[i].voice_id` | string \| null | null 表示该角色未在 voice cast 中（不会有音频文件） |
| `dialogues[i].audio_path` | string | **相对本章目录**的音频路径 |
| `dialogues[i].status` | string | `"ok"` / `"cached"` / `"failed"` / `"skipped_no_voice"` |

#### 怎么把音频贴回原文

```python
import json
from pathlib import Path

chapter_dir = Path("output/盖茨比/chapters/ch001")
manifest = json.loads((chapter_dir / "chapter_manifest.json").read_text(encoding="utf-8"))

for d in manifest["dialogues"]:
    if d["status"] in ("ok", "cached"):
        audio_file = chapter_dir / d["audio_path"]
        text_to_find = d["text"]                    # 在原文中查找这个字符串
        speaker = d["character_canonical"]
        emotion = d["emotion"]
        # 现在你有了：text -> audio_file，可以渲染成 ePub3 SMIL、网页 player、podcast 等
```

### 7.3 `voice_cast.json`

```json
{
  "盖茨比": {"voice_id": "Chinese (Mandarin)_Gentleman", "voice_name": "Gentleman"},
  "尼克":   {"voice_id": "Chinese (Mandarin)_Sincere_Adult", "voice_name": "Sincere Adult"}
}
```

### 7.4 `portraits.json`

```json
{
  "盖茨比": {
    "portrait_url": "https://cdn.minimax.io/.../portrait.png",
    "portrait_path": "portraits/盖茨比.png"
  }
}
```

`portrait_url` 是 MiniMax CDN 的公开 URL，**可能在几天后失效**。`portrait_path` 是落到本地的备份。重跑时如果 CDN URL 失效，可以删 `portraits.json` 让肖像重新生成。

### 7.5 `plan.json`

`ChapterPlan` 的完整原始 JSON。`chapter_manifest.json` 是它的"投影 + 加结果状态"，`plan.json` 留作审计 / 排错。

---

## 8. 程序化调用 (Python API)

不想用 CLI 的话，直接在你自己的 Python 代码里：

```python
from pathlib import Path
from config import Config
from orchestrator import BookEnricher, enrich_book

# 方法 1: 一行调用
output_dir = enrich_book("path/to/book.epub")

# 方法 2: 自定义 config
cfg = Config()
cfg.output_root = Path("./my_output")
cfg.max_chapters = 3
cfg.include_people_in_scenes = False     # 等价于 --no-people
cfg.skip_image_mode_prompt = True        # 跳过交互
cfg.interactive = False                  # 完全非交互模式

output_dir = BookEnricher(cfg).enrich("path/to/book.epub")
print(f"成果在: {output_dir}")
```

### 各阶段单独调用

如果只想用其中一个组件：

```python
# 只解析书结构（不调 LLM）
from parsers import parse_book
book = parse_book("book.epub")
print(book.title, len(book.chapters))

# 只跑章节切分（适用于 TXT / PDF 章节模糊的情况）
from chapter_detector import LLMChapterDetector
detector = LLMChapterDetector(cfg)
chapters = detector.detect(raw_text)  # → [(title, content), ...]

# 只跑全局分析
from analyzer import StoryAnalyzer
profile = StoryAnalyzer(cfg).analyze(book)   # → StoryProfile

# 只生成一张章节图
from generators import MiniMaxImageGenerator
gen = MiniMaxImageGenerator(cfg, profile)
gen.generate(
    scene_focus="盖茨比凝望码头",
    scene_details="深夜，码头尽头一盏绿灯...",
    output_path=Path("test.png"),
    subject_references=["https://.../gatsby_portrait.png"],   # 可选
    include_people=True,                                       # 可选
)
```

---

## 9. 配置项 (`Config`) 完整参考

`config.py` 里的 `Config` 是一个 `@dataclass`。所有字段都可以在程序化调用时直接覆盖。

### API 凭据

| 字段 | 默认 | 说明 |
|---|---|---|
| `minimax_text_key` | env `MINIMAX_TEXT_KEY` | LLM 文本理解 |
| `minimax_paygo_key` | env `MINIMAX_PAYGO_KEY` | 图像/音乐/语音 |
| `anthropic_api_key` | env | 仅备用路径需要 |
| `openai_api_key` | env | 仅备用路径需要 |
| `elevenlabs_api_key` | env | 仅备用路径需要 |
| `replicate_api_token` | env | 仅备用路径需要 |

### 模型选择

| 字段 | 默认 | 说明 |
|---|---|---|
| `minimax_model` | `"MiniMax-M2.5-highspeed"` | 文本理解 |
| `minimax_voice_model` | `"speech-2.8-hd"` | TTS。换 `"speech-2.8-turbo"` 省钱 |
| `minimax_music_model` | `"music-2.6"` | 音乐 |
| `image_model` | `"image-01"` | 图像 |
| `minimax_text_max_tokens` | `8000` | 长角色名册书提到 12000+ |

### 生成行为

| 字段 | 默认 | 说明 |
|---|---|---|
| `max_dialogues_per_chapter` | 5 | 上限，分析器可能产出更少 |
| `music_duration_seconds` | 30 | |
| `music_format` | `"mp3"` | |
| `long_novel_threshold_chars` | 400,000 | 超过则全书分析走 map-reduce |

### 并发 / 缓存

| 字段 | 默认 | 说明 |
|---|---|---|
| `concurrent_chapter_workers` | 2 | 章节间并行 |
| `concurrent_voices_per_chapter` | 3 | 章内 TTS 并行 |
| `skip_existing` | `True` | 已存在文件不重跑 |
| `max_chapters` | `None` | 限制章节数；CLI `--max-chapters` 设置此项 |

### 交互 / 图像模式

| 字段 | 默认 | 说明 |
|---|---|---|
| `interactive` | `True` | TTY 下问询；CLI `--no-interactive` 关掉 |
| `include_people_in_scenes` | `True` | 章节图允许人物 |
| `generate_character_portraits` | `True` | 一次性生成参考肖像 |
| `skip_image_mode_prompt` | `False` | 跳过 Q2/Q3 问询（CLI flag 已设值时） |

### 输出

| 字段 | 默认 | 说明 |
|---|---|---|
| `output_root` | `./output` | 输出根目录 |

---

## 10. 项目级硬约束

代码里有一些**写死的不变量**，不通过 config 暴露，下游可信任：

### 10.1 音乐：永远可循环、低强度、纯器乐

- `generators.py` 顶部 `MUSIC_REQUIREMENTS_TEXT` / `MUSIC_FORBIDDEN_TEXT` 是发给音乐 API 的硬约束文本
- `sanitize_music_baseline()` / `sanitize_music_mood()` 扫描违禁词（"epic"、"climactic"、"高潮"、"激昂"、"vocals"、"drop"...），命中则替换为 `SAFE_MUSIC_BASELINE` / `SAFE_MUSIC_MOOD_FALLBACK`
- 否定上下文识别：`"no vocals"` 不会触发 `vocal` 违禁词
- API payload 里 `is_instrumental: True` **硬锁**，没有任何 config 可以改它
- 想松动约束 → 改 `generators.py` 顶部 `MUSIC_REQUIREMENTS_TEXT`，会自动传播

### 10.2 emotion：白名单 9 选 1

`ChapterAnalyzer` 输出的 emotion 字段强制在 `{neutral, angry, tender, fearful, sad, joyful, wry, desperate, awed}` 之内。LLM 写白名单外的值（"furious"、"愤怒"）会被回退到 `neutral`。

下游开发者只需要为这 9 个值各准备一套展示样式 / prosody 即可。

### 10.3 图像 prompt：1450 字符硬上限

MiniMax 图像 API 拒绝 >1500 字符的 prompt。生成器内部各组件分别截断（art_style ≤480, scene_details ≤420, focus ≤160, negative ≤160），最终再硬截到 1450。下游不用关心。

### 10.4 voice casting：性别必须正确

casting 的 system prompt 把"性别匹配错误"标为"最严重的失败"。LLM 智能匹配失败时的回退规则也以性别为第一筛选条件。所以 `dialogues[i].voice_id` 永远是性别正确的音色。

---

## 11. 缓存与重跑

`skip_existing=True`（默认）时，pipeline 重跑只补缺失的文件。具体缓存粒度：

| 产出 | 缓存键 | 强制重跑方法 |
|---|---|---|
| `story_profile.json` | 文件存在即跳过 stage 1 | 删该文件 |
| `voice_cast.json` | 同上 | 删该文件 |
| `portraits.json` + portraits/*.png | 同上 | 删 `portraits.json` |
| `plan.json` | 每章独立判断 | 删该章的 plan.json |
| `illustration.png` | 同上 | 删 |
| `music.mp3` | 同上 | 删 |
| `voices/*.mp3` | 每条对白独立 | 删对应文件 |

也可以一刀切：`--no-skip` 全部重跑。

**重要**：改了角色 appearance / voice_description 后想看新效果，要：
1. 删 `voice_cast.json` 和 `portraits.json` 让它们重生成
2. 同时删 `chapters/` 下所有章节（旧的 `chapter_manifest.json` 引用了旧 voice_id）

---

## 12. 扩展指南

### 12.1 换音色库到其他语言

打开 `generators.py`，找到 `_MINIMAX_VOICE_LIBRARY`（当前是 32 个中文音色）。每条是：

```python
{"voice_id": "<official id>",
 "name": "<human name>",
 "lang": "zh",
 "gender": "male|female|neutral",
 "age": "child|teen|young_adult|adult|elder",   # 可用 "/" 表示多档
 "desc": "<给 LLM 看的中文描述>"}
```

要加 voice ID 列表见 MiniMax 官方 [Voice ID 文档](https://platform.minimax.io/docs)。直接追加到列表里即可，casting 阶段会自动考虑新音色。

### 12.2 接入新的图像 / 音乐 / 语音 provider

每类生成器都有抽象基类（`generators.py` 顶部）：

```python
class ImageGenerator(abc.ABC):
    @abc.abstractmethod
    def generate(self, scene_focus, scene_details, output_path,
                 subject_references=None, include_people=True) -> Path: ...

class MusicGenerator(abc.ABC):
    @abc.abstractmethod
    def generate(self, mood_delta, output_path) -> Path: ...

class VoiceGenerator(abc.ABC):
    @abc.abstractmethod
    def synthesize(self, line, voice_id, output_path) -> Path: ...

class VoiceCaster(abc.ABC):
    @abc.abstractmethod
    def cast(self, profile) -> dict[str, str]: ...
```

照着 `MiniMaxImageGenerator` 写一个新类即可。然后改 `orchestrator.py:_load_or_cast_voices` 和 `enrich()` 里的 `image_gen = ...` / `music_gen = ...` / `voice_gen = ...` 三行，把它接进去。

### 12.3 加新的 emotion / sound tag

1. `analyzer.py` 把新 emotion 加到 `_EMOTION_WHITELIST` 和 `_CHAPTER_ANALYZER_SYSTEM_TEMPLATE` 里的"WHITELIST"列表
2. `generators.py` `MiniMaxVoiceGenerator._PROSODY` 给新 emotion 加一组 speed/vol/pitch
3. （可选）`MiniMaxVoiceGenerator._SOUND_TAGS` 给新 emotion 加 inline sound tag

注意：下游消费者代码里如果有 emotion → CSS class 映射也要同步更新。

### 12.4 改音乐硬约束

只改一个常量：

```python
# generators.py
MUSIC_REQUIREMENTS_TEXT = "..."     # 新的硬约束描述
```

`sanitize_music_baseline()` / `_compose_prompt()` 都会自动用上新文本。如果还想加新的违禁词，编辑 `_MUSIC_VIOLATION_TOKENS`。

### 12.5 自定义 system prompt

`analyzer.py` 顶部的 `_STORY_ANALYZER_SYSTEM` 和 `_CHAPTER_ANALYZER_SYSTEM_TEMPLATE` 是两份核心 system prompt。改了直接生效（记得保留 JSON schema 部分的 `{}` 不变，否则解析会失败）。

---

## 13. 常见错误排查

### `Unbalanced JSON in response`

LLM 输出被 `max_tokens` 截断了。在 `config.py` 调高：
```python
minimax_text_max_tokens: int = 12000  # 默认 8000
```
（现在有截断恢复机制兜底，但还是建议调高从源头解决。）

### `MiniMax image API error 2013: invalid params, prompt length must be less than 1500`

理论上不会再发生——生成器内部硬截到 1450。如果发生了，说明你改了 `_compose_prompt` 但没保留截断逻辑。

### 章节图里人物长得**每章都不一样**

要么没生成肖像（检查 `portraits.json` 是否存在），要么肖像 URL 过期了（MiniMax CDN URL 几天后失效）。删 `portraits.json` 重跑。

### 章节图根本没出现该角色

打开该章 `chapter_manifest.json` 看 `illustration.characters`。如果不含某角色，说明 ChapterAnalyzer 没把他列进 `image_characters`——这是分析器的判断，可以接受（不是每章主角都该出现在配图里）。

### TXT / PDF 章节切错了

打开命令行输出，找类似这行：
```
⚠️  Heuristic chapter split looks unreliable (...). Asking MiniMax to re-detect chapter boundaries…
```
LLM 兜底已经做了。如果还是切错，看 `chapter_detector.py:_DETECTOR_SYSTEM` system prompt 是否需要针对你的书做调整。

### 音乐听起来"激烈了 / 有人声"

不应该发生（多层硬约束）。如果发生：
1. 看跑的时候有没有打 `⚠️  music_baseline / music_mood 含违禁词`
2. 检查 `story_profile.json` 里 `music_baseline` 是不是真的合规
3. 如果都没问题但音乐本身仍不合规——是 MiniMax 模型本身的问题，可以重生成一次（删 `music.mp3`）

### `ImportError: No module named 'elevenlabs.types'`

`generators.py` 已经有 stub 兜底了，不会再 crash 启动。如果还报错，说明你用的不是最新版的 `generators.py`，重新下载覆盖。

---

## 14. 成本估算

按 MiniMax 国际版价目近似估算（具体以账户面板为准）：

### 单章成本

| 项目 | 量 | 估算 |
|---|---|---|
| ChapterAnalyzer LLM | 1 次 | ~$0.02-0.05 |
| 1 张章节图 | 1 张 | ~$0.014 |
| 30s 配乐 | 1 段 | ~$0.10 |
| TTS（5 句对白 × 30 字） | 5 次 | ~$0.015 |
| **每章合计** | | **~$0.15-0.20** |

### 一次性投入

| 项目 | 量 | 估算 |
|---|---|---|
| StoryAnalyzer LLM | 1 次（书 <400K chars） | ~$0.05-0.15 |
| StoryAnalyzer LLM map-reduce | N 章摘要 + 1 次汇总 | ~$0.02 × N + $0.10 |
| 角色参考肖像 | 5-10 张 | ~$0.07-0.15 |

### 典型场景

| 场景 | 估算 |
|---|---|
| 10 章短篇（< 80K 字） | $2-3 |
| 30 章中篇（< 200K 字） | $6-8 |
| 263 章超长篇（>1M 字）| $50-70 |

强烈建议：**先 `--max-chapters 1` 跑一章看效果**，对齐质量再放开跑。

---

## License & Contact

内部团队工具，未对外发布。问题找 [项目负责人]。
