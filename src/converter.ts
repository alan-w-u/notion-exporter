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

// Do not convert
const omitTypes: string[] = [
  'template',
  'child_page',
  'child_database',
  'breadcrumb',
  'table_of_contents',
  'column_list',
  'column',
  'link_to_page',
  'unsupported'
]

// Have indentation
export const indentTypes: string[] = [
  'bulleted_list_item',
  'numbered_list_item',
  'to_do',
  'toggle'
]

// Append with line break
export const lineBreakTypes: string[] = [
  'bulleted_list_item',
  'numbered_list_item',
  'toggle',
  'table',
  'table_row'
]

// Preview icons
const previewMap: Record<string, string> = {
  drive: 'https://s3-us-west-2.amazonaws.com/public.notion-static.com/8fb58690-ee50-4584-b9fd-ca9b524f56aa/google-drive-icon-19632.png',
  figma: 'https://www.notion.so/images/external_integrations/figma-icon.png',
  github: 'https://www.notion.so/images/external_integrations/github-icon.png'
}

// Annotation style conversions
const annotationMap: Record<string, (text: string) => string> = {
  bold,
  italic,
  strikethrough,
  underline,
  code: codeInline
}

// Block type style conversions
const blockTypeMap: Record<string, (block: any) => string | Promise<string>> = {
  paragraph,
  heading_1,
  heading_2,
  heading_3,
  bulleted_list_item,
  numbered_list_item,
  quote,
  to_do,
  toggle,
  template,
  synced_block,
  child_page,
  child_database,
  equation,
  code,
  callout,
  divider,
  breadcrumb,
  table_of_contents,
  column_list,
  column,
  link_to_page,
  table,
  table_row,
  embed,
  bookmark,
  image,
  video,
  pdf,
  file,
  audio,
  link_preview,
  unsupported
}

let _databaseTitle: string
let _pageTitle: string
let _parentType: string
let _indentation: number
let _index: number
let _lastIndex: number
let _markdownSyntax: boolean

export async function convert(
  { block, databaseTitle = '', pageTitle = '', parentType = '', indentation = 0, index = 0, lastIndex = 0, markdownSyntax = false }:
    { block: BlockObjectResponse, databaseTitle?: string, pageTitle?: string, parentType?: string, indentation?: number, index?: number, lastIndex?: number, markdownSyntax?: boolean }
): Promise<string> {
  _databaseTitle = databaseTitle
  _pageTitle = pageTitle
  _parentType = parentType
  _indentation = indentation
  _index = index
  _lastIndex = lastIndex
  _markdownSyntax = markdownSyntax

  const type = block.type

  // Skip omitted type
  if (omitTypes.includes(type)) {
    util.warnings[pageTitle] = util.warnings[pageTitle] || new Set()
    util.warnings[pageTitle].add(type)

    return ''
  }

  let response = ''

  // Apply block type styling
  if (blockTypeMap[type]) {
    response = await blockTypeMap[type](block)
  }

  const caption = getCaption(block)

  // Apply caption
  if (caption) {
    if (markdownSyntax) {
      response = response.concat('\n<br>\n', getCaption(block))
    } else {
      response = `<figure>\n\t${response}\n\t<figcaption>${caption}</figcaption>\n</figure>`
    }
  }

  const bulletedListItemContent = type !== 'bulleted_list_item' && parentType === 'bulleted_list_item'
  const numberedListItemContent = type !== 'numbered_list_item' && parentType === 'numbered_list_item'
  const toggleContent = type !== 'toggle' && parentType === 'toggle'

  // Apply indentation
  if (indentation !== 0 && type !== 'to_do' && !bulletedListItemContent && !numberedListItemContent && !toggleContent) {
    response = indent(response)
  }

  // Apply newline
  if (!omitTypes.includes(type) && !bulletedListItemContent && !numberedListItemContent && !toggleContent) {
    if (lineBreakTypes.includes(type) || lineBreakTypes.includes(parentType) || response === '') {
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
  const content = block[block.type as keyof BlockObjectResponse] as Object

  if ('rich_text' in content) {
    return formatContent(content.rich_text as RichTextItemResponse[])
  }

  return ''
}

function getCaption(block: Partial<BlockObjectResponse>): string {
  const content = block[block.type as keyof BlockObjectResponse] as Object

  if ('caption' in content) {
    return formatContent(content.caption as RichTextItemResponse[])
  }

  return ''
}

function formatContent(contentBlocks: RichTextItemResponse[]): string {
  let response = ''

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

async function downloadAsset(blockId: string, url: string): Promise<string> {
  return await fileSystem.download({ folderName: _databaseTitle, fileName: _pageTitle + ' ' + blockId, url })
}

// General styling
export function indent(text: string, offset: number = 0): string {
  return `${'\t'.repeat(_indentation + offset)}${text}`
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

function codeInline(text: string): string {
  return `<code>${text}</code>`
}

// Block type styling
function paragraph(block: ParagraphBlockObjectResponse): string {
  const text = getText(block)

  return text
}

function heading_1(block: Heading1BlockObjectResponse): string {
  const text = getText(block)

  if (_markdownSyntax) {
    return `# ${text}`
  }

  return `<h1>${text}</h1>`
}

function heading_2(block: Heading2BlockObjectResponse): string {
  const text = getText(block)

  if (_markdownSyntax) {
    return `## ${text}`
  }

  return `<h2>${text}</h2>`
}

function heading_3(block: Heading3BlockObjectResponse): string {
  const text = getText(block)

  if (_markdownSyntax) {
    return `### ${text}`
  }

  return `<h3>${text}</h3>`
}

function bulleted_list_item(block: BulletedListItemBlockObjectResponse): string {
  const text = getText(block)

  if (_markdownSyntax) {
    return `- ${text}`
  }

  if (_parentType !== 'bulleted_list_item' || _parentType === 'bulleted_list_item' && _index === 0) {
    return `<ul>\n${indent(`<li>${text}</li>`, 1)}`
  }

  if (_parentType === 'bulleted_list_item' && _index === _lastIndex) {
    return `\t<li>${text}</li>\n${indent(`</ul>`)}`
  }

  return `\t<li>${text}</li>`
}

function numbered_list_item(block: NumberedListItemBlockObjectResponse): string {
  const text = getText(block)

  if (_markdownSyntax) {
    return `1. ${text}`
  }

  if (_parentType !== 'numbered_list_item' || _parentType === 'numbered_list_item' && _index === 0) {
    return `<ol>\n${indent(`<li>${text}</li>`, 1)}`
  }

  if (_parentType === 'numbered_list_item' && _index === _lastIndex) {
    return `\t<li>${text}</li>\n${indent(`</ol>`)}`
  }

  return `\t<li>${text}</li>`
}

function quote(block: QuoteBlockObjectResponse): string {
  const text = getText(block)

  if (_markdownSyntax) {
    return `> ${text}`
  }

  return `<blockquote>\n${text}\n</blockquote>`
}

function to_do(block: ToDoBlockObjectResponse): string {
  const text = getText(block)

  return `<label style="margin-inline-start: ${_indentation * 10}px;">\n\t<input type="checkbox">${text}\n</label>`
}

function toggle(block: ToggleBlockObjectResponse): string {
  const text = getText(block)

  return `<details>\n${indent(`<summary style="margin-inline-start: ${(_indentation + 1) * 10}px;">${text}</summary>`, 1)}`
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
  const urlTitle = encodeURI(title)
  const urlId = block.id.replace(/-/g, '')
  const parentTitle = encodeURI(_pageTitle)
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

function code(block: CodeBlockObjectResponse): string {
  const code = getText(block)
  const language = block.code.language

  if (_markdownSyntax) {
    return `\`\`\`${language}\n${code}\n\`\`\``
  }

  return `<pre><code class="${language}">\n${code}\n</code></pre>`
}

async function callout(block: CalloutBlockObjectResponse): Promise<string> {
  const text = getText(block)
  let url = ''

  switch (block.callout.icon?.type) {
    case 'emoji':
      return `<aside>\n\t${block.callout.icon.emoji} ${text}\n</aside>`
    case 'external':
      url = block.callout.icon.external.url
      break
    case 'file':
      url = await downloadAsset(block.id, block.callout.icon.file.url)
      break
    case 'custom_emoji':
      url = block.callout.icon.custom_emoji.url
      break
  }

  return `<aside>\n\t<img src="${url}" alt="${url}" style="height: 1.5em; vertical-align: middle;" />${text}\n</aside>`
}

function divider(block: DividerBlockObjectResponse): string {
  return '---'
}

function breadcrumb(block: BreadcrumbBlockObjectResponse): string {
  // Omitted
  return ''
}

function table_of_contents(block: TableOfContentsBlockObjectResponse): string {
  // Omitted
  return ''
}

function column_list(block: ColumnListBlockObjectResponse): string {
  // Omitted
  return ''
}

function column(block: ColumnBlockObjectResponse): string {
  // Omitted
  return ''
}

function link_to_page(block: LinkToPageBlockObjectResponse): string {
  // Omitted
  let urlId = ''
  let title = ''

  switch (block.link_to_page.type) {
    case 'database_id':
      urlId = block.link_to_page.database_id
      title = _databaseTitle
      break
    case 'page_id':
      urlId = block.link_to_page.page_id
      title = _pageTitle
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

  if (_index === 0) {
    row = row.concat('|\n', '| --- '.repeat(cells.length), '|')
  }

  return row
}

function embed(block: EmbedBlockObjectResponse): string {
  const url = block.embed.url
  const title = url.split('/').pop()

  if (_markdownSyntax) {
    return `[${title}](${url})`
  }

  return `<embed src="${url}" />`
}

function bookmark(block: BookmarkBlockObjectResponse): string {
  const url = block.bookmark.url
  const domain = new URL(url).hostname

  if (_markdownSyntax) {
    return `[${domain}](${url})`
  }

  return `<a href="${url}">${domain}</a>`
}

async function image(block: ImageBlockObjectResponse): Promise<string> {
  let url = ''

  switch (block.image.type) {
    case 'external':
      url = block.image.external.url
      break
    case 'file':
      const filePath = await downloadAsset(block.id, block.image.file.url)
      url = encodeURI(filePath)
      break
  }

  if (_markdownSyntax) {
    return `![](${url})`
  }

  return `<img src="${url}" alt="${url}" />`
}

async function video(block: VideoBlockObjectResponse): Promise<string> {
  let url = ''
  let title = ''

  switch (block.video.type) {
    case 'external':
      url = block.video.external.url
      title = url
      break
    case 'file':
      const filePath = await downloadAsset(block.id, block.video.file.url)
      url = encodeURI(filePath)
      title = filePath.split('/').pop() || ''
      break
  }

  if (_markdownSyntax) {
    return `[${title}](${url})`
  }

  switch (block.video.type) {
    case 'external':
      return `<iframe src="${url}" />`
    case 'file':
      return `<video controls>\n\t<source src="${url}" />\n</video>`
  }
}

async function pdf(block: PdfBlockObjectResponse): Promise<string> {
  let url = ''
  let title = ''

  switch (block.pdf.type) {
    case 'external':
      url = block.pdf.external.url
      title = url.split('/').pop() || ''
      break
    case 'file':
      const filePath = await downloadAsset(block.id, block.pdf.file.url)
      url = encodeURI(filePath)
      title = filePath.split('/').pop() || ''
      break
  }

  if (_markdownSyntax) {
    return `[${title}](${url})`
  }

  switch (block.pdf.type) {
    case 'external':
      return `<iframe src="https://docs.google.com/viewer?url=${url}&embedded=true" />`
    case 'file':
      return `<iframe src="${url}" />`
  }
}

async function file(block: FileBlockObjectResponse): Promise<string> {
  const title = block.file.name
  let url = ''

  switch (block.file.type) {
    case 'external':
      url = block.file.external.url
      break
    case 'file':
      const filePath = await downloadAsset(block.id, block.file.file.url)
      url = encodeURI(filePath)
      break
  }

  if (_markdownSyntax) {
    return `[${title}](${url})`
  }

  return `<a href="${url}">${title}</a>`
}

async function audio(block: AudioBlockObjectResponse): Promise<string> {
  let url = ''
  let title = ''

  switch (block.audio.type) {
    case 'external':
      url = block.audio.external.url
      title = url
      break
    case 'file':
      const filePath = await downloadAsset(block.id, block.audio.file.url)
      url = encodeURI(filePath)
      title = filePath.split('/').pop() || ''
      break
  }

  if (_markdownSyntax) {
    return `[${title}](${url})`
  }

  return `<audio controls>\n\t<source src="${url}" />\n</audio>`
}

function link_preview(block: LinkPreviewBlockObjectResponse): string {
  const url = block.link_preview.url
  const title = url.split('/').pop()
  const domain = new URL(url).hostname
  const sld = domain.split('.')[0]
  const previewUrl = previewMap[sld]

  if (_markdownSyntax) {
    return `[<img src="${previewUrl}" alt="${previewUrl}" style="height: 1.5em; vertical-align: middle;" />${title}](${url})`
  }

  return `<a href="${url}">\n\t<img src="${previewUrl}" alt="${previewUrl}" style="height: 1.5em; vertical-align: middle;" />${title}\n</a>`
}

function unsupported(block: UnsupportedBlockObjectResponse): string {
  return ''
}
