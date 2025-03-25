import * as fs from 'fs'
import * as path from 'path'
import axios from 'axios'
import mime from 'mime-types'
import dotenv from 'dotenv'

dotenv.config({ path: '../.env' })

const dataDirectory = process.env.DATA_DIRECTORY as string

export function write(
  { fileName, fileContent, fileExtension = '.md', folderPath = dataDirectory }: { fileName: string, fileContent: string, fileExtension?: string, folderPath?: string }
): void {
  // Ensure the target folder exists or create it if it does not
  fs.mkdirSync(folderPath, { recursive: true })

  const filePath = path.join(folderPath, fileName + fileExtension)

  if (fileExtension === '.json') {
    fs.writeFileSync(filePath, JSON.stringify(fileContent, null, 2), 'utf-8')
  } else {
    fs.writeFileSync(filePath, fileContent, 'utf-8')
  }
}

export function erase(
  { file, folderPath = dataDirectory }: { file: string, folderPath?: string }
): void {
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
