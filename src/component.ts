import * as converter from './converter'
import {
  BlockObjectResponse
} from '@notionhq/client/build/src/api-endpoints'

interface ComponentContent {
  data: string;
  block: BlockObjectResponse;
}

const importSet: Set<string> = new Set()

const componentMap: Record<string, (content: ComponentContent[]) => string | Promise<string>> = {
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

export async function ingest(type: string, blocks: BlockObjectResponse[]): Promise<string> {
  const content: ComponentContent[] = []

  for (const block of blocks) {
    content.push({
      data: await converter.convert({ block, rawSyntax: true }),
      block: block
    })
  }

  if (componentMap[type]) {
    const componentTag = await componentMap[type](content)

    if (type === 'metadata') {
      return componentTag
    }

    return `<!--\n${componentTag}\n-->`
  }

  return ''
}

function metadata(content: ComponentContent[]): string {
  const response: string[] = []

  for (let i = 0; i < content.length; i++) {
    if (i % 2 !== 0 || content[i + 1] === undefined) {
      continue
    }

    const current = content[i]

    response.push(`${current.data}: ${content[i + 1].data}\n`)
  }

  return `${response.join('')}---\n\n`
}

async function figure(content: ComponentContent[]): Promise<string> {
  if (content.length < 2) {
    return ''
  }

  importSet.add('Figure')

  const imgs: string[] = []

  for (let i = 0; i < content.length; i++) {
    if (i === content.length - 1) {
      continue
    }

    const current = content[i]
    const caption = await converter.getCaption(current.block)

    imgs.push(`\t\t"${caption}": "/${current.data}"`)
  }

  return `<Figure\n\timgs={{\n${imgs.join(',\n')}\n\t}}\n\tcaption={"${content[content.length - 1].data}"}\n/>`
}

async function carousel(content: ComponentContent[]): Promise<string> {
  if (content.length < 2) {
    return ''
  }

  importSet.add('FigureCarousel')

  const imgs: string[] = []

  for (let i = 0; i < content.length; i++) {
    if (i === content.length - 1) {
      continue
    }

    const current = content[i]
    const caption = await converter.getCaption(current.block)

    imgs.push(`\t\t"${caption}": "/${current.data}"`)
  }

  return `<FigureCarousel\n\timgs={{\n${imgs.join(',\n')}\n\t}}\n\tcaption={"${content[content.length - 1].data}"}\n/>`
}

async function img_desc(content: ComponentContent[]): Promise<string> {
  if (content.length < 3) {
    return ''
  }

  importSet.add('ImgWithDesc')

  const caption = await converter.getCaption(content[0].block)

  return `<ImgWithDesc\n\timgSrc={"/${content[0].data}"}\n\taltText={"${caption}"}\n\tcaption={"${content[1].data}"}\n\tdescription={"${content[2].data}"}\n/>`
}

function dbtl(content: ComponentContent[]): string {
  if (content.length < 4) {
    return ''
  }

  importSet.add('DbtlBlock')

  return `<DbtlBlock\n\tdesignText={"${content[0].data}"}\n\tbuildText={"${content[1].data}"}\n\ttestText={"${content[2].data}"}\n\tlearnText={"${content[3].data}"}\n/>`
}

function ihp_block(content: ComponentContent[]): string {
  if (content.length < 4) {
    return ''
  }

  importSet.add('IhpContact')

  return `<IhpContact\n\tname={"${content[0].data}"}\n\theadshotImgPath={"/${content[1].data}"}\n\tdescription={"${content[2].data}"}\n\tblockContent={"${content[3].data}"}\n/>`
}
