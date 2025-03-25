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

const notion = new Client({ auth: process.env.NOTION_API_KEY as string })

export let requests = 0

export async function queryDatabase(
  { databaseId, opts = {} }: { databaseId: string, opts?: Partial<QueryDatabaseParameters> }
): Promise<QueryDatabaseResponse> {
  try {
    requests++
    return await notion.databases.query({ database_id: databaseId, ...opts })
  } catch (error) {
    console.error('Error querying database:', error)
    throw error
  }
}

export async function getDatabase(
  { databaseId }: { databaseId: string }
): Promise<GetDatabaseResponse> {
  try {
    requests++
    return await notion.databases.retrieve({ database_id: databaseId })
  } catch (error) {
    console.error('Error retrieving database:', error)
    throw error
  }
}

export async function getPage(
  { pageId }: { pageId: string }
): Promise<GetPageResponse> {
  try {
    requests++
    return await notion.pages.retrieve({ page_id: pageId })
  } catch (error) {
    console.error('Error retrieving page:', error)
    throw error
  }
}

export async function getBlock(
  { blockId }: { blockId: string }
): Promise<GetBlockResponse> {
  try {
    requests++
    return await notion.blocks.retrieve({ block_id: blockId })
  } catch (error) {
    console.error('Error retrieving block children:', error)
    throw error
  }
}

export async function getBlockChildren(
  { blockId }: { blockId: string }
): Promise<ListBlockChildrenResponse> {
  try {
    requests++
    return await notion.blocks.children.list({ block_id: blockId })
  } catch (error) {
    console.error('Error retrieving block children:', error)
    throw error
  }
}
