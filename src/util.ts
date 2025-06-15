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
  const pageNameProperty = page.properties.Name

  if (pageNameProperty.type === 'title') {
    return pageNameProperty.title[0].plain_text
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
  { blockId, content = { value: '' }, databaseTitle = '', pageTitle = '', parentType = '', indentation = 0 }:
    { blockId: string, content?: { value: string }, databaseTitle?: string, pageTitle?: string, parentType?: string, indentation?: number }
): Promise<string> {
  const block = await notion.getBlock({ blockId }) as BlockObjectResponse
  const type = block.type

  // Remove the blank row at the end of a table
  if (type !== 'table_row' && content.value.trim().endsWith('| --- |')) {
    content.value = content.value.slice(0, content.value.lastIndexOf('\n|')).concat('\n\n')
  }

  // Convert block content to markdown
  let response = await markdown.convert({ block, databaseTitle, pageTitle, parentType, indentation })

  // Indentation for content in toggle
  if (type !== 'toggle' && parentType === 'toggle') {
    response = markdown.indent(`<div style="margin-left: ${(indentation + 1) * 10}px">` + response + '</div>\n', indentation)
  }

  // Save content to the accumulator
  content.value = content.value.concat(response)

  // Base case
  if (!block.has_children) {

    // Closing tag for empty toggle
    if (type === 'toggle') {
      content.value = content.value.concat(markdown.indent('</details>\n', indentation))
    }

    return ''
  }

  // Indentation for nested items
  if (markdown.indentTypes.includes(type)) {
    indentation++
  }

  const blocks = await notion.getBlockChildren({ blockId })

  // Traverse child blocks
  for (const block of blocks.results as BlockObjectResponse[]) {
    await parsePage({ blockId: block.id, content, databaseTitle, pageTitle, parentType: type, indentation })
  }

  // Closing tag for nested and root toggle
  if (type === 'toggle') {
    if (parentType === 'toggle') {
      // Nested toggle
      content.value = content.value.concat(markdown.indent('</details>\n', indentation - 1))
    } else {
      // Root toggle
      content.value = content.value.concat('</details>\n\n')
    }
  }

  return content.value
}
