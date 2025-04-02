import * as util from './util'
import * as fileSystem from './fileSystem'
import * as syncLog from './syncLog'
import * as spinner from './spinner'
import dotenv from 'dotenv'

dotenv.config({ path: '../.env' })

const DATABASE_ID = process.env.NOTION_DATABASE_ID as string

async function script() {
  spinner.start()

  const databaseTitle = await util.getDatabaseTitle(DATABASE_ID)
  const pageIds = await util.getPageIds(DATABASE_ID)

  await Promise.all(pageIds.map(async pageId => {
    const lastEditedTime = await util.getPageLastEditedTime(pageId)

    if (!syncLog.modified(pageId, lastEditedTime)) {
      return
    }

    const pageTitle = await util.getPageTitle(pageId)
    const content = await util.parsePage({ blockId: pageId, databaseTitle, pageTitle })

    fileSystem.write({ fileName: pageTitle, fileContent: content, fileExtension: 'md' })
    syncLog.update(pageId)
  }))

  syncLog.save()
  spinner.stop()
}

script()
