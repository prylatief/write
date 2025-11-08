
export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export enum CitationStyle {
  APA = "APA 7th",
  MLA = "MLA 9th",
  Chicago = "Chicago 17th",
  Harvard = "Harvard",
  IEEE = "IEEE",
  Nature = "Nature",
}

export enum Language {
  English = "English",
  Indonesian = "Bahasa Indonesia",
  Arabic = "العربية",
  Chinese = "中文",
}
