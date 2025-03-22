export interface NotionContent {
  value: string;
}

export interface MarkdownOptions {
  start?: boolean;
  indentation?: number;
  enumerator?: number;
  icon?: Icon;
}

export type Icon = IconEmoji | IconExternal | IconFile | IconCustomEmoji | undefined

interface IconEmoji {
  type: 'emoji';
  emoji: string;
}

interface IconExternal {
  type: 'external';
  external: {
    url: string;
  };
}

interface IconFile {
  type: 'file';
  file: {
    url: string;
    expiry_time: string;
  };
}

interface IconCustomEmoji {
  type: 'custom_emoji';
  custom_emoji: {
    id: string;
    name: string;
    url: string;
  };
}
