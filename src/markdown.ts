import * as util from './util'
import * as fileSystem from './fileSystem'
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

// Can have indentation via HTML styling
const indentStyleTypes: string[] = [
  'to_do',
  'toggle'
]

// Can have indentation
export const indentTypes: string[] = [
  ...indentStyleTypes,
  'bulleted_list_item',
  'numbered_list_item'
]

// Can have captions
const captionTypes: string[] = [
  'code',
  'embed',
  'bookmark',
  'image',
  'video',
  'pdf',
  'file'
]

// Do not convert
const omitTypes: string[] = [
  'template',
  'child_page',
  'child_database',
  'link_to_page',
  'unsupported'
]

// Append with no new line
const inlineTypes: string[] = [
  ...omitTypes,
  'breadcrumb',
  'table_of_contents',
  'column_list',
  'column',
  'table'
]

// Append with line break \n
const lineBreakTypes: string[] = [
  'bulleted_list_item',
  'numbered_list_item',
  'toggle',
  'table_row'
]

// Preview icons
const previewMap: { [key: string]: string } = {
  'drive': 'https://s3-us-west-2.amazonaws.com/public.notion-static.com/8fb58690-ee50-4584-b9fd-ca9b524f56aa/google-drive-icon-19632.png',
  'figma': 'https://www.notion.so/images/external_integrations/figma-icon.png',
  'github': 'https://www.notion.so/images/external_integrations/github-icon.png'
}

// Annotation style conversion map
const annotationMap: { [key: string]: (text: string) => string } = {
  'bold': bold,
  'italic': italic,
  'strikethrough': strikethrough,
  'underline': underline,
  'code': code
}

// Block type style conversion map
const typeMap: { [key: string]: (block: any) => string | Promise<string> } = {
  'paragraph': paragraph,
  'heading_1': heading_1,
  'heading_2': heading_2,
  'heading_3': heading_3,
  'bulleted_list_item': bulleted_list_item,
  'numbered_list_item': numbered_list_item,
  'quote': quote,
  'to_do': to_do,
  'toggle': toggle,
  'template': template,
  'synced_block': synced_block,
  'child_page': child_page,
  'child_database': child_database,
  'equation': equation,
  'code': codeBlock,
  'callout': callout,
  'divider': divider,
  'breadcrumb': breadcrumb,
  'table_of_contents': table_of_contents,
  'column_list': column_list,
  'column': column,
  'link_to_page': link_to_page,
  'table': table,
  'table_row': table_row,
  'embed': embed,
  'bookmark': bookmark,
  'image': image,
  'video': video,
  'pdf': pdf,
  'file': file,
  'audio': audio,
  'link_preview': link_preview,
  'unsupported': unsupported
}

let blockDatabaseTitle: string = ''
let blockPageTitle: string = ''
let depth: number = 0

export async function convert(
  { block, databaseTitle, pageTitle, parentType, indentation }:
    { block: BlockObjectResponse, databaseTitle: string, pageTitle: string, parentType: string, indentation: number }
): Promise<string> {
  let response: string = ''
  const type = block.type

  // Set title data
  blockDatabaseTitle = databaseTitle
  blockPageTitle = pageTitle

  // Skip omitted type
  if (omitTypes.includes(type)) {
    const error = `\x1b[1m\x1b[31mError:\x1b[0m \x1b[90m${pageTitle}\x1b[0m contains an omitted type: ${type.split('_').join(' ')}`
    util.errors.push(error)

    return response
  }

  // Set nested depth of the content
  depth = indentation

  // Apply block type styling
  if (typeof typeMap[type] === 'function') {
    response = await typeMap[type](block)
  }

  // Reset nested depth
  depth = 0

  // Apply caption
  if (captionTypes.includes(type)) {
    response = response.concat('\n<br>', getCaption(block))
  }

  const isToggleContent = (type !== 'toggle' && parentType === 'toggle')

  // Apply indentation
  if (indentation !== 0 && !indentStyleTypes.includes(type) && !isToggleContent) {
    response = indent(response, indentation)
  }

  // Apply newline
  if (!inlineTypes.includes(type) && !isToggleContent) {
    if (lineBreakTypes.includes(type) || lineBreakTypes.includes(parentType)) {
      // Line break
      response = response.concat('\n')
    } else {
      // Paragraph break
      response = response.concat('\n\n')
    }
  }

  return response
}

function getText(block: Partial<BlockObjectResponse>): string {
  let response: string = ''
  const content = block[block.type as keyof BlockObjectResponse] as Object

  if ('rich_text' in content) {
    response = formatContent(content.rich_text as RichTextItemResponse[])
  }

  return response
}

function getCaption(block: Partial<BlockObjectResponse>): string {
  let response: string = ''
  const content = block[block.type as keyof BlockObjectResponse] as Object

  if ('caption' in content) {
    response = formatContent(content.caption as RichTextItemResponse[])
  }

  return response
}

function formatContent(contentBlocks: RichTextItemResponse[]): string {
  let response: string = ''

  for (const contentBlock of contentBlocks) {
    let content = ''

    // Extract content
    if (contentBlock.type === 'text') {
      content = contentBlock.text.content
    } else if (contentBlock.type === 'equation') {
      content = `\$${contentBlock.equation.expression}\$`
    }

    // Apply annotation styling
    for (const [annotation, enabled] of Object.entries(contentBlock.annotations)) {
      if (annotationMap[annotation] && enabled) {
        content = annotationMap[annotation](content)
      }
    }

    // Apply link styling
    if (contentBlock.type === 'text' && contentBlock.text.link) {
      content = `[${content}](${contentBlock.text.link.url})`
    }

    response = response.concat(content)
  }

  return response
}

// General styling
export function indent(text: string, indentation: number): string {
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

  return text
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

function quote(block: QuoteBlockObjectResponse): string {
  const text = getText(block)

  return `> ${text}`
}

function to_do(block: ToDoBlockObjectResponse): string {
  const text = getText(block)

  return `<label style="margin-left: ${depth * 20}px">\n    <input type="checkbox"> ${text}\n</label>`
}

function toggle(block: ToggleBlockObjectResponse): string {
  const text = getText(block)

  return `${indent(`<details>`, depth)}\n${indent(`<summary style="margin-left: ${(depth + 1) * 10}px">`, depth + 1)}${text}</summary>`
}

function template(block: TemplateBlockObjectResponse): string {
  // Deprecated
  const text = getText(block)

  return text
}

function synced_block(block: SyncedBlockBlockObjectResponse): string {
  const text = getText(block)

  return text
}

function child_page(block: ChildPageBlockObjectResponse): string {
  // Omitted
  const title = block.child_page.title
  const urlTitle = title.replace(/\s+/g, '-')
  const urlId = block.id.replace(/-/g, '')

  return `[${title}](https://www.notion.so/${urlTitle}-${urlId})`
}

function child_database(block: ChildDatabaseBlockObjectResponse): string {
  // Omitted
  const title = block.child_database.title
  const urlTitle = title.replace(/\s+/g, '%20')
  const urlId = block.id.replace(/-/g, '')
  const parentTitle = blockPageTitle.replace(/\s+/g, '%20')
  let parentId = ''

  switch (block.parent.type) {
    case 'database_id':
      parentId = block.parent.database_id
      break
    case 'page_id':
      parentId = block.parent.page_id
      break
    case 'block_id':
      parentId = block.parent.block_id
      break
  }

  parentId = parentId.replace(/-/g, '')

  return `[${title}](${parentTitle}%20${parentId}/${urlTitle}%20${urlId}.csv)`
}

function equation(block: EquationBlockObjectResponse): string {
  const expression = block.equation.expression

  return `$$\n${expression}\n$$`
}

function codeBlock(block: CodeBlockObjectResponse): string {
  const code = getText(block)
  const language = block.code.language

  return `\`\`\`${language}\n${code}\n\`\`\``
}

async function callout(block: CalloutBlockObjectResponse): Promise<string> {
  const text = getText(block)

  switch (block.callout.icon?.type) {
    case 'emoji':
      return `<aside>\n${block.callout.icon.emoji} ${text}\n</aside>`
    case 'external':
      const externalUrl = block.callout.icon.external.url
      return `<aside>\n<img src="${externalUrl}" alt="${externalUrl}" width="25" style="vertical-align: middle" /> ${text}\n</aside>`
    case 'file':
      const filePath = await fileSystem.download({ fileName: blockPageTitle + ' ' + block.id, url: block.callout.icon.file.url })
      return `<aside>\n<img src="${filePath.replace(/\s+/g, '%20')}" alt="${filePath}" width="25" style="vertical-align: middle" /> ${text}\n</aside>`
    case 'custom_emoji':
      const emojiUrl = block.callout.icon.custom_emoji.url
      return `<aside>\n<img src="${emojiUrl}" alt="${emojiUrl}" width="25" style="vertical-align: middle" /> ${text}\n</aside>`
    default:
      return text
  }
}

function divider(block: DividerBlockObjectResponse): string {
  return '---'
}

function breadcrumb(block: BreadcrumbBlockObjectResponse): string {
  return ''
}

function table_of_contents(block: TableOfContentsBlockObjectResponse): string {
  return ''
}

function column_list(block: ColumnListBlockObjectResponse): string {
  return ''
}

function column(block: ColumnBlockObjectResponse): string {
  return ''
}

function link_to_page(block: LinkToPageBlockObjectResponse): string {
  // Omitted
  let urlId = ''
  let title = ''

  switch (block.link_to_page.type) {
    case 'database_id':
      urlId = block.link_to_page.database_id
      title = blockDatabaseTitle
      break
    case 'page_id':
      urlId = block.link_to_page.page_id
      title = blockPageTitle
      break
    case 'comment_id':
      urlId = block.link_to_page.comment_id
      break
  }

  urlId = urlId.replace(/-/g, '')

  return `[${title}](https://www.notion.so/${urlId})`
}

function table(block: TableBlockObjectResponse): string {
  return ''
}

function table_row(block: TableRowBlockObjectResponse): string {
  const cells = block.table_row.cells
  let row = ''

  for (const cell of cells) {
    row = row.concat('| ', formatContent(cell), ' ')
  }

  row = row.concat('|\n', '| --- '.repeat(cells.length), '|')

  return row
}

function embed(block: EmbedBlockObjectResponse): string {
  const url = block.embed.url
  const fileName = url.split('/').pop()

  return `[${fileName}](${url})`
}

function bookmark(block: BookmarkBlockObjectResponse): string {
  const url = block.bookmark.url
  const domain = new URL(url).hostname

  return `[${domain}](${url})`
}

async function image(block: ImageBlockObjectResponse): Promise<string> {
  switch (block.image.type) {
    case 'external':
      return `![](${block.image.external.url})`
    case 'file':
      const filePath = await fileSystem.download({ fileName: blockPageTitle + ' ' + block.id, url: block.image.file.url })
      return `![](${filePath.replace(/\s+/g, '%20')})`
  }
}

async function video(block: VideoBlockObjectResponse): Promise<string> {
  switch (block.video.type) {
    case 'external':
      const url = block.video.external.url
      return `[${url}](${url})`
    case 'file':
      const filePath = await fileSystem.download({ fileName: blockPageTitle + ' ' + block.id, url: block.video.file.url })
      const fileName = filePath.split('/').pop()
      return `[${fileName}](${filePath.replace(/\s+/g, '%20')})`
  }
}

async function pdf(block: PdfBlockObjectResponse): Promise<string> {
  switch (block.pdf.type) {
    case 'external':
      const url = block.pdf.external.url
      const title = url.split('/').pop()
      return `[${title}](${url})`
    case 'file':
      const filePath = await fileSystem.download({ fileName: blockPageTitle + ' ' + block.id, url: block.pdf.file.url })
      const fileName = filePath.split('/').pop()
      return `[${fileName}](${filePath.replace(/\s+/g, '%20')})`
  }
}

async function file(block: FileBlockObjectResponse): Promise<string> {
  const fileName = block.file.name

  switch (block.file.type) {
    case 'external':
      return `[${fileName}](${block.file.external.url})`
    case 'file':
      const filePath = await fileSystem.download({ fileName: blockPageTitle + ' ' + block.id, url: block.file.file.url })
      return `[${fileName}](${filePath.replace(/\s+/g, '%20')})`
  }
}

async function audio(block: AudioBlockObjectResponse): Promise<string> {
  switch (block.audio.type) {
    case 'external':
      const url = block.audio.external.url
      return `[${url}](${url})`
    case 'file':
      const filePath = await fileSystem.download({ fileName: blockPageTitle + ' ' + block.id, url: block.audio.file.url })
      const fileName = filePath.split('/').pop()
      return `[${fileName}](${filePath.replace(/\s+/g, '%20')})`
  }
}

function link_preview(block: LinkPreviewBlockObjectResponse): string {
  const url = block.link_preview.url
  const title = url.split('/').pop()
  const domain = new URL(url).hostname
  const sld = domain.split('.')[0]
  const previewUrl = previewMap[sld]

  return `[<img src="${previewUrl}" alt="${previewUrl}" width="25" style="vertical-align: middle" /> ${title}](${url})`
}

function unsupported(block: UnsupportedBlockObjectResponse): string {
  return ''
}
