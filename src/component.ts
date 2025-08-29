import {
  BlockObjectResponse
} from '@notionhq/client/build/src/api-endpoints'

const componentMap: Record<string, (content: string[]) => string> = {
  ihp_block
}

export function delimiterState(block: BlockObjectResponse): boolean | null {
  if (block.type === 'paragraph') {
    if (block.paragraph.rich_text.length == 0) return null
    const text = block.paragraph.rich_text[0].plain_text.trim().toLowerCase()

    if (text.startsWith('%%') && text.endsWith('%%') && text.includes('::')){
      if (text.includes('start')) {
        // Start delimiter
        return true
      }

      if (text.includes('end')) {
        // End delimiter
        return false
      }
    }
  }

  // Not a delimiter
  return null
}

export function type(block: BlockObjectResponse): string {
  if (delimiterState(block) !== null && block.type === 'paragraph') {
    const text = block.paragraph.rich_text[0].plain_text

    return text.match(/::(.*?)%%/)?.[1]?.trim().toLowerCase().replace(/\s+/g, '_') || ''
  }

  return ''
}

export function ingest(type: string, content: string[]): string {
  if (componentMap[type]) {
    return componentMap[type](content)
  }

  return ''
}

function ihp_block(content: string[]): string {
  if (content.length < 4) {
    return ''
  }

  return `<IhpContact\n\tname={"${content[0]}"}\n\theadshotImgPath={"${content[1]}"}\n\tdescription={"${content[2]}"}\n\tblockContent={"${content[3]}"}\n/>`
}
