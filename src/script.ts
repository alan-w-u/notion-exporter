import * as notionService from './notionService'
import * as notionUtil from './notionUtil'
import * as fileSystem from './fileSystem'
import * as spinner from './spinner'
import dotenv from 'dotenv'
import {
  NotionContent
} from './interfaces'
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
    const notionContent: NotionContent = { value: '' }
    const page = await notionService.getPage({ pageId }) as PageObjectResponse
    const pageTitle = notionUtil.getPageTitle(page)

    await notionUtil.parsePage(pageId, notionContent)

    fileSystem.write({ fileName: pageTitle, fileContent: notionContent.value, fileType: '.md' })
    break // FIXME: only execute for one page
  }

  spinner.stop()
}

script()
