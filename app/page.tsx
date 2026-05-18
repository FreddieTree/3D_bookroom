import { MobileContainer } from "@/app/components/layout/MobileContainer";

export default function Home() {
  return (
    <MobileContainer>
      <main className="mx-auto flex w-full max-w-[22rem] flex-1 flex-col px-6 py-14 sm:px-8">
        <header className="mb-12 space-y-4">
          <p className="font-sans text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Demo
          </p>
          <h1 className="font-serif text-3xl font-semibold leading-tight text-foreground sm:text-[2rem]">
            三维书屋
          </h1>
          <p className="font-sans text-lg text-muted-foreground">AI 沉浸式阅读伴侣</p>
        </header>

        <div className="font-serif space-y-6 text-[1.05rem] leading-[1.85] text-foreground sm:text-lg sm:leading-loose">
          <p className="[text-indent:2em]">
            这里是一段示例正文，用来验证中文衬线与英文衬线混排的阅读节奏。Warm
            paper tone, restrained margins, and unhurried line height aim for an Apple Books–like calm.
          </p>
          <p className="[text-indent:2em]">
            第二段略短一些，保持留白与节奏：移动端优先、安全区与 100dvh
            已生效时，整页应稳稳贴齐视口，不被浏览器 chrome 挤压。
          </p>
        </div>

        <div className="mt-14">
          <button
            type="button"
            className="font-sans inline-flex h-12 w-full items-center justify-center rounded-xl bg-primary px-6 text-[0.9375rem] font-medium text-primary-foreground shadow-[var(--shadow-soft)] transition-[transform,box-shadow] active:scale-[0.99] sm:w-auto"
          >
            开始阅读
          </button>
        </div>
      </main>
    </MobileContainer>
  );
}
