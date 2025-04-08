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

const notionInstances: { client: Client, free: boolean, requests: number }[] = []

function initialize(): void {
  // Populate Notion API keys
  const notionKeys = Object.keys(process.env)
    .filter(key => key.startsWith('NOTION_API_KEY'))
    .map(key => process.env[key])
    .filter(Boolean) as string[]

  // Populate Notion clients
  notionInstances.push(...notionKeys.map(notionKey => ({
    client: new Client({ auth: notionKey }),
    free: true,
    requests: 0
  })))
}

initialize()

function notionInstance(): any {
  return notionInstances.find(notionInstance => notionInstance.free)
}

export function requests(): number {
  return notionInstances.reduce((requests, notionInstance) => requests + notionInstance.requests, 0)
}

export async function queryDatabase(
  { databaseId, opts = {} }: { databaseId: string, opts?: Partial<QueryDatabaseParameters> }
): Promise<QueryDatabaseResponse> {
  const notion = notionInstance()
  notion.free = false

  try {
    return await notion.client.databases.query({ database_id: databaseId, ...opts })
  } catch (error) {
    console.error('Error querying database:', error)
    throw error
  } finally {
    notion.free = true
    notion.requests++
  }
}

export async function getDatabase(
  { databaseId }: { databaseId: string }
): Promise<GetDatabaseResponse> {
  const notion = notionInstance()
  notion.free = false

  try {
    return await notion.client.databases.retrieve({ database_id: databaseId })
  } catch (error) {
    console.error('Error retrieving database:', error)
    throw error
  } finally {
    notion.free = true
    notion.requests++
  }
}

export async function getPage(
  { pageId }: { pageId: string }
): Promise<GetPageResponse> {
  const notion = notionInstance()
  notion.free = false

  try {
    return await notion.client.pages.retrieve({ page_id: pageId })
  } catch (error) {
    console.error('Error retrieving page:', error)
    throw error
  } finally {
    notion.free = true
    notion.requests++
  }
}

export async function getBlock(
  { blockId }: { blockId: string }
): Promise<GetBlockResponse> {
  const notion = notionInstance()
  notion.free = false

  try {
    return await notion.client.blocks.retrieve({ block_id: blockId })
  } catch (error) {
    console.error('Error retrieving block children:', error)
    throw error
  } finally {
    notion.free = true
    notion.requests++
  }
}

export async function getBlockChildren(
  { blockId }: { blockId: string }
): Promise<ListBlockChildrenResponse> {
  const notion = notionInstance()
  notion.free = false

  try {
    return await notion.client.blocks.children.list({ block_id: blockId })
  } catch (error) {
    console.error('Error retrieving block children:', error)
    throw error
  } finally {
    notion.free = true
    notion.requests++
  }
}
