"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { FileCategory } from "@/types/file"
import { Upload, File, FileText, FileSpreadsheet } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"

export function FileUploader() {
  const [isDragging, setIsDragging] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<FileCategory>("business")
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const { toast } = useToast()

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileUpload(files)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files)
      handleFileUpload(files)
    }
  }

  const handleFileUpload = async (files: File[]) => {
    // Validate file types
    const validFileTypes = [
      "application/pdf",
      "text/plain",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "text/csv",
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
      "image/bmp",
      "image/tiff"
    ]
    const validFiles = files.filter((file) => validFileTypes.includes(file.type))

    if (validFiles.length !== files.length) {
      toast({
        title: "Invalid file type",
        description: "Only PDF, TXT, DOCX, DOC, XLSX, XLS, CSV, and image files (JPEG, PNG, GIF, WebP, BMP, TIFF) are supported.",
        variant: "destructive",
      })

      if (validFiles.length === 0) return
    }

    setIsUploading(true)

    // Simulate upload progress
    let progress = 0
    const interval = setInterval(() => {
      progress += 5
      setUploadProgress(progress)

      if (progress >= 100) {
        clearInterval(interval)
        setTimeout(() => {
          setIsUploading(false)
          setUploadProgress(null)
          toast({
            title: "Upload complete",
            description: `${validFiles.length} file(s) uploaded successfully.`,
          })
        }, 500)
      }
    }, 200)

    // In a real application, you would upload the files to your server here
    // and process them for embedding with OpenAI

    // Simulating API call
    // const formData = new FormData();
    // validFiles.forEach(file => {
    //   formData.append("files", file);
    // });
    // formData.append("category", selectedCategory);

    // const response = await fetch("/api/upload", {
    //   method: "POST",
    //   body: formData,
    // });
  }

  const getFileIcon = (fileType: string) => {
    if (fileType === "application/pdf") {
      return <File className="h-6 w-6 text-red-500" />
    } else if (fileType === "text/plain" || fileType === "text/csv") {
      return <FileText className="h-6 w-6 text-blue-500" />
    } else if (fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || fileType === "application/msword") {
      return <FileText className="h-6 w-6 text-blue-700" />
    } else if (fileType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" || fileType === "application/vnd.ms-excel") {
      return <FileSpreadsheet className="h-6 w-6 text-green-600" />
    } else if (fileType.startsWith('image/')) {
      return <File className="h-6 w-6 text-purple-500" />
    }
    return <File className="h-6 w-6" />
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-2">
        <h3 className="text-lg font-medium">Upload Documents</h3>
        <p className="text-sm text-muted-foreground">Upload PDF, TXT, DOCX, DOC, XLSX, XLS, CSV, or image files (JPEG, PNG, GIF, WebP, BMP, TIFF) to add to your knowledge base.</p>
      </div>

      <Select value={selectedCategory} onValueChange={(value) => setSelectedCategory(value as FileCategory)}>
        <SelectTrigger>
          <SelectValue placeholder="Select category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="business">Business</SelectItem>
          <SelectItem value="personal">Personal</SelectItem>
          <SelectItem value="financial">Financial</SelectItem>
        </SelectContent>
      </Select>

      <Card
        className={`border-2 border-dashed ${
          isDragging ? "border-primary bg-primary/5" : "border-border"
        } transition-colors`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <CardContent className="flex flex-col items-center justify-center py-10 text-center">
          <Upload className="h-10 w-10 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">Drag & Drop Files</h3>
          <p className="text-sm text-muted-foreground mb-4">or click to browse files</p>
          <input
            type="file"
            id="file-upload"
            className="hidden"
            multiple
            accept=".pdf,.txt,.docx,.doc,.xlsx,.xls,.csv,.jpg,.jpeg,.png,.gif,.webp,.bmp,.tiff"
            onChange={handleFileChange}
          />
          <Button asChild>
            <label htmlFor="file-upload">Select Files</label>
          </Button>
        </CardContent>
      </Card>

      {isUploading && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Uploading...</span>
            <span>{uploadProgress}%</span>
          </div>
          <Progress value={uploadProgress || 0} className="h-2" />
        </div>
      )}

      <div className="text-xs text-muted-foreground mt-2">
        <p>Supported file types: PDF, TXT, DOCX, DOC, XLSX, XLS, CSV, JPEG, PNG, GIF, WebP, BMP, TIFF</p>
        <p>Maximum file size: 10MB</p>
      </div>
    </div>
  )
}
