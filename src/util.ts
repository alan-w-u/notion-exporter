import * as notion from './notion'
import * as converter from './converter'
import * as component from './component'
import * as fileSystem from './fileSystem'
import * as syncLog from './syncLog'
import {
  DatabaseObjectResponse,
  PageObjectResponse,
  BlockObjectResponse
} from '@notionhq/client/build/src/api-endpoints'

export const warnings: Record<string, Set<string>> = {}

export async function getPageIds(databaseId: string): Promise<string[]> {
  const response = await notion.queryDatabase({ databaseId })

  return response.results.map(page => page.id) || []
}

export function sanitizeText(text: string): string {
  return text
    .replace(/[%<>:"/\\|?*\x00-\x1F]/g, '')
    .trim()
}

export async function getTitles(pageId: string): Promise<{ databaseTitle: string, pageTitle: string }> {
  const page = await notion.getPage({ pageId }) as PageObjectResponse
  let databaseTitle = ''
  let pageTitle = ''

  if (page.parent.type === 'database_id') {
    databaseTitle = await getDatabaseTitle(page.parent.database_id)
  }

  const pageProperties = page.properties

  if (pageProperties.Name?.type === 'title') {
    pageTitle = pageProperties.Name.title[0].plain_text
  } else if (pageProperties.title?.type === 'title') {
    pageTitle = pageProperties.title.title[0].plain_text
  }

  databaseTitle = sanitizeText(databaseTitle)
  pageTitle = sanitizeText(pageTitle)

  return { databaseTitle, pageTitle }
}

export async function getDatabaseTitle(databaseId: string): Promise<string> {
  const database = await notion.getDatabase({ databaseId }) as DatabaseObjectResponse

  return sanitizeText(database.title[0].plain_text)
}

export async function getPageTitle(pageId: string): Promise<string> {
  const page = await notion.getPage({ pageId }) as PageObjectResponse
  const pageProperties = page.properties

  if (pageProperties.Name?.type === 'title') {
    return sanitizeText(pageProperties.Name.title[0].plain_text)
  } else if (pageProperties.title?.type === 'title') {
    return sanitizeText(pageProperties.title.title[0].plain_text)
  }

  return ''
}

export async function getPageLastEditedTime(pageId: string): Promise<string> {
  const page = await notion.getPage({ pageId }) as PageObjectResponse

  return page.last_edited_time
}

export async function getPageMetadata(pageId: string): Promise<string> {
  const page = await notion.getPage({ pageId }) as PageObjectResponse
  const metadata = Object.entries(page).map(([key, value]) => {
    if (typeof value === 'string' || key && !value) {
      return `${key}: ${value}`
    }

    return `${key}: "${JSON.stringify(value)}"`
  }).join('\n')

  return metadata
}

export async function parseDatabases(
  { databaseIds }: { databaseIds: string[] }
): Promise<void> {
  await Promise.all(databaseIds.map(async databaseId => parseDatabase({ databaseId })))
}

export async function parseDatabase(
  { databaseId }: { databaseId: string }
): Promise<void> {
  const databaseTitle = await getDatabaseTitle(databaseId)
  const pageIds = await getPageIds(databaseId)

  await parsePages({ pageIds, databaseId, databaseTitle })
}

export async function parseAggregates(
  { aggregateIds }: { aggregateIds: string[] }
): Promise<void> {
  await Promise.all(aggregateIds.map(async aggregateId => parseAggregate({ aggregateId })))
}

export async function parseAggregate(
  { aggregateId }: { aggregateId: string }
): Promise<void> {
  const blockChildren = await notion.getBlockChildren({ blockId: aggregateId })
  const blocks = blockChildren.results as BlockObjectResponse[]

  for (const block of blocks) {
    let pageId = ''

    if (block.type === 'paragraph' && block.paragraph.rich_text.length > 0) {
      const richText = block.paragraph.rich_text[0]
      const text = richText.href || ''

      if (text.includes('www.notion.so')) {
        if (richText.type === 'mention') {
          // Mention
          pageId = text.substring(text.lastIndexOf('/') + 1)
        } else {
          // URL
          const databasePageId = text.match(/p=([a-f0-9]{32})/)

          if (databasePageId) {
            // Database page link
            pageId = databasePageId[1]
          } else {
            // Direct page link
            pageId = text.substring(text.lastIndexOf('-') + 1)
          }
        }
      }
    } else if (block.type === 'link_to_page' && block.link_to_page.type === 'page_id') {
      // Linked database view
      pageId = block.link_to_page.page_id
    }

    if (!pageId) {
      continue
    }

    const aggregateTitle = await getPageTitle(aggregateId)
    const pageTitle = await getPageTitle(pageId)
    const lastEditedTime = await getPageLastEditedTime(pageId)

    if (!syncLog.modified({ databaseId: aggregateId, databaseTitle: aggregateTitle, pageId, pageTitle, lastEditedTime, fileExtension: 'mdx' })) {
      return
    }

    const codeFence = '---'

    const metadata = `${codeFence}\n${await getPageMetadata(pageId)}\n${codeFence}\n\n`
    const pageContent = await parsePage({ blockId: pageId, content: { value: metadata }, databaseTitle: aggregateTitle, pageTitle })

    const codeFenceStart = pageContent.indexOf(codeFence) + codeFence.length
    const codeFenceEnd = pageContent.indexOf(codeFence, codeFenceStart) + codeFence.length

    const content = pageContent.slice(0, codeFenceEnd) + component.imports() + pageContent.slice(codeFenceEnd)

    fileSystem.write({ folderName: aggregateTitle, fileName: pageTitle, fileContent: content, fileExtension: 'mdx' })
    syncLog.update({ databaseId: aggregateId, databaseTitle: aggregateTitle, pageId, pageTitle, lastEditedTime })
    syncLog.save()
  }
}

export async function parsePages(
  { pageIds, databaseId, databaseTitle }:
    { pageIds: string[], databaseId: string, databaseTitle: string }
): Promise<void> {
  await Promise.all(pageIds.map(async pageId => {
    const pageTitle = await getPageTitle(pageId)
    const lastEditedTime = await getPageLastEditedTime(pageId)

    if (!syncLog.modified({ databaseId, databaseTitle, pageId, pageTitle, lastEditedTime, fileExtension: 'mdx' })) {
      return
    }

    const codeFence = '---'

    const metadata = `${codeFence}\n${await getPageMetadata(pageId)}\n${codeFence}\n\n`
    const pageContent = await parsePage({ blockId: pageId, content: { value: metadata }, databaseTitle, pageTitle })

    const codeFenceStart = pageContent.indexOf(codeFence) + codeFence.length
    const codeFenceEnd = pageContent.indexOf(codeFence, codeFenceStart) + codeFence.length

    const content = pageContent.slice(0, codeFenceEnd) + component.imports() + pageContent.slice(codeFenceEnd)

    fileSystem.write({ folderName: databaseTitle, fileName: pageTitle, fileContent: content, fileExtension: 'mdx' })
    syncLog.update({ databaseId, databaseTitle, pageId, pageTitle, lastEditedTime })
    syncLog.save()
  }))
}

export async function parsePage(
  { blockId, content = { value: '' }, databaseTitle = '', pageTitle = '', parentType = '', indentation = 0, index = 0, lastIndex = 0, markdownSyntax = false }:
    { blockId: string, content?: { value: string }, databaseTitle?: string, pageTitle?: string, parentType?: string, indentation?: number, index?: number, lastIndex?: number, markdownSyntax?: boolean }
): Promise<string> {
  const block = await notion.getBlock({ blockId }) as BlockObjectResponse
  const type = block.type

  // Convert block content
  let response = await converter.convert({ block, databaseTitle, pageTitle, parentType, indentation, index, lastIndex, markdownSyntax })

  // Indentation for content in bulleted list item
  if (type !== 'bulleted_list_item' && parentType === 'bulleted_list_item') {
    response = converter.indent(`${response}\n`)
  }

  // Indentation for content in numbered list item
  if (type !== 'numbered_list_item' && parentType === 'numbered_list_item') {
    response = converter.indent(`${response}\n`)
  }

  // Indentation for content in toggle
  if (type !== 'toggle' && parentType === 'toggle') {
    response = converter.indent(`<div style="margin-inline-start: ${(indentation + 1) * 10}px;">${response}</div>\n`)
  }

  // Save content to the accumulator
  content.value = content.value.concat(response)

  // Base case
  if (!block.has_children) {

    // Closing tag for empty bulleted list item
    if (type === 'bulleted_list_item' && parentType !== 'bulleted_list_item' && !markdownSyntax) {
      content.value = content.value.concat(converter.indent('</ul>\n'))
    }

    // Closing tag for empty numbered list item
    if (type === 'numbered_list_item' && parentType !== 'numbered_list_item' && !markdownSyntax) {
      content.value = content.value.concat(converter.indent('</ol>\n'))
    }

    // Closing tag for empty toggle
    if (type === 'toggle') {
      content.value = content.value.concat(converter.indent('</details>\n'))
    }

    return ''
  }

  // Indentation for nested items
  if (converter.indentTypes.includes(type)) {
    indentation++
  }

  // Fetch child blocks
  const blockChildren = await notion.getBlockChildren({ blockId })
  const blocks = blockChildren.results as BlockObjectResponse[]

  // Traverse child blocks
  for (let i = 0; i < blocks.length; i++) {

    // Check for delimiter
    if (component.delimiterState(blocks[i])) {
      const componentType = component.type(blocks[i])
      const componentBlocks: BlockObjectResponse[] = []

      if (componentType === 'metadata') {
        content.value = content.value.slice(0, -5)
      }

      // Skip start delimiter
      i++

      while (component.delimiterState(blocks[i]) !== false && i < blocks.length) {

        // Omit converting skipped content to avoid unnecessary processing and asset downloads
        if (componentType !== 'skip') {
          componentBlocks.push(blocks[i])
        }

        i++
      }

      const componentTag = await component.ingest(componentType, componentBlocks)

      content.value = content.value.concat(componentTag, '\n\n')
    } else if (blocks[i]) {
      await parsePage({ blockId: blocks[i].id, content, databaseTitle, pageTitle, parentType: type, indentation, index: i, lastIndex: blocks.length - 1, markdownSyntax })
    }
  }

  // Closing tag for root bulleted list item
  if (type === 'bulleted_list_item' && parentType !== 'bulleted_list_item' && !markdownSyntax) {
    content.value = content.value.concat('</ul>\n\n')
  }

  // Closing tag for root numbered list item
  if (type === 'numbered_list_item' && parentType !== 'numbered_list_item' && !markdownSyntax) {
    content.value = content.value.concat('</ol>\n\n')
  }

  // Closing tag for nested and root toggle
  if (type === 'toggle') {
    if (parentType === 'toggle') {
      // Nested toggle
      content.value = content.value.concat(converter.indent('</details>\n'))
    } else {
      // Root toggle
      content.value = content.value.concat('</details>\n\n')
    }
  }

  // Line break for end of a root
  if (converter.lineBreakTypes.includes(type) && !converter.lineBreakTypes.includes(parentType)) {
    content.value = content.value.concat('\n')
  }

  return content.value
}
