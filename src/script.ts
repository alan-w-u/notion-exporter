import * as util from './util'
import * as fileSystem from './fileSystem'
import * as spinner from './spinner'
import dotenv from 'dotenv'

dotenv.config({ path: '../.env' })

const databaseId = process.env.NOTION_DATABASE_ID as string

async function script() {
  spinner.start()
  // fileSystem.clear()

  const databaseTitle = await util.getDatabaseTitle(databaseId)
  const pageIds = await util.getPageIds(databaseId)

  await Promise.all(pageIds.map(async pageId => {
    const pageTitle = await util.getPageTitle(pageId)
    const content = await util.parsePage({ blockId: pageId, databaseTitle, pageTitle })

    fileSystem.write({ fileName: pageTitle, fileContent: content, fileExtension: 'md' })
  }))

  spinner.stop()
}

script()
