import * as util from './util'
import * as spinner from './spinner'
import dotenv from 'dotenv'

dotenv.config({ path: '../.env' })

async function script(): Promise<void> {
  spinner.start()

  // Populate database IDs
  const databaseIds = Object.keys(process.env)
    .filter(key => key.startsWith('DATABASE_ID'))
    .map(key => process.env[key])
    .filter(Boolean) as string[]

  for (const databaseId of databaseIds) {
    await util.parseDatabase(databaseId)
  }

  spinner.stop()
}

script()
