import { Client } from '@notionhq/client'
import dotenv from 'dotenv'
import {
  QueryDatabaseParameters,
  QueryDatabaseResponse,
  GetPageResponse,
  GetBlockResponse,
  ListBlockChildrenResponse
} from '@notionhq/client/build/src/api-endpoints'

dotenv.config({ path: '../.env' })

export let requestCount = 0

const notion = new Client({ auth: process.env.NOTION_API_KEY as string })

export async function queryDatabase(
  { databaseId, opts = {} }: { databaseId: string, opts?: Partial<QueryDatabaseParameters> }
): Promise<QueryDatabaseResponse> {
  try {
    requestCount++
    return await notion.databases.query({ database_id: databaseId, ...opts })
  } catch (error) {
    console.error('Error querying database:', error)
    throw error
  }
}

export async function getPage(
  { pageId }: { pageId: string }
): Promise<GetPageResponse> {
  try {
    requestCount++
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
    requestCount++
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
    requestCount++
    return await notion.blocks.children.list({ block_id: blockId })
  } catch (error) {
    console.error('Error retrieving block children:', error)
    throw error
  }
}
