import * as notion from './notion'
import * as markdown from './markdown'
import {
  QueryDatabaseParameters,
  DatabaseObjectResponse,
  PageObjectResponse,
  BlockObjectResponse
} from '@notionhq/client/build/src/api-endpoints'

const SORT_DATE_DESCENDING: Partial<QueryDatabaseParameters> = {
  // Order in descending order by date (newest at start of array)
  sorts: [
    {
      property: 'Start - End Dates',
      direction: 'descending'
    }
  ]
}

export async function getPageIds(
  databaseId: string,
  opts: Partial<QueryDatabaseParameters> = SORT_DATE_DESCENDING
): Promise<string[]> {
  const response = await notion.queryDatabase({ databaseId, opts })

  return response.results.map(page => page.id) || []
}

export async function getDatabaseTitle(
  databaseId: string
): Promise<string> {
  const database = await notion.getDatabase({ databaseId }) as DatabaseObjectResponse

  return database.title[0].plain_text
}

export async function getPageTitle(
  pageId: string
): Promise<string> {
  const page = await notion.getPage({ pageId }) as PageObjectResponse
  const pageNameProperty = page.properties.Name

  if (pageNameProperty.type === 'title') {
    return pageNameProperty.title[0].plain_text
  }

  return ''
}

export async function parsePage(
  blockId: string,
  content: { value: string } = { value: '' },
  indentation: number = 0
): Promise<string> {
  const block = await notion.getBlock({ blockId }) as BlockObjectResponse
  const type = block.type

  // Remove the blank row at the end of a table
  if (type !== 'table_row' && content.value.trim().endsWith('| --- |')) {
    content.value = content.value.slice(0, content.value.lastIndexOf('\n|')).concat('\n\n')
  }

  // Save content to the accumulator
  content.value = content.value.concat(await markdown.convert(block, indentation))

  // Base case
  if (!block.has_children) {
    return ''
  }

  // Indentation for nested items
  if (markdown.indentTypes.includes(type)) {
    indentation++
  }

  const blocks = await notion.getBlockChildren({ blockId })

  // Traverse child blocks
  for (const block of blocks.results as BlockObjectResponse[]) {
    await parsePage(block.id, content, indentation)
  }

  return content.value
}
