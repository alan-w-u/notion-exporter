import * as notion from './notion'
import * as markdown from './markdown'
import * as fileSystem from './fileSystem'
import * as syncLog from './syncLog'
import {
  QueryDatabaseParameters,
  DatabaseObjectResponse,
  PageObjectResponse,
  BlockObjectResponse
} from '@notionhq/client/build/src/api-endpoints'

const SORT_DATE_DESCENDING: Partial<QueryDatabaseParameters> = {
  // Descending order by date (newest at start of array)
  sorts: [
    {
      property: 'Start - End Dates',
      direction: 'descending'
    }
  ]
}

export const warnings: Record<string, Set<string>> = {}

export async function getPageIds(databaseId: string, opts: Partial<QueryDatabaseParameters> = SORT_DATE_DESCENDING): Promise<string[]> {
  const response = await notion.queryDatabase({ databaseId, opts })

  return response.results.map(page => page.id) || []
}

export async function getDatabaseTitle(databaseId: string): Promise<string> {
  const database = await notion.getDatabase({ databaseId }) as DatabaseObjectResponse

  return database.title[0].plain_text
}

export async function getPageTitle(pageId: string): Promise<string> {
  const page = await notion.getPage({ pageId }) as PageObjectResponse
  const pageProperties = page.properties

  if (pageProperties.Name?.type === 'title') {
    return pageProperties.Name.title[0].plain_text
  } else if (pageProperties.title?.type === 'title') {
    return pageProperties.title.title[0].plain_text
  }

  return ''
}

export async function getPageLastEditedTime(pageId: string): Promise<string> {
  const page = await notion.getPage({ pageId }) as PageObjectResponse

  return page.last_edited_time
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
  const blocks = await notion.getBlockChildren({ blockId: aggregateId })

  for (const block of blocks.results as BlockObjectResponse[]) {
    let pageId = ''

    if (block.type === 'paragraph' && block.paragraph.rich_text[0]) {
      const text = block.paragraph.rich_text[0].href || ''

      if (text.includes('www.notion.so')) {
        if (block.paragraph.rich_text[0].type === 'mention') {
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
      return
    }

    const aggregateTitle = await getPageTitle(aggregateId)
    const pageTitle = await getPageTitle(pageId)
    const lastEditedTime = await getPageLastEditedTime(pageId)

    if (!syncLog.modified({ databaseId: aggregateId, databaseTitle: aggregateTitle, pageId, pageTitle, lastEditedTime })) {
      return
    }

    const content = await parsePage({ blockId: pageId, databaseTitle: aggregateTitle, pageTitle })

    fileSystem.write({ fileName: pageTitle, fileContent: content, folderName: aggregateTitle })
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

    if (!syncLog.modified({ databaseId, databaseTitle, pageId, pageTitle, lastEditedTime })) {
      return
    }

    const content = await parsePage({ blockId: pageId, databaseTitle, pageTitle })

    fileSystem.write({ fileName: pageTitle, fileContent: content, folderName: databaseTitle })
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

  // Convert block content to markdown
  let response = await markdown.convert({ block, databaseTitle, pageTitle, parentType, indentation, index, lastIndex, markdownSyntax })

  // Indentation for content in bulleted list item
  if (type !== 'bulleted_list_item' && parentType === 'bulleted_list_item') {
    response = markdown.indent(`${response}\n`)
  }

  // Indentation for content in numbered list item
  if (type !== 'numbered_list_item' && parentType === 'numbered_list_item') {
    response = markdown.indent(`${response}\n`)
  }

  // Indentation for content in toggle
  if (type !== 'toggle' && parentType === 'toggle') {
    response = markdown.indent(`<div style="margin-inline-start: ${(indentation + 1) * 10}px;">${response}</div>\n`)
  }

  // Save content to the accumulator
  content.value = content.value.concat(response)

  // Base case
  if (!block.has_children) {

    // Closing tag for empty bulleted list item
    if (type === 'bulleted_list_item' && parentType !== 'bulleted_list_item' && !markdownSyntax) {
      content.value = content.value.concat(markdown.indent('</ul>\n'))
    }

    // Closing tag for empty numbered list item
    if (type === 'numbered_list_item' && parentType !== 'numbered_list_item' && !markdownSyntax) {
      content.value = content.value.concat(markdown.indent('</ol>\n'))
    }

    // Closing tag for empty toggle
    if (type === 'toggle') {
      content.value = content.value.concat(markdown.indent('</details>\n'))
    }

    return ''
  }

  // Indentation for nested items
  if (markdown.indentTypes.includes(type)) {
    indentation++
  }

  // Fetch child blocks
  const blocks = await notion.getBlockChildren({ blockId })

  // Traverse child blocks
  for (const [index, block] of (blocks.results as BlockObjectResponse[]).entries()) {
    await parsePage({ blockId: block.id, content, databaseTitle, pageTitle, parentType: type, indentation, index, lastIndex: blocks.results.length - 1, markdownSyntax })
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
      content.value = content.value.concat(markdown.indent('</details>\n', -1))
    } else {
      // Root toggle
      content.value = content.value.concat('</details>\n\n')
    }
  }

  // Line break for end of a root
  if (markdown.lineBreakTypes.includes(type) && !markdown.lineBreakTypes.includes(parentType)) {
    content.value = content.value.concat('\n')
  }

  return content.value
}
