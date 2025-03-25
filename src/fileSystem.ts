import * as fs from 'fs'
import * as path from 'path'
import axios from 'axios'
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

export async function download(
  { filename, url, fileExtension }: { filename: string, url: string, fileExtension: string }
): Promise<void> {
  try {
    const assetsPath = path.join(dataDirectory, '/assets')

    // Ensure the target folder exists or create it if it does not
    fs.mkdirSync(assetsPath, { recursive: true })

    const filePath = path.join(assetsPath, filename + fileExtension)

    // Make a GET request for the stream response
    const response = await axios.get(url, { responseType: 'stream' })

    // Create a write stream to save the file
    const writer = fs.createWriteStream(filePath)
    response.data.pipe(writer)

    // Wait for the write stream to finish
    await new Promise<void>((resolve, reject) => {
      writer.on('finish', resolve)
      writer.on('error', reject)
    })
  } catch (error) {
    console.error('Error downloading file:', error)
    throw error
  }
}
