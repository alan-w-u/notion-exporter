import {
  RichTextItemResponse,
  BlockObjectResponse,
  ParagraphBlockObjectResponse,
  Heading1BlockObjectResponse,
  Heading2BlockObjectResponse,
  Heading3BlockObjectResponse,
  BulletedListItemBlockObjectResponse,
  NumberedListItemBlockObjectResponse,
  QuoteBlockObjectResponse,
  ToDoBlockObjectResponse,
  ToggleBlockObjectResponse,
  TemplateBlockObjectResponse,
  SyncedBlockBlockObjectResponse,
  ChildPageBlockObjectResponse,
  ChildDatabaseBlockObjectResponse,
  EquationBlockObjectResponse,
  CodeBlockObjectResponse,
  CalloutBlockObjectResponse,
  DividerBlockObjectResponse,
  BreadcrumbBlockObjectResponse,
  TableOfContentsBlockObjectResponse,
  ColumnListBlockObjectResponse,
  ColumnBlockObjectResponse,
  LinkToPageBlockObjectResponse,
  TableBlockObjectResponse,
  TableRowBlockObjectResponse,
  EmbedBlockObjectResponse,
  BookmarkBlockObjectResponse,
  ImageBlockObjectResponse,
  VideoBlockObjectResponse,
  PdfBlockObjectResponse,
  FileBlockObjectResponse,
  AudioBlockObjectResponse,
  LinkPreviewBlockObjectResponse,
  UnsupportedBlockObjectResponse
} from '@notionhq/client/build/src/api-endpoints'

export const enumerationList: string[] = [
  'bulleted_list_item',
  'numbered_list_item'
]

const annotationMap: { [key: string]: (text: string) => string } = {
  'bold': bold,
  'italic': italic,
  'strikethrough': strikethrough,
  'underline': underline,
  'code': code
}

const typeMap: { [key: string]: (block: any) => string } = {
  'paragraph': paragraph,
  'heading_1': heading_1,
  'heading_2': heading_2,
  'heading_3': heading_3,
  'bulleted_list_item': bulleted_list_item,
  'numbered_list_item': numbered_list_item,
  'callout': callout
}

// Flag to determine whether to display block types with missing conversion functions
const MISSING_TYPES = false

export function convert(
  block: BlockObjectResponse,
  indentation: number
): string {
  let response = ''
  const type = block.type

  // Apply block type styling
  if (typeof typeMap[type] === 'function') {
    response = typeMap[type](block)
  } else if (MISSING_TYPES) {
    response = `[${type.toUpperCase()}]`
  }

  // Add indentation
  if (indentation !== 0) {
    response = indent(response, indentation)
  }

  return response
}

function getText(
  block: Partial<BlockObjectResponse>
): string {
  let response = ''
  const content = block[block.type as keyof BlockObjectResponse] as Object

  if (content && 'rich_text' in content) {
    for (const textContent of content.rich_text as RichTextItemResponse[]) {
      if (textContent.type === 'text' && textContent.text) {
        let text = textContent.text.content
  
        // Apply annotation styling
        for (const [annotation, enabled] of Object.entries(textContent.annotations)) {
          if (annotationMap[annotation] && enabled) {
            text = annotationMap[annotation](text)
          }
        }

        response = response.concat(text)
      }
    }
  }

  return response
}

// General styling
function indent(text: string, indentation: number): string {
  return `${'    '.repeat(indentation)}${text}`
}

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

function code(text: string): string {
  return `<code>${text}</code>`
}

// Block type styling
function paragraph(block: ParagraphBlockObjectResponse): string {
  const text = getText(block)

  return `${text}`
}

function heading_1(block: Heading1BlockObjectResponse): string {
  const text = getText(block)

  return `# ${text}`
}

function heading_2(block: Heading2BlockObjectResponse): string {
  const text = getText(block)

  return `## ${text}`
}

function heading_3(block: Heading3BlockObjectResponse): string {
  const text = getText(block)

  return `### ${text}`
}

function bulleted_list_item(block: BulletedListItemBlockObjectResponse): string {
  const text = getText(block)

  return `- ${text}`
}

function numbered_list_item(block: NumberedListItemBlockObjectResponse): string {
  const text = getText(block)

  return `1. ${text}`
}

function callout(block: CalloutBlockObjectResponse): string {
  const text = getText(block)

  switch (block.callout.icon?.type) {
    case 'emoji':
      return `${block.callout.icon.emoji} ${text}`
    case 'external':
      return `<img src="${block.callout.icon.external.url}" width="25" style="vertical-align: middle"> ${text}`
    case 'file':
      return `${text}` // TODO:
    case 'custom_emoji':
      return `${text}` // TODO:
    default:
      return text
  }
}
