import {
  BlockObjectResponse
} from '@notionhq/client/build/src/api-endpoints'

const importSet: Set<string> = new Set()

const componentMap: Record<string, (content: string[]) => string> = {
  metadata,
  figure,
  carousel,
  img_desc,
  dbtl,
  ihp_block
}

export function imports(): string {
  let imports = ''

  importSet.forEach(component => {
    imports = imports.concat(`\nimport ${component} from "../../src/components/${component}.astro"`)
  })

  return imports
}

export function delimiterState(block: BlockObjectResponse): boolean | null {
  if (block.type === 'paragraph') {
    const text = block.paragraph.rich_text[0]?.plain_text.trim().toLowerCase()

    if (text && text.startsWith('%%') && text.endsWith('%%') && text.includes('::')) {
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
    if (type === 'metadata') {
      return componentMap[type](content)
    }

    return `<!--\n${componentMap[type](content)}\n-->`
  }

  return ''
}

function metadata(content: string[]): string {
  const response = content.reduce((accumulator, current, index) => {
    if (index % 2 === 0 && content[index + 1] !== undefined) {
      accumulator = accumulator.concat(`${current}: ${content[index + 1]}\n`)
    }

    return accumulator
  }, '')

  return `${response}---\n\n`
}

function figure(content: string[]): string {
  if (content.length < 2) {
    return ''
  }

  importSet.add('Figure')

  let response = '<Figure\n'

  const imgs = content.reduce<string[]>((accumulator, current, index) => {
    if (index % 2 === 0 && content[index + 1] !== undefined) {
      accumulator.push(`\t\t"${current}": "/${content[index + 1]}"`)
    }

    return accumulator
  }, [])

  response = response.concat(`\timgs={{\n${imgs.join(',\n')}\n\t}}\n`)

  response = response.concat(`\tcaption={"${content[content.length - 1]}"}`)

  response = response.concat('\n/>')

  return response
}

function carousel(content: string[]): string {
  if (content.length < 3) {
    return ''
  }

  importSet.add('FigureCarousel')

  let response = '<FigureCarousel\n'

  const imgs = content.reduce<string[]>((accumulator, current, index) => {
    if (index % 3 === 0 && content[index + 1] !== undefined && content[index + 2] !== undefined) {
      accumulator.push(`\t\t{\n\t\t\t"altText": "${current}",\n\t\t\t"caption": "${content[index + 1]}",\n\t\t\t"src": "/${content[index + 2]}"\n\t\t}`)
    }

    return accumulator
  }, [])

  response = response.concat(`\timgs={[\n${imgs.join(',\n')}\n\t]}`)

  response = response.concat('\n/>')

  return response
}

function img_desc(content: string[]): string {
  if (content.length < 4) {
    return ''
  }

  importSet.add('ImgWithDesc')

  return `<ImgWithDesc\n\timgSrc={"/${content[0]}"}\n\taltText={"${content[1]}"}\n\tcaption={"${content[2]}"}\n\tdescription={"${content[3]}"}\n/>`
}

function dbtl(content: string[]): string {
  if (content.length < 4) {
    return ''
  }

  importSet.add('DBTLBlock')

  return `<DBTLBlock\n\tdesignText={"${content[0]}"}\n\tbuildText={"${content[1]}"}\n\ttestText={"${content[2]}"}\n\tlearnText={"${content[3]}"}\n/>`
}

function ihp_block(content: string[]): string {
  if (content.length < 4) {
    return ''
  }

  importSet.add('IhpContact')

  return `<IhpContact\n\tname={"${content[0]}"}\n\theadshotImgPath={"/${content[1]}"}\n\tdescription={"${content[2]}"}\n\tblockContent={"${content[3]}"}\n/>`
}
