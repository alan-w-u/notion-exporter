import * as notionService from './notionService'
import * as notionUtil from './notionUtil'
import * as fileSystem from './fileSystem'
import * as spinner from './spinner'
import dotenv from 'dotenv'
import {
  PageObjectResponse
} from '@notionhq/client/build/src/api-endpoints'

dotenv.config({ path: '../.env' })

const databaseId = process.env.NOTION_DATABASE_ID as string

async function script() {
  spinner.start()
  // fileSystem.clear()

  const pageIds = await notionUtil.getPageIds(databaseId)

  for (const pageId of pageIds) {
    const response = { value: '' }
    const page = await notionService.getPage({ pageId }) as PageObjectResponse
    const pageTitle = notionUtil.getPageTitle(page)

    await notionUtil.parseNotebook(pageId, response)

    fileSystem.write({ fileName: pageTitle, fileContent: response.value, fileType: '.md' })
    break // FIXME: only execute for one notebook
  }

  spinner.stop()
}

script()
