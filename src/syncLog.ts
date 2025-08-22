import * as fileSystem from './fileSystem'
import * as fs from 'fs'
import * as path from 'path'

interface SyncLog {
  [key: string]: DatabaseSyncLog;
}

interface DatabaseSyncLog {
  databaseTitle: string;
  syncLog: Record<string, PageSyncLog>;
}

interface PageSyncLog {
  pageTitle: string;
  lastEditedTime: string;
  lastExportedTime: string;
}

const SYNC_LOG_PATH = path.join(fileSystem.CONTENT_DIRECTORY, 'sync_log.json')

const syncLog = load()

export function load(): SyncLog {

  // Check if sync log file exists
  if (!fs.existsSync(SYNC_LOG_PATH)) {
    return {}
  }

  const content = fs.readFileSync(SYNC_LOG_PATH, 'utf-8').trim()

  // Check if sync log file is empty
  return content ? JSON.parse(content) : {}
}

export function save(): void {
  fs.writeFileSync(SYNC_LOG_PATH, JSON.stringify(syncLog, null, 2))
}

export function update(
  { databaseId, databaseTitle, pageId, pageTitle, lastEditedTime }:
    { databaseId: string, databaseTitle: string, pageId: string, pageTitle: string, lastEditedTime: string }
): void {
  if (!syncLog[databaseId]) {
    syncLog[databaseId] = {
      databaseTitle: '',
      syncLog: {}
    }
  }

  syncLog[databaseId].databaseTitle = databaseTitle
  syncLog[databaseId].syncLog[pageId] = {
    pageTitle,
    lastEditedTime,
    lastExportedTime: new Date().toISOString()
  }
}

export function modified(
  { databaseId, databaseTitle, pageId, pageTitle, lastEditedTime, fileExtension = 'md' }:
    { databaseId: string, databaseTitle: string, pageId: string, pageTitle: string, lastEditedTime: string, fileExtension?: string }
): boolean {
  const filePath = path.join(fileSystem.CONTENT_DIRECTORY, databaseTitle, pageTitle + '.' + fileExtension)
  const lastExportedTime = syncLog[databaseId]?.syncLog[pageId]?.lastExportedTime

  return !fs.existsSync(filePath) || !lastExportedTime || new Date(lastEditedTime) > new Date(lastExportedTime)
}
