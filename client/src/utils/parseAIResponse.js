/**
 * Parses AI responses that may contain <think>...</think> reasoning blocks.
 *
 * Handles three formats emitted by reasoning models (e.g. Qwen3):
 *  1. <think>…</think> answer text          ← closed block + answer after
 *  2. <think>…</think>                      ← closed block, answer IS last part of think
 *  3. <think>… (no closing tag)             ← unclosed block (truncated / inline answer)
 */
export function parseAIResponse(text) {
  if (!text) return { thinking: null, answer: '' }

  const thinkingParts = []
  const answerParts = []

  // ── Step 1: extract closed <think>…</think> pairs ──
  const closedRegex = /<think>([\s\S]*?)<\/think>/gi
  let lastIndex = 0
  let match

  while ((match = closedRegex.exec(text)) !== null) {
    const before = text.slice(lastIndex, match.index).trim()
    if (before) answerParts.push(before)
    thinkingParts.push(match[1].trim())
    lastIndex = match.index + match[0].length
  }

  let remaining = text.slice(lastIndex).trim()

  // ── Step 2: handle unclosed <think> in remaining text ──
  const unclosedIdx = remaining.search(/<think>/i)
  if (unclosedIdx !== -1) {
    const before = remaining.slice(0, unclosedIdx).trim()
    if (before) answerParts.push(before)
    const afterTag = remaining.slice(unclosedIdx + '<think>'.length).trim()
    if (afterTag) thinkingParts.push(afterTag)
    remaining = ''
  }

  if (remaining) answerParts.push(remaining)

  // ── Step 3: if no answer text was found but thinking exists,
  //    pull the last non-empty paragraph of the thinking block as the answer.
  //    Reasoning models (Qwen3 etc.) sometimes place the final answer
  //    at the end of the <think> block without a separate response. ──
  let answer = answerParts.join('\n\n').trim()
  const thinking = thinkingParts.length > 0 ? thinkingParts.join('\n\n') : null

  if (!answer && thinking) {
    const paragraphs = thinking
      .split(/\n{2,}/)
      .map(p => p.trim())
      .filter(Boolean)

    if (paragraphs.length > 0) {
      // Use the last paragraph as the visible answer
      answer = paragraphs[paragraphs.length - 1]
    }
  }

  return { thinking, answer }
}
