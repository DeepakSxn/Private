"use client"

import { useState, useRef } from "react"
import type { Message } from "@/types/message"
import { Button } from "@/components/ui/button"
import { File, FileText, FileSpreadsheet, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Highlighter, Image, Download, Copy } from "lucide-react"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"

// To fix old messages in Supabase, run this SQL (adjust as needed):
// UPDATE messages SET file = jsonb_build_object('name', 'FILENAME', 'type', 'TYPE', 'size', SIZE, 'url', 'URL') WHERE file IS NOT NULL AND (file->>'name' IS NULL OR file->>'url' IS NULL);

interface ChatMessageProps {
  message: Message
}

interface PDFAnnotation {
  id: string
  page: number
  text: string
  position: { x: number; y: number }
  type: "highlight" | "comment"
}

// Utility to remove source references like [5:0†source], [5:0†day 1.txt], 【5:0†source】, or 【5:0†day 1.txt】
function removeSources(text: string | undefined) {
  if (typeof text !== 'string') return '';
  // Remove all source references like [5:0†source], [5:0†day 1.txt], 【5:0†source】, or 【5:0†day 1.txt】
  let cleaned = text.replace(/(\[.*?†.*?\]|【.*?†.*?】)/g, "");
  // Remove any trailing whitespace
  return cleaned.trim();
}

export function ChatMessage({ message }: ChatMessageProps) {
  const [copied, setCopied] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [showPdfPreview, setShowPdfPreview] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [zoom, setZoom] = useState(1)
  const [annotations, setAnnotations] = useState<PDFAnnotation[]>([])
  const [selectedText, setSelectedText] = useState("")
  const [showAnnotationDialog, setShowAnnotationDialog] = useState(false)
  const [annotationText, setAnnotationText] = useState("")
  const pdfContainerRef = useRef<HTMLDivElement>(null)

  const isUser = message.role === "user"
  const isAssistant = message.role === "assistant"
  const isSystem = message.role === "system"

  // Move isGeneratedImage to the top level of ChatMessage so it can be used in both renderMessageContent and the main render
  const isGeneratedImage =
    message.imageUrl ||
    (message.role === "assistant" &&
      typeof message.content === "string" &&
      message.content.match(/^https?:\/\/.*\.(png|jpg|jpeg|gif|webp|svg|bmp|tiff|ico|avif|apng)(\?.*)?$/i));

  const copyToClipboard = () => {
    navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const toggleExpand = () => {
    setExpanded(!expanded)
  }

  const getFileIcon = (fileType: string) => {
    if (fileType === "application/pdf") {
      return <File className="h-4 w-4 text-red-500" />
    } else if (fileType === "text/plain" || fileType === "text/csv") {
      return <FileText className="h-4 w-4 text-blue-500" />
    } else if (fileType.includes("word") || fileType.includes("document")) {
      return <FileText className="h-4 w-4 text-blue-700" />
    } else if (fileType.includes("excel") || fileType.includes("spreadsheet")) {
      return <FileSpreadsheet className="h-4 w-4 text-green-600" />
    } else if (fileType.includes("image")) {
      return <Image className="h-4 w-4 text-purple-500" />
    }
    return <File className="h-4 w-4" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const handlePdfPreview = () => {
    setShowPdfPreview(true)
  }

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.2, 2))
  }

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.2, 0.5))
  }

  const handlePageChange = (delta: number) => {
    setCurrentPage((prev) => Math.max(1, prev + delta))
  }

  const handleTextSelection = () => {
    const selection = window.getSelection()
    if (selection && selection.toString()) {
      setSelectedText(selection.toString())
      setShowAnnotationDialog(true)
    }
  }

  const handleAddAnnotation = () => {
    if (annotationText && selectedText) {
      const newAnnotation: PDFAnnotation = {
        id: Date.now().toString(),
        page: currentPage,
        text: annotationText,
        position: { x: 0, y: 0 },
        type: "comment",
      }
      setAnnotations((prev) => [...prev, newAnnotation])
      setAnnotationText("")
      setShowAnnotationDialog(false)
    }
  }

  const handleDownload = () => {
    if (message.file?.url) {
      const link = document.createElement("a")
      link.href = message.file.url
      link.download = message.file.name
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Restore renderFilePreview for file messages
  const renderFilePreview = () => {
    if (!message.file?.name || !message.file?.type || !message.file?.size || !message.file?.url) return null;

    const fileType = message.file.type;
    
    if (fileType.includes("image")) {
      return (
        <div className="mt-2">
          <img 
            src={message.file.url} 
            alt={message.file.name}
            className="max-w-full h-auto rounded-lg"
            style={{ maxHeight: "300px" }}
          />
        </div>
      );
    }

    if (fileType === "application/pdf") {
      return (
        <div className="mt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePdfPreview}
            className="flex items-center gap-2"
          >
            <File className="h-4 w-4" />
            Preview PDF
          </Button>
        </div>
      );
    }

    return (
      <div className="mt-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownload}
          className="flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          Download File
        </Button>
      </div>
    );
  }

  const renderMessageContent = () => {
    // 1. Render generated images if present or if content is a valid image URL
    if (isGeneratedImage) {
      const imageUrl = message.imageUrl || message.content;
      return (
        <div className="flex flex-col items-center gap-2 w-full">
          <img
            src={imageUrl}
            alt="Generated"
            className="max-w-full h-auto rounded-lg"
            style={{ maxHeight: "300px" }}
          />
          <Button
            className="mt-2 inline-flex items-center px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 text-black"
            title="Download image"
            onClick={async () => {
              try {
                const response = await fetch(imageUrl, { mode: 'cors' });
                if (!response.ok) throw new Error('Network response was not ok');
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'generated-image.png';
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(url);
              } catch (err) {
                window.open(imageUrl, '_blank');
                alert('Direct download is not supported for this image. Please right-click the image and choose "Save As..." to download.');
              }
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4" />
            </svg>
            Download
          </Button>
        </div>
      );
    }

    // 2. If the assistant's message content is a valid image URL, render it as an image
    if (
      message.role === "assistant" &&
      typeof message.content === "string" &&
      message.content.match(/^https?:\/\/.*\.(png|jpg|jpeg|gif|webp|svg|bmp|tiff|ico|avif|apng)(\?.*)?$/i)
    ) {
      return (
        <div className="flex flex-col items-center gap-2 w-full">
          <img
            src={message.content}
            alt="Generated"
            className="max-w-full h-auto rounded-lg"
            style={{ maxHeight: "300px" }}
          />
        </div>
      );
    }

    if (message.type === "file" && message.file && typeof message.file === 'object' && message.file.name && message.file.type && message.file.size && message.file.url) {
      // Extract the user query from the message content
      let userQuery = "";
      const match = message.content && message.content.match(/User query:([\s\S]*)$/);
      if (match) {
        userQuery = match[1].trim();
      }
      // Always show file info and preview, even if content is empty
      return (
        <div className="flex flex-col gap-2 w-full">
          <div className="flex items-center gap-2">
            {getFileIcon(message.file.type)}
            <div className="flex flex-col min-w-0">
              <span className={cn(
                "font-medium truncate",
                isUser ? "text-black" : "text-black dark:text-black"
              )}>
                {message.file.name}
              </span>
              <span className={cn("text-xs", "text-black/70")}>{formatFileSize(message.file.size)}</span>
            </div>
            <a
              href={message.file.url}
              download={message.file.name}
              className="ml-2 text-xs text-blue-600 underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Download
            </a>
          </div>
          {renderFilePreview()}
          {/* Show user query if present, otherwise for images show a default label */}
          {userQuery ? (
            <div className={cn(
              "mt-2 whitespace-pre-wrap break-words",
              isUser ? "text-black" : "text-black dark:text-black"
            )}>
              <span className="font-semibold">User query:</span> {userQuery}
            </div>
          ) : null}
        </div>
      );
    }
    return (
      <div className={cn(
        "whitespace-pre-wrap break-words w-full",
        "text-black"
      )}>
        {removeSources(message.content)}
      </div>
    )
  }

  // Debug log for message content
  console.log("Rendering message.content:", message.content, typeof message.content);
  return (
    <>
      <div className={cn(
        "flex items-start gap-4 pr-5",
        isUser ? "flex-row-reverse" : "flex-row",
        "w-full"
      )}>
        <div className={cn(
          "flex flex-col gap-1",
          isUser ? "items-end ml-auto" : "items-start",
          "max-w-[85%]"
        )}>
          <div
            className={cn(
              "rounded-2xl px-4 py-2 text-sm break-words",
              isUser ? "bg-gray-300 text-black" : "bg-white text-black",
              isSystem && "bg-yellow-100 dark:bg-yellow-900 text-yellow-900 dark:text-yellow-100",
              "shadow-sm",
              isUser ? "ml-auto" : ""
            )}
            style={{
              wordBreak: "break-word",
              overflowWrap: "break-word",
              maxWidth: "100%"
            }}
          >
            {renderMessageContent()}
            {/* Only show the copy button for assistant text messages (not for generated images) */}
            {isAssistant && !isGeneratedImage && (
              <button
                onClick={handleCopy}
                title={copied ? "Copied!" : "Copy response"}
                className="ml-2 p-1 rounded hover:bg-gray-100 inline-flex items-center"
              >
                <Copy className="w-4 h-4" />
                {copied && <span className="ml-1 text-xs text-green-500">Copied!</span>}
              </button>
            )}
          </div>
        </div>
      </div>

      {message.type === "file" && message.file?.type === "application/pdf" && (
        <Dialog open={showPdfPreview} onOpenChange={setShowPdfPreview}>
          <DialogContent className="max-w-4xl h-[80vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span className="text-black dark:text-black">{message.file.name}</span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={handleZoomOut}>
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={handleZoomIn}>
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => handlePageChange(-1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-black dark:text-black">Page {currentPage}</span>
                  <Button variant="outline" size="icon" onClick={() => handlePageChange(1)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={handleTextSelection}>
                    <Highlighter className="h-4 w-4" />
                  </Button>
                </div>
              </DialogTitle>
            </DialogHeader>
            <div
              ref={pdfContainerRef}
              className="flex-1 overflow-auto bg-gray-100 dark:bg-gray-900 rounded-lg"
              style={{ transform: `scale(${zoom})`, transformOrigin: "top left" }}
            >
              <iframe
                src={`${message.file.url}#page=${currentPage}`}
                className="w-full h-full"
                onMouseUp={handleTextSelection}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}

      <Dialog open={showAnnotationDialog} onOpenChange={setShowAnnotationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Annotation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-2 bg-muted rounded">
              <p className="text-sm font-medium text-black dark:text-black">Selected Text:</p>
              <p className="text-sm text-black dark:text-black">{selectedText}</p>
            </div>
            <Textarea
              placeholder="Add your annotation..."
              value={annotationText}
              onChange={(e) => setAnnotationText(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAnnotationDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddAnnotation}>Add Annotation</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
