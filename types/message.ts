export type MessageType = "text" | "image" | "file"

export type MessageRole = "user" | "assistant" | "system"

export interface FileAttachment {
  name: string
  type: string
  size: number
  url: string
}

export interface Message {
  id: string
  content: string
  type: MessageType
  role: MessageRole
  timestamp: Date
  imageUrl?: string
  file?: FileAttachment
  fileContent?: string
}
