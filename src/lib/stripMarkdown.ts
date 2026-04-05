/**
 * Strips markdown formatting artifacts from AI-generated text.
 * Removes headers (##), bold (**), italic (*), code blocks, bullet markers, etc.
 */
export function stripMarkdown(text: string): string {
  if (!text) return "";
  return text
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, (match) => match.replace(/```\w*\n?/g, "").replace(/```/g, "").trim())
    // Remove headers
    .replace(/^#{1,6}\s+/gm, "")
    // Remove bold/italic
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    // Remove inline code
    .replace(/`([^`]+)`/g, "$1")
    // Remove bullet markers but keep content
    .replace(/^\s*[-*+]\s+/gm, "• ")
    // Remove numbered list markers
    .replace(/^\s*\d+\.\s+/gm, "")
    // Clean up extra whitespace
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
