import * as fs from 'fs'
import * as path from 'path'
import axios from 'axios'
import mime from 'mime-types'

export const CONTENT_DIRECTORY = '../content'
const ASSETS_DIRECTORY = 'assets'

export function write(
  { folderName, fileName, fileContent, fileExtension = 'md' }: { folderName: string, fileName: string, fileContent: string, fileExtension?: string }
): void {
  const folderPath = path.join(CONTENT_DIRECTORY, folderName)

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
    const assetsPath = path.join(CONTENT_DIRECTORY, folderName, ASSETS_DIRECTORY)

    // Ensure the target folder exists or create it if it does not
    fs.mkdirSync(assetsPath, { recursive: true })

    // Make a GET request for URL content as a stream
    const response = await axios.get(url, { responseType: 'stream' })

    const contentType = response.headers['content-type']
    const fileExtension = mime.extension(contentType)

    let originalExtension = fileExtension
    let finalExtension = fileExtension ? fileExtension : ".webp"
    if (["heic", "jpeg", "jpg", "png", "gif"].includes(finalExtension)) {
      finalExtension = "webp"
    }
    // sometimes HEICs get returned as txts, idk why
    if (finalExtension == "txt") {
      originalExtension = "heic"
      finalExtension = "webp"
    }
    const urlParts = url.split("?")
    const uploadName = urlParts[0].split("/").at(-1)
    if (uploadName?.endsWith(".STL")) {
      originalExtension = "STL"
      finalExtension = "STL"
    }
    if (uploadName?.endsWith(".stl")) {
      originalExtension = "stl"
      finalExtension = "stl"
    }

    // need to name the files under the original extension, otherwise file
    // converters won't pick up on the files as easily
    const file = fileName + '.' + originalExtension
    const filePath = path.join(assetsPath, file)

    // Return existing file path instead of downloading again if it already exists
    if (fs.existsSync(filePath) && filePath.includes(ASSETS_DIRECTORY)) {
      // TODO: add a flag to specify whether filepaths should point to igem cdn
      // or to local copy of file

      // return filePath.slice(filePath.indexOf(ASSETS_DIRECTORY))
      return `https://static.igem.wiki/teams/5784/assets/${fileName}.${finalExtension}`
    }

    // Create a write stream to save the file
    const writer = fs.createWriteStream(filePath)
    response.data.pipe(writer)

    // Wait for the write stream to finish
    await new Promise<void>((resolve, reject) => {
      writer.on('finish', resolve)
      writer.on('error', reject)
    })

    // TODO: add a flag to specify whether filepaths should point to igem cdn
    // or to local copy of file
    // Return the relative path from the file to the asset
    // return path.join(ASSETS_DIRECTORY, file)

    // Return the iGEM CDN path
    return `https://static.igem.wiki/teams/5784/assets/${fileName}.${finalExtension}`
  } catch (error) {
    console.error('Error downloading file:', error)
    throw error
  }
}
