import * as notion from './notion'
import * as markdown from './markdown'
import {
  QueryDatabaseParameters,
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

  // Save content to the accumulator
  content.value = content.value.concat(markdown.convert(block, indentation), '\n')

  // Base case
  if (!block.has_children) {
    return ''
  }

  // Indentation for nested lists
  if (markdown.enumerationList.includes(block.type)) {
    indentation++
  }

  const blocks = await notion.getBlockChildren({ blockId })

  // Traverse children blocks
  for (const block of blocks.results as BlockObjectResponse[]) {
    await parsePage(block.id, content, indentation)
  }

  return content.value
}
