import * as fs from 'fs'
import * as path from 'path'
import dotenv from 'dotenv'

dotenv.config({ path: '../.env' })

const dataDirectory = process.env.DATA_DIRECTORY as string

export function write(
  { fileName, fileContent, fileType = '.md', folderPath = dataDirectory }: { fileName: string, fileContent: string, fileType?: string, folderPath?: string }
) {
  // Ensure the target folder exists or create it if it does not
  fs.mkdirSync(folderPath, { recursive: true })

  const filePath = path.join(folderPath, fileName + fileType)

  if (fileType === '.json') {
    fs.writeFileSync(filePath, JSON.stringify(fileContent, null, 2), 'utf-8')
  } else {
    fs.writeFileSync(filePath, fileContent, 'utf-8')
  }
}

export function erase(
  { file, folderPath = dataDirectory }: { file: string, folderPath?: string }
) {
  fs.promises.unlink(path.join(folderPath, file))
}

export async function clear(
  { folderPath = dataDirectory }: { folderPath?: string } = {}
) {
  const files = await fs.promises.readdir(folderPath)

  for (const file of files) {
    erase({ file, folderPath })
  }
}
