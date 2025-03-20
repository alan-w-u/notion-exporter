export interface MarkdownOpts {
  start?: boolean,
  indentation?: number,
  enumerator?: number,
  icon?: Icon
}

export interface Icon {
  type: string,
  value: string
}
