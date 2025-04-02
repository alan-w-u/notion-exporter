import * as fs from 'fs'
import * as path from 'path'
import dotenv from 'dotenv'

dotenv.config({ path: '../.env' })

const DATA_DIRECTORY = process.env.DATA_DIRECTORY as string
const SYNC_LOG = path.join(DATA_DIRECTORY, 'sync_log.json')

const syncLog = load()

export function load(): Record<string, string> {
  return fs.existsSync(SYNC_LOG) ? JSON.parse(fs.readFileSync(SYNC_LOG, 'utf-8')) : {}
}

export function save(): void {
  fs.writeFileSync(SYNC_LOG, JSON.stringify(syncLog, null, 2))
}

export function update(pageId: string): void {
  syncLog[pageId] = new Date().toISOString()
}

export function modified(pageId: string, lastEditedTime: string): boolean {
  return !syncLog[pageId] || new Date(lastEditedTime) > new Date(syncLog[pageId])
}
