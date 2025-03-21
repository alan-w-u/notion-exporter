import * as notionService from './notionService'
import * as markdown from './markdown'
import {
  NotionContent,
  Icon
} from './interfaces'
import {
  QueryDatabaseParameters,
  PageObjectResponse,
  BlockObjectResponse,
  RichTextItemResponse
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
  const response = await notionService.queryDatabase({ databaseId, opts })
  return response.results.map(page => page.id) || []
}

export function getPageTitle(page: PageObjectResponse): string {
  const pageNameProperty = page.properties.Name

  if (pageNameProperty.type === 'title') {
    return pageNameProperty.title[0].plain_text
  }

  return ''
}

export function hasChildren(block: BlockObjectResponse): boolean {
  return block.has_children
}

export function getId(block: BlockObjectResponse): string {
  return block.id
}

export function getType(block: BlockObjectResponse): string {
  return block.type
}

export function getContent(block: BlockObjectResponse, indentation: number): string {
  let content = ''
  const type = getType(block)

  if (block.type === type && block[type as keyof BlockObjectResponse]) {
    const blockContent = block[type as keyof BlockObjectResponse] as Object

    if ('rich_text' in blockContent) {
      let start = true
      let icon: Icon

      if ('icon' in blockContent) {
        icon = blockContent.icon as Icon
      }

      for (const textContent of blockContent.rich_text as RichTextItemResponse[]) {
        if (textContent.type === 'text' && textContent['text']) {
          const text = markdown.convertText(textContent, type, { start, indentation, icon })
          content = content.concat(text)
          start = false
        }
      }
    }
  }

  return content
}

export async function parsePage(
  blockId: string,
  notionContent: NotionContent,
  indentation: number = 0
): Promise<void> {
  const block = await notionService.getBlock({ blockId }) as BlockObjectResponse

  // Save content to the accumulator
  notionContent.value = notionContent.value.concat(getContent(block, indentation), '\n')

  // Base case
  if (!hasChildren(block)) {
    return
  }

  // Indentation for nested lists
  if (markdown.enumerationList.includes(getType(block))) {
    indentation++
  }

  const blocks = await notionService.getBlockChildren({ blockId })

  // Traverse children blocks
  for (const block of blocks.results as BlockObjectResponse[]) {
    const blockId = getId(block)
    await parsePage(blockId, notionContent, indentation)
  }
}
