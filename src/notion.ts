import {
  Client,
  APIResponseError
} from '@notionhq/client'
import dotenv from 'dotenv'
import {
  QueryDatabaseParameters,
  GetDatabaseResponse,
  GetPageResponse,
  GetBlockResponse,
  PageObjectResponse,
  BlockObjectResponse
} from '@notionhq/client/build/src/api-endpoints'

dotenv.config({ path: '../.env' })

export let requests = 0

let roundRobinIndex = 0

const notionKeys = Object.keys(process.env)
  .filter(key => key.startsWith('NOTION_API_KEY'))
  .map(key => process.env[key])
  .filter(Boolean) as string[]

const notionClients: Client[] = notionKeys.map(notionKey => new Client({ auth: notionKey }))

function notion(): Client {
  const notion = notionClients[roundRobinIndex]
  roundRobinIndex = (roundRobinIndex + 1) % notionClients.length

  return notion
}

export async function queryDatabase(
  { databaseId, opts = {} }: { databaseId: string, opts?: Partial<QueryDatabaseParameters> }
): Promise<PageObjectResponse[]> {
  let pages: PageObjectResponse[] = []

  try {
    let response = await notion().databases.query({ database_id: databaseId, ...opts })
    pages.push(...response.results as PageObjectResponse[])

    while (response.has_more) {
      response = await notion().databases.query({ database_id: databaseId, start_cursor: response.next_cursor!, ...opts })
      pages.push(...response.results as PageObjectResponse[])
      requests++
    }

    return pages
  } catch (error) {
    retryAfter(error as Error)
    console.error(`\x1b[1m\x1b[31mError querying database\x1b[0m`)
    throw error
  } finally {
    requests++
  }
}

export async function getDatabase(
  { databaseId }: { databaseId: string }
): Promise<GetDatabaseResponse> {
  try {
    return await notion().databases.retrieve({ database_id: databaseId })
  } catch (error) {
    retryAfter(error as Error)
    console.error(`\x1b[1m\x1b[31mError retrieving database\x1b[0m`)
    throw error
  } finally {
    requests++
  }
}

export async function getPage(
  { pageId }: { pageId: string }
): Promise<GetPageResponse> {
  try {
    return await notion().pages.retrieve({ page_id: pageId })
  } catch (error) {
    retryAfter(error as Error)
    console.error(`\x1b[1m\x1b[31mError retrieving page\x1b[0m`)
    throw error
  } finally {
    requests++
  }
}

export async function getBlock(
  { blockId }: { blockId: string }
): Promise<GetBlockResponse> {
  try {
    return await notion().blocks.retrieve({ block_id: blockId })
  } catch (error) {
    retryAfter(error as Error)
    console.error(`\x1b[1m\x1b[31mError retrieving block\x1b[0m`)
    throw error
  } finally {
    requests++
  }
}

export async function getBlockChildren(
  { blockId }: { blockId: string }
): Promise<BlockObjectResponse[]> {
  const blocks: BlockObjectResponse[] = []

  try {
    let response = await notion().blocks.children.list({ block_id: blockId })
    blocks.push(...response.results as BlockObjectResponse[])

    while (response.has_more) {
      response = await notion().blocks.children.list({ block_id: blockId, start_cursor: response.next_cursor! })
      blocks.push(...response.results as BlockObjectResponse[])
      requests++
    }

    return blocks
  } catch (error) {
    retryAfter(error as Error)
    console.error(`\x1b[1m\x1b[31mError retrieving block children\x1b[0m`)
    throw error
  } finally {
    requests++
  }
}

function retryAfter(error: Error): void {
  if (error instanceof APIResponseError) {
    const retryAfter = Number((error.headers as Headers)?.get('retry-after'))
    const minutes = Math.floor(retryAfter / 60)
    const seconds = Math.round(retryAfter % 60)

    console.log(`\x1b[1m\x1b[33mRate limited - retry after: ${minutes}m ${seconds}s\x1b[0m`)
  }
}
