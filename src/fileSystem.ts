import * as fs from 'fs'
import * as path from 'path'
import axios from 'axios'
import mime from 'mime-types'

export const DATA_DIRECTORY = '../notebooks'
const ASSETS_DIRECTORY = 'assets'

export function write(
  { folderName, fileName, fileContent, fileExtension = 'md' }: { folderName: string, fileName: string, fileContent: string, fileExtension?: string }
): void {
  const folderPath = path.join(DATA_DIRECTORY, folderName)

  // Ensure the target folder exists or create it if it does not
  fs.mkdirSync(folderPath, { recursive: true })

  const filePath = path.join(folderPath, fileName + '.' + fileExtension)

  fs.writeFileSync(filePath, fileContent, 'utf-8')
}

export function erase(
  { folderPath, file }: { folderPath: string, file: string }
): void {
  fs.promises.unlink(path.join(folderPath, file))
}

export async function clear(
  { folderPath }: { folderPath: string }
): Promise<void> {
  const files = await fs.promises.readdir(folderPath)

  for (const file of files) {
    erase({ folderPath, file })
  }
}

export async function download(
  { folderName, fileName, url }: { folderName: string, fileName: string, url: string }
): Promise<string> {
  try {
    const assetsPath = path.join(DATA_DIRECTORY, folderName, ASSETS_DIRECTORY)

    // Ensure the target folder exists or create it if it does not
    fs.mkdirSync(assetsPath, { recursive: true })

    // Make a GET request for URL content as a stream
    const response = await axios.get(url, { responseType: 'stream' })

    const contentType = response.headers['content-type']
    const fileExtension = mime.extension(contentType)
    const file = fileName + '.' + fileExtension
    const filePath = path.join(assetsPath, file)

    // Return existing file path instead of downloading again if it already exists
    if (fs.existsSync(filePath) && filePath.includes(ASSETS_DIRECTORY)) {
      return filePath.slice(filePath.indexOf(ASSETS_DIRECTORY))
    }

    // Create a write stream to save the file
    const writer = fs.createWriteStream(filePath)
    response.data.pipe(writer)

    // Wait for the write stream to finish
    await new Promise<void>((resolve, reject) => {
      writer.on('finish', resolve)
      writer.on('error', reject)
    })

    // Return the relative path from the file to the asset
    return path.join(ASSETS_DIRECTORY, file)
  } catch (error) {
    console.error('Error downloading file:', error)
    throw error
  }
}
