export type FileType = "pdf" | "txt" | "docx" | "doc" | "xlsx" | "xls" | "csv" | "jpg" | "jpeg" | "png" | "gif" | "webp" | "bmp" | "tiff"

export type FileCategory = "business" | "personal" | "financial"

export interface FileItem {
  id: string
  name: string
  type: FileType
  category: FileCategory
  size: number // in MB
  uploadedAt: Date
}
