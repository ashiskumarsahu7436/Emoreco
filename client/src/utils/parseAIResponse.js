export function parseAIResponse(text) {
  if (!text) return { thinking: null, answer: '' }

  const blocks = []
  const thinkRegex = /<think>([\s\S]*?)<\/think>/gi
  let lastIndex = 0
  let match
  const thinkingParts = []
  const answerParts = []

  while ((match = thinkRegex.exec(text)) !== null) {
    const before = text.slice(lastIndex, match.index).trim()
    if (before) answerParts.push(before)
    thinkingParts.push(match[1].trim())
    lastIndex = match.index + match[0].length
  }

  const after = text.slice(lastIndex).trim()
  if (after) answerParts.push(after)

  return {
    thinking: thinkingParts.length > 0 ? thinkingParts.join('\n\n') : null,
    answer: answerParts.join('\n\n'),
  }
}
