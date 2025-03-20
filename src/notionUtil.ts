import * as notionService from './notionService'
import * as markdown from './markdown'
import {
  QueryDatabaseParameters,
  PageObjectResponse
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

  // Type narrowing
  if (pageNameProperty.type === 'title') {
    return pageNameProperty.title[0].plain_text
  }

  return ''
}

export function hasChildren(block: any): boolean {
  return block.has_children
}

export function getId(block: any): string {
  return block.id
}

export function getType(block: any): string {
  return block.type
}

export function getContent(block: any, indentation: number): string {
  let response = ''
  const type = getType(block)

  if (block.type === type && block[type]) {
    const blockContent = block[type]

    if ('rich_text' in blockContent) {
      let start = true
      let icon

      if ('icon' in blockContent) {
        const iconContent = blockContent.icon

        icon = {
          type: iconContent.type,
          value: iconContent.type === 'emoji'
            ? iconContent.emoji
            : iconContent.external.url
        }
      }

      for (const textContent of blockContent.rich_text) {
        if (textContent.type === 'text' && textContent['text']) {
          const text = markdown.convertText(textContent, type, { start, indentation, icon })
          response = response.concat(text)
          start = false
        }
      }
    }
  }

  return response
}

export async function parseNotebook(
  blockId: string,
  response: { value: string },
  indentation: number = 0
): Promise<void> {
  const block = await notionService.getBlock({ blockId })

  // Save content to the accumulator
  response.value = response.value.concat(getContent(block, indentation), '\n')

  // Base case
  if (!hasChildren(block)) {
    return
  }

  // Indentation for nested lists
  if (markdown.enumerationList.includes(getType(block))) {
    indentation++
  }

  const blockChildren = await notionService.getBlockChildren({ blockId })
  const blocks = blockChildren.results

  // Traverse children blocks
  for (const block of blocks) {
    const blockId = getId(block)
    await parseNotebook(blockId, response, indentation)
  }
}
