import * as util from './util'
import * as fileSystem from './fileSystem'
import * as spinner from './spinner'
import dotenv from 'dotenv'

dotenv.config({ path: '../.env' })

const databaseId = process.env.NOTION_DATABASE_ID as string

async function script() {
  spinner.start()
  // fileSystem.clear()

  const pageIds = await util.getPageIds(databaseId)

  for (const pageId of pageIds) {
    const pageTitle = await util.getPageTitle(pageId)
    const content = await util.parsePage(pageId)

    fileSystem.write({ fileName: pageTitle, fileContent: content, fileExtension: '.md' })
    break // FIXME: only execute for one page
  }

  spinner.stop()
}

script()
