import * as fs from 'fs'
import * as path from 'path'
import axios from 'axios'
import mime from 'mime-types'

export const DATA_DIRECTORY = '../notebooks'

export function write(
  { fileName, fileContent, folderName = '' }:
    { fileName: string, fileContent: string, folderName?: string }
): void {
  const folderPath = path.join(DATA_DIRECTORY, folderName)

  // Ensure the target folder exists or create it if it does not
  fs.mkdirSync(folderPath, { recursive: true })

  const filePath = path.join(folderPath, fileName + '.md')

  fs.writeFileSync(filePath, fileContent, 'utf-8')
}

export function erase(
  { file, folderPath = DATA_DIRECTORY }: { file: string, folderPath?: string }
): void {
  fs.promises.unlink(path.join(folderPath, file))
}

export async function clear(
  { folderPath = DATA_DIRECTORY }: { folderPath?: string } = {}
): Promise<void> {
  const files = await fs.promises.readdir(folderPath)

  for (const file of files) {
    erase({ file, folderPath })
  }
}

export async function download(
  { fileName, folderName, url }: { fileName: string, folderName: string, url: string }
): Promise<string> {
  try {
    const assetsPath = path.join(DATA_DIRECTORY, folderName, 'assets')

    // Ensure the target folder exists or create it if it does not
    fs.mkdirSync(assetsPath, { recursive: true })

    // Make a GET request for URL content as a stream
    const response = await axios.get(url, { responseType: 'stream' })

    const contentType = response.headers['content-type']
    const fileExtension = mime.extension(contentType)
    const file = fileName + '.' + fileExtension
    const filePath = path.join(assetsPath, file)

    // Return existing file path instead of downloading again if it already exists
    if (fs.existsSync(filePath)) {
      return filePath
    }

    // Create a write stream to save the file
    const writer = fs.createWriteStream(filePath)
    response.data.pipe(writer)

    // Wait for the write stream to finish
    await new Promise<void>((resolve, reject) => {
      writer.on('finish', resolve)
      writer.on('error', reject)
    })

    // Return the relative path from the markdown file to the asset
    return path.join('assets', file)
  } catch (error) {
    console.error('Error downloading file:', error)
    throw error
  }
}
