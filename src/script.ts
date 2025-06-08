import * as util from './util'
import * as spinner from './spinner'
import dotenv from 'dotenv'

dotenv.config({ path: '../.env' })

async function script(): Promise<void> {
  spinner.start()

  const databaseIds = Object.keys(process.env)
    .filter(key => key.startsWith('DATABASE_ID'))
    .map(key => process.env[key])
    .filter(Boolean) as string[]

  const pageIds = Object.keys(process.env)
    .filter(key => key.startsWith('PAGE_ID'))
    .map(key => process.env[key])
    .filter(Boolean) as string[]
  
  await Promise.all([
    util.parseDatabases({ databaseIds }),
    util.parsePages({ pageIds, databaseId: 'unparented', databaseTitle: 'unparented' })
  ])

  spinner.stop()
}

script()
