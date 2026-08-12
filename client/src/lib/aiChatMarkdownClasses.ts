/**
 * Tailwind + `.ai-chat-markdown` (see `index.css`) for Streamdown / markdown in assistant bubbles.
 */
export const aiChatAssistantMarkdownClassName = [
  "ai-chat-markdown prose prose-sm prose-invert max-w-full min-w-0",
  "prose-p:my-2 prose-p:leading-relaxed prose-headings:my-3 prose-headings:text-foreground",
  "prose-strong:text-foreground prose-li:my-1 prose-ul:my-2 prose-ol:my-2",
  "prose-code:text-emerald-300 prose-code:bg-white/[0.06] prose-code:px-1 prose-code:py-0.5 prose-code:rounded",
  "prose-pre:bg-[#060a14] prose-pre:border prose-pre:border-white/10 prose-pre:rounded-lg prose-pre:text-sm",
  "prose-a:text-cyan-300 prose-a:no-underline hover:prose-a:underline",
  "prose-blockquote:border-l-indigo-400/50 prose-blockquote:text-white/80",
].join(" ");
