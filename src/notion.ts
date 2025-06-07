import { Client } from '@notionhq/client'
import dotenv from 'dotenv'
import {
  QueryDatabaseParameters,
  QueryDatabaseResponse,
  GetDatabaseResponse,
  GetPageResponse,
  GetBlockResponse,
  ListBlockChildrenResponse
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
    console.error('Error querying database:', error)
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
    console.error('Error retrieving database:', error)
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
    console.error('Error retrieving page:', error)
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
    console.error('Error retrieving block children:', error)
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
    console.error('Error retrieving block children:', error)
    throw error
  } finally {
    requests++
  }
}
