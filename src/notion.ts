import dotenv from 'dotenv'
import {
  Client,
  APIResponseError
} from '@notionhq/client'
import {
  QueryDatabaseParameters,
  QueryDatabaseResponse,
  GetDatabaseResponse,
  GetPageResponse,
  GetBlockResponse,
  ListBlockChildrenResponse,
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
): Promise<QueryDatabaseResponse> {
  try {
    return await notion().databases.query({ database_id: databaseId, ...opts })
  } catch (error) {
    if (error instanceof Error) {
      handleError(error, 'query page')
    }

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
    if (error instanceof Error) {
      handleError(error, 'retrieve database')
    }

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
    if (error instanceof Error) {
      handleError(error, 'retrieve page')
    }

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
    if (error instanceof Error) {
      handleError(error, 'retrieve block')
    }

    throw error
  } finally {
    requests++
  }
}

export async function getBlockChildren(
  { blockId }: { blockId: string }
): Promise<ListBlockChildrenResponse> {
  try {
    return await notion().blocks.children.list({ block_id: blockId })
  } catch (error) {
    if (error instanceof Error) {
      handleError(error, 'retrieve block children')
    }

    throw error
  } finally {
    requests++
  }
}

function handleError(error: Error, message: string): void {
  if (error instanceof APIResponseError) {
    const retryAfter = (error.headers as Headers)?.get('retry-after')

    if (retryAfter) {
      const minutes = Math.floor(Number(retryAfter) / 60)
      const seconds = Math.round(Number(retryAfter) % 60)

      console.log(`\x1b[1m\x1b[33mRate Limited: Retry after ${minutes}m ${seconds}s\x1b[0m`)
    }
  }
  console.error(`\x1b[1m\x1b[31mNotion Error: Failed to ${message}\x1b[0m`)
}
