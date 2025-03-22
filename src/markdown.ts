import {
  MarkdownOptions
} from './interfaces'
import {
  RichTextItemResponse
} from '@notionhq/client/build/src/api-endpoints'

// Flag to determine whether to display block types with missing conversion functions
const MISSING_TYPES = false

export const enumerationList: string[] = [
  'bulleted_list_item',
  'numbered_list_item'
]

const annotationMap: { [key: string]: (text: string) => string } = {
  'bold': bold,
  'italic': italic,
  'strikethrough': strikethrough,
  'underline': underline,
  'code': inlineCode
}

const typeMap: { [key: string]: (text: string, opts: MarkdownOptions) => string } = {
  'paragraph': paragraph,
  'heading_1': heading_1,
  'heading_2': heading_2,
  'heading_3': heading_3,
  'bulleted_list_item': bulleted_list_item,
  'numbered_list_item': numbered_list_item,
  'callout': callout
}

export function convertText(
  content: RichTextItemResponse,
  type: string,
  { start, indentation, enumerator, icon }: MarkdownOptions = {}
): string {
  let text = ''

  // Extract content based on the type
  if (content.type === 'text') {
    text = content.text.content
  } else if (content.type === 'mention') {
    // TODO:
  } else if (content.type === 'equation') {
    text = content.equation.expression
  }

  // Apply annotation styling
  for (const [annotation, enabled] of Object.entries(content.annotations)) {
    if (annotationMap[annotation] && enabled) {
      text = annotationMap[annotation](text)
    }
  }

  // Apply block type styling
  if (typeMap[type] && typeof typeMap[type] === 'function') {
    text = typeMap[type](text, arguments[2])
  } else if (MISSING_TYPES) {
    text = `[${type.toUpperCase()}]`
  }

  // Add indentation
  if (start && indentation && indentation !== 0) {
    text = indent(text, indentation)
  }

  return text
}

// General styling
function indent(text: string, indentation: number): string {
  return `${'    '.repeat(indentation)}${text}`
}

// export function nextEnumerator(enumerator: number | string): number | string {
//   if (typeof enumerator === 'number') {
//     return enumerator++
//   }
  
//   if (typeof enumerator === 'string') {
//     if (enumerator === 'z') {
//       return 'a'
//     } else if (enumerator === 'Z') {
//       return 'A'
//     } else {
//       return String.fromCharCode(enumerator.charCodeAt(0) + 1)
//     }
//   }

//   return enumerator
// }

// Annotation styling
function bold(text: string): string {
  return `<b>${text}</b>`
}

function italic(text: string): string {
  return `<i>${text}</i>`
}

function strikethrough(text: string): string {
  return `<s>${text}</s>`
}

function underline(text: string): string {
  return `<u>${text}</u>`
}

function inlineCode(text: string): string {
  return `<code>${text}</code>`
}

function blockCode(text: string): string {
  return `<pre><code>${text}</code></pre>`
}

// Block type styling
function paragraph(text: string): string {
  return `${text}`
}

function heading_1(text: string): string {
  return `# ${text}`
}

function heading_2(text: string): string {
  return `## ${text}`
}

function heading_3(text: string): string {
  return `### ${text}`
}

function bulleted_list_item(text: string) {
  return `- ${text}`
}

function numbered_list_item(text: string, opts: MarkdownOptions): string {
  return opts.start ? `${opts.enumerator || 1}. ${text}` : text
}

function callout(text: string, opts: MarkdownOptions): string {
  if (opts.start && opts.icon) {
    if (opts.icon.type === 'emoji') {
      return `${opts.icon.emoji} ${text}`
    } else if (opts.icon.type === 'external') {
      return `<img src="${opts.icon.external.url}" width="25"> ${text}`
    }
  }

  return text
}
