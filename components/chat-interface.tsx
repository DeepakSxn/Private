"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Send, Mic, MicOff, Paperclip, Loader2, Menu, X, FileText, StopCircle } from "lucide-react"
import type { Message, FileAttachment } from "@/types/message"
import type { SystemStatus } from "@/types/system-status"
import { ChatMessage } from "@/components/chat-message"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { v4 as uuidv4 } from 'uuid'
import type { SpeechRecognition, SpeechRecognitionEvent, SpeechRecognitionErrorEvent } from "@/types/speech-recognition"

interface ChatInterfaceProps {
  onStatusChange: (status: SystemStatus) => void
  messages: Message[]
  setMessages: (updater: (prev: Message[]) => Message[]) => void
  onToggleSidebar?: () => void
  sidebarOpen?: boolean
  onThreadNameUpdate?: (threadName: string) => void
  addMessage?: (role: string, content: string, file?: FileAttachment) => Promise<any>
  selectedThreadId?: string
  setSelectedThreadId?: (id: string) => void
  createThread?: (name: string) => Promise<any>
  fetchMessages?: () => Promise<void>
}

// Debounce utility
function debounce(fn: (...args: any[]) => void, delay: number) {
  let timer: NodeJS.Timeout | null = null;
  return (...args: any[]) => {
    if (timer) return;
    timer = setTimeout(() => {
      fn(...args);
      timer = null;
    }, delay);
  };
}

// Helper to check if file is an image
function isImageFile(file: File | null | undefined) {
  return file && file.type.startsWith('image/');
}

export function ChatInterface({ 
  onStatusChange, 
  messages, 
  setMessages, 
  onToggleSidebar,
  sidebarOpen,
  onThreadNameUpdate,
  addMessage,
  selectedThreadId,
  setSelectedThreadId,
  createThread,
  fetchMessages
}: ChatInterfaceProps) {
  const [input, setInput] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [abortController, setAbortController] = useState<AbortController | null>(null)
  const [sendLocked, setSendLocked] = useState(false)
  const [pendingMessage, setPendingMessage] = useState<{
    input: string;
    selectedFile: File | null;
  } | null>(null)
  const [lastSendTime, setLastSendTime] = useState(0)
  const [isCreatingThread, setIsCreatingThread] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messageContainerRef = useRef<HTMLDivElement>(null)
  const scrollTopRef = useRef<number>(0)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const { toast } = useToast()
  const prevThreadIdRef = useRef<string | undefined>(selectedThreadId)

  const sendMessageAndGetAIResponse = async (userMessageContent: string) => {
    let threadId = selectedThreadId;
    // Add user message to backend if addMessage is provided
    console.log('sendMessageAndGetAIResponse: about to call addMessage', { addMessageExists: !!addMessage, threadId, userMessageContent });
    if (addMessage && threadId) {
      // Only call addMessage for text messages here, file messages are handled in actuallySendMessage
      if (!selectedFile) {
        const newUserMsg = await addMessage("user", userMessageContent);
        setMessages((prev) => [...prev, newUserMsg]);
      }
    }

    // Get the last message we just added (which contains the file content)
    const lastMessage = messages[messages.length - 1];
    
    setIsProcessing(true)
    setIsStreaming(true)
    onStatusChange({ status: "processing", message: "Processing request..." })

    // Create a new AbortController for this request
    const controller = new AbortController()
    setAbortController(controller)

    // Create a temporary message ID for the assistant's response using UUID
    const tempMessageId = uuidv4()

    try {
      console.log('Sending to AI:', lastMessage.content);
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          messages: [...messages],
          detailedMode: true
        }),
        signal: controller.signal
      })

      if (!response.ok) throw new Error("API error")
      if (!response.body) throw new Error("No response body")

      // Create a temporary message for the assistant's response
      const tempMessage: Message = {
        id: tempMessageId,
        content: "",
        type: "text",
        role: "assistant",
        timestamp: new Date(),
      }

      // Add empty assistant message that we'll update
      setMessages((prev) => {
        const updatedMessages = [...prev];
        updatedMessages.push(tempMessage);
        return updatedMessages;
      });

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let accumulatedContent = ""

      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split("\n")

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6)
            if (data === "[DONE]") continue

            try {
              const parsed = JSON.parse(data)
              let newContent = "";
              if (Array.isArray(parsed.content)) {
                newContent = parsed.content
                  .filter((c: any) => typeof c.text === "string")
                  .map((c: any) => c.text)
                  .join("");
              } else if (typeof parsed.content === "string") {
                newContent = parsed.content;
              }
              if (newContent) {
                accumulatedContent += newContent;
                // Update only the AI message content in real-time
                setMessages((prev) =>
                  prev.map((msg) => {
                    if (msg.role === 'user') return msg;
                    return msg.id === tempMessageId
                      ? { ...msg, content: String(accumulatedContent) }
                      : msg;
                  })
                )
              }
            } catch (e) {
              console.error("Error parsing streaming response:", e)
            }
          }
        }
      }

      // After streaming is complete, save the assistant's message to Supabase
      if (addMessage && selectedThreadId && fetchMessages) {
        console.log("Saving assistant message to Supabase:", accumulatedContent);
        await addMessage("assistant", accumulatedContent);
        await fetchMessages();
      }

      // If this is the first message in the thread, update the thread name
      if (messages.length === 0 && selectedThreadId && onThreadNameUpdate) {
        const newName = accumulatedContent.slice(0, 50); // Limit to 50 chars
        onThreadNameUpdate(newName);
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        // Don't remove the message on abort, just stop streaming
        setIsStreaming(false)
        setIsProcessing(false)
        onStatusChange({ status: "connected", message: "System ready" })
      } else {
        toast({
          title: "Error",
          description: "Failed to process your request. Please try again.",
          variant: "destructive",
        })
        setMessages((prev) => prev.filter((msg) => msg.id !== tempMessageId))
      }
    } finally {
      setIsProcessing(false)
      setIsStreaming(false)
      setAbortController(null)
      onStatusChange({ status: "connected", message: "System ready" })
    }
  };

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Maintain scroll position during sidebar toggle
  useEffect(() => {
    if (messageContainerRef.current) {
      scrollTopRef.current = messageContainerRef.current.scrollTop;
    }
  }, [sidebarOpen])

  // Initialize speech recognition
  useEffect(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition
    if (typeof window !== 'undefined' && SpeechRecognitionAPI) {
      const recognition = new SpeechRecognitionAPI()
      recognitionRef.current = recognition
      
      if (recognitionRef.current) {
        recognitionRef.current.continuous = true
        recognitionRef.current.interimResults = true
        recognitionRef.current.lang = 'en-US'

        recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
          const transcript = Array.from(event.results)
            .map(result => result[0].transcript)
            .join('')
          setInput(transcript)
        }

        recognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
          console.error('Speech recognition error:', event.error)
          if (event.error === 'network') {
            toast({
              title: "Speech Recognition Network Error",
              description: "Network error. Please check your internet connection or try again later.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Voice Input Error",
              description: `There was an error with voice recognition: ${event.error}. Please try again.`,
              variant: "destructive",
            });
          }
          setIsRecording(false)
        }

        recognitionRef.current.onend = () => {
          setIsRecording(false)
        }
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [toast])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Check file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select a file smaller than 10MB",
          variant: "destructive",
        })
        return
      }
      setSelectedFile(file)
    }
  }

  const handleRemoveFile = () => {
    setSelectedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleStopStreaming = () => {
    if (abortController) {
      abortController.abort();
      setIsStreaming(false);
      setIsProcessing(false);
      setSendLocked(false);
      onStatusChange({ status: "connected", message: "System ready" });
    }
  }

  // Effect: When selectedThreadId changes and there is a pending message, send it
  useEffect(() => {
    if (pendingMessage && selectedThreadId) {
      // Call sendMessage with the pending input and file
      actuallySendMessage(pendingMessage.input, pendingMessage.selectedFile);
      setPendingMessage(null);
    }
  }, [selectedThreadId]);

  // Refactor handleSendMessage to use pending logic
  const handleSendMessage = async () => {
    if (sendLocked || isProcessing || (!input.trim() && !selectedFile)) return;
    
    // Prevent multiple thread creations
    if (isCreatingThread) return;
    
    if (!selectedThreadId && createThread && setSelectedThreadId) {
      try {
        setIsCreatingThread(true);
        // No thread: create one and store pending message
        setPendingMessage({ input, selectedFile });
        const newThread = await createThread("New Chat");
        if (newThread.id) setSelectedThreadId(newThread.id);
      } finally {
        setIsCreatingThread(false);
      }
      return;
    }
    // Thread exists: send immediately
    actuallySendMessage(input, selectedFile);
  };

  // Move the message sending logic to a new function
  const actuallySendMessage = async (inputValue: string, file: File | null) => {
    // Detect image generation prompt
    if (
      !file &&
      /\b(generate|create)\b.*\bimage(s)?\b.*\bof\b/i.test(inputValue.trim())
    ) {
      setIsProcessing(true);
      setSendLocked(true);

      // Add the user's message to Supabase
      if (addMessage && selectedThreadId) {
        await addMessage("user", inputValue.trim(), undefined);
      }

      try {
        const res = await fetch('/api/image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: inputValue.trim() }),
        });
        const data = await res.json();
        if (data.url) {
          // Add the assistant's image message to Supabase
          if (addMessage && selectedThreadId) {
            await addMessage("assistant", data.url, undefined);
          }
          // Optionally update UI state for immediate feedback (messages will be re-fetched)
        } else {
          setMessages((prev) => [
            ...prev,
            {
              id: uuidv4(),
              content: data.error || "Failed to generate image.",
              type: "text",
              role: "assistant",
              timestamp: new Date(),
            },
          ]);
        }
        // Update thread name after image generation
        if (onThreadNameUpdate) {
          onThreadNameUpdate(inputValue.trim().slice(0, 50));
        }
      } catch (e) {
        setMessages((prev) => [
          ...prev,
          {
            id: uuidv4(),
            content: "Error generating image.",
            type: "text",
            role: "assistant",
            timestamp: new Date(),
          },
        ]);
      }
      setIsProcessing(false);
      setSendLocked(false);
      setInput("");
      return;
    }
    setSendLocked(true);
    setIsProcessing(true);
    let fullMessage = inputValue.trim();
    let userMessage: Message;
    if (file) {
      const formData = new FormData();
      formData.append('file', file);
      let fileUrl = '';
      let fileText = "";
      // 1. Upload file to Supabase Storage
      try {
        const uploadRes = await fetch('/api/upload-image', { method: 'POST', body: formData });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadData.error || 'Failed to upload file');
        fileUrl = uploadData.url;
      } catch (e) {
        toast({
          title: 'File upload failed',
          description: (e as Error).message,
          variant: 'destructive',
        });
        setSendLocked(false);
        setIsProcessing(false);
        return;
      }

      if (isImageFile(file)) {
        // 2. Send to vision API
        const reader = new FileReader();
        reader.onload = async (event) => {
          const base64 = (event.target?.result as string).split(',')[1];
          const res = await fetch('/api/vision', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              imageBase64: base64,
              userQuery: inputValue.trim()
            })
          });
          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.error || 'Failed to process image');
          }
          // 3. Add user message and assistant response to chat
          userMessage = {
            id: uuidv4(),
            content: `Attached image (${file.name})\n${inputValue.trim()}`,
            type: "file",
            role: "user",
            timestamp: new Date(),
            file: {
              name: file.name,
              type: file.type,
              size: file.size,
              url: fileUrl, // Use Supabase public URL
            },
            fileContent: fileText, // new property for backend/AI
          };
          // Debug log for file object
          console.log('[actuallySendMessage] addMessage file object:', userMessage.file);
          // Persist user message before AI call
          if (addMessage && selectedThreadId && fetchMessages) {
            await addMessage("user", userMessage.content, userMessage.file);
            await fetchMessages();
          }
          // Clear file from input area immediately after sending
          setSelectedFile(null);
          if (fileInputRef.current) fileInputRef.current.value = "";
          // If this is the first message in the thread, update the thread name using the user's message
          if (messages.length === 0 && selectedThreadId && onThreadNameUpdate) {
            const newName = fullMessage.slice(0, 50); // Limit to 50 chars
            onThreadNameUpdate(newName);
          }
          // Add assistant response
          if (addMessage && selectedThreadId && fetchMessages) {
            await addMessage("assistant", data.result, {
              name: file.name,
              type: file.type,
              size: file.size,
              url: fileUrl,
            });
            await fetchMessages();
          }
          setSendLocked(false);
          setIsProcessing(false);
          setInput("");
        };
        reader.readAsDataURL(file);
        return;
      } else {
        // 2. Read the file content (for text files, etc.)
        try {
          const res = await fetch('/api/read-file', { method: 'POST', body: formData });
          if (res.ok) {
            const { text } = await res.json();
            fileText = text;
            // If the file is an Excel file, convert CSV to Markdown table and truncate to 20 rows
            if (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || file.name.endsWith('.xlsx')) {
              function csvToMarkdownTable(csv: string, maxRows: number = 20): string {
                const rows: string[] = csv.trim().split(/\r?\n/).slice(0, maxRows);
                if (rows.length === 0) return '';
                const cells: string[][] = rows.map((row: string) => row.split(','));
                // Pad all rows to the same length
                const colCount: number = Math.max(...cells.map((r: string[]) => r.length));
                const padded: string[][] = cells.map((r: string[]) => r.concat(Array(colCount - r.length).fill('')));
                // Build header and separator
                const header: string = padded[0].map((cell: string) => cell.trim()).join(' | ');
                const separator: string = Array(colCount).fill('---').join(' | ');
                const body: string = padded.slice(1).map((r: string[]) => r.map((cell: string) => cell.trim()).join(' | ')).join('\n');
                return `| ${header} |\n| ${separator} |\n${body ? '| ' + body.split('\n').join(' |\n| ') + ' |' : ''}`;
              }
              const markdownTable = csvToMarkdownTable(fileText, 20);
              fileText = 'This is the content of an Excel spreadsheet. Please summarize or analyze the data below. Only the first 20 rows are shown.\n\n' + markdownTable;
            }
          }
        } catch (e) {
          // handle error
        }
        // 3. Construct the message content for UI only (no file content)
        fullMessage = `Attached file (${file.name})\n${inputValue.trim()}`;
        userMessage = {
          id: uuidv4(),
          content: fullMessage,
          type: "file",
          role: "user",
          timestamp: new Date(),
          file: {
            name: file.name,
            type: file.type,
            size: file.size,
            url: fileUrl, // Use Supabase public URL
          },
          fileContent: fileText, // new property for backend/AI
        };
        // Debug log for file object
        console.log('[actuallySendMessage] addMessage file object:', userMessage.file);
        // Persist user message before AI call
        if (addMessage && selectedThreadId && fetchMessages) {
          await addMessage("user", userMessage.content, userMessage.file);
          await fetchMessages();
        }
        // Clear file from input area immediately after sending
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    } else {
      userMessage = {
         id: uuidv4(),
         content: fullMessage,
         type: "text",
         role: "user",
         timestamp: new Date(),
      };
      // Persist user message before AI call
      if (addMessage && selectedThreadId && fetchMessages) {
        await addMessage("user", userMessage.content);
        await fetchMessages();
      }
    }

    // If this is the first message in the thread, update the thread name using the user's message
    if (messages.length === 0 && selectedThreadId && onThreadNameUpdate) {
       const newName = fullMessage.slice(0, 50); // Limit to 50 chars
       onThreadNameUpdate(newName);
    }

    // Prepare the message history (including the new user message) to send to the AI
    const messageHistory = [...messages, userMessage];
    // Call the AI endpoint (only once per user message)
    let accumulatedContent = "";
    // Create a new AbortController for this request
    const controller = new AbortController();
    setAbortController(controller);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: messageHistory, detailedMode: true }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error("AI API error");
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let done = false;
      while (reader && !done) {
        const { value, done: streamDone } = await reader.read();
        done = streamDone;
        if (value) {
          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") continue;
              try {
                const parsed = JSON.parse(data);
                let newContent = "";
                if (Array.isArray(parsed.content)) {
                  newContent = parsed.content
                    .filter((c: any) => typeof c.text === "string")
                    .map((c: any) => c.text)
                    .join("");
                } else if (typeof parsed.content === "string") {
                  newContent = parsed.content;
                }
                if (newContent) {
                  accumulatedContent += newContent;
                }
              } catch (e) {
                // Ignore parse errors for non-JSON lines
              }
            }
          }
        }
      }
      // Save the assistant's response (accumulatedContent) to Supabase (if addMessage is provided and a thread is selected)
      if (addMessage && selectedThreadId && fetchMessages) {
        await addMessage("assistant", accumulatedContent || "[No response]");
        await fetchMessages();
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        toast({
          title: "Stopped",
          description: "AI response was stopped.",
          variant: "default",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to get AI response.",
          variant: "destructive",
        });
      }
    } finally {
      setSendLocked(false);
      setIsProcessing(false);
      setIsStreaming(false);
      setInput("");
      setSelectedFile(null);
      setAbortController(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const now = Date.now();
      // Prevent multiple sends within 1 second
      if (!sendLocked && !isProcessing && !isCreatingThread && now - lastSendTime > 1000) {
        setLastSendTime(now);
        handleSendMessage();
      }
    }
  }

  const handleAttachFile = () => {
    fileInputRef.current?.click()
  }

  const handleVoiceInput = () => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognitionAPI) {
      toast({
        title: "Voice Input Not Supported",
        description: "Your browser doesn't support voice input. Please use a modern browser.",
        variant: "destructive",
      })
      return
    }

    if (!recognitionRef.current) {
      const recognition = new SpeechRecognitionAPI()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = 'en-US'
      recognitionRef.current = recognition
    }

    if (isRecording) {
      recognitionRef.current?.stop()
      setIsRecording(false)
    } else {
      try {
        recognitionRef.current?.start()
        setIsRecording(true)
        toast({
          title: "Voice Input Started",
          description: "Speak now. Click the microphone button again to stop.",
        })
      } catch (error) {
        console.error('Error starting speech recognition:', error)
        toast({
          title: "Voice Input Error",
          description: "Could not start voice input. Please try again.",
          variant: "destructive",
        })
      }
    }
  }

  // Debug: Log messages before rendering
  console.log('[ChatInterface] messages before render:', messages);

  // Add or update this useEffect to fetch messages when selectedThreadId changes
  useEffect(() => {
    if (selectedThreadId && fetchMessages) {
      fetchMessages();
    }
  }, [selectedThreadId]);

  return (
    <div className="flex flex-col h-full chat-background relative">
      {/* Chat Header - Fixed position */}
      <div className="fixed top-0 left-0 right-0 border-b border-border p-4 flex items-center justify-between bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-40">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleSidebar}
            className="md:hidden"
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle sidebar</span>
          </Button>
          {!sidebarOpen && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleSidebar}
              className="hidden md:flex"
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">Open sidebar</span>
            </Button>
          )}
        </div>
        <div className="flex-1" />
      </div>

      {/* Messages Container - Fixed position below header */}
      <div 
        ref={messageContainerRef}
        className="flex-1 overflow-y-auto p-4 pt-24 pb-28 space-y-4 scrollbar-w-2 scrollbar-track-blue-lighter scrollbar-thumb-blue scrollbar-thumb-rounded"
      >
        <div className="max-w-2xl mx-auto w-full">
          {messages.map((message, idx) => (
            <div key={message.id || idx} className="mb-6">
              <ChatMessage message={message} />
            </div>
          ))}
          {/* Inline AI processing indicator: only show if processing and last message is not assistant */}
          {isProcessing && (!messages.length || messages[messages.length-1].role !== 'assistant') && (
            <div className="mb-6 flex items-start gap-4 pr-5">
              <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-primary">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Container - Fixed position at bottom */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-border p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-40">
        {isRecording && (
          <div className="flex items-center justify-center text-sm text-red-500 mb-2">
            <Mic className="h-3 w-3 animate-pulse mr-1" />
            <span>Listening...</span>
          </div>
        )}

        <div className="max-w-2xl mx-auto w-full">
          {selectedFile && (
            <div className="mb-2 flex items-center gap-2 p-2 bg-muted rounded-lg">
              <FileText className="h-4 w-4 text-primary" />
              <span className="text-sm truncate flex-1">{selectedFile.name}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRemoveFile}
                className="h-6 w-6"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
            accept=".pdf,.txt,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.csv"
          />

          <div className="flex items-end w-full bg-white border border-border rounded-2xl px-4 py-2 shadow-sm">
            <Textarea
              placeholder="Type your message..."
              className="flex-1 border-none outline-none resize-none bg-transparent p-0 m-0 shadow-none focus:outline-none focus:ring-0"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isProcessing || sendLocked || isRecording}
              style={{ minHeight: 60, maxHeight: 200, overflowY: 'auto' }}
            />
            <div className="flex items-end gap-1 pl-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleAttachFile}
                disabled={sendLocked || isProcessing}
                title="Attach file"
                className="text-gray-500 hover:text-gray-700"
              >
                <Paperclip className="h-4 w-4" />
                <span className="sr-only">Attach file</span>
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleVoiceInput} 
                disabled={sendLocked || isProcessing} 
                title={isRecording ? "Stop voice input" : "Start voice input"}
                className={isRecording ? "text-red-500" : ""}
              >
                {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                <span className="sr-only">{isRecording ? "Stop voice input" : "Start voice input"}</span>
              </Button>
              {(isProcessing || isStreaming) ? (
                <Button
                  onClick={handleStopStreaming}
                  variant="ghost"
                  size="icon"
                  title="Stop AI response"
                 // className="text-red-500 hover:text-red-600 bg-transparent shadow-none  active:scale-100"
                  style={{ boxShadow: 'none', outline: 'none', background: 'transparent' }}
                >
                  <StopCircle className="h-6 w-6" />
                  <span className="sr-only">Stop</span>
                </Button>
              ) : (
                <Button
                  onClick={handleSendMessage}
                  disabled={sendLocked || isProcessing || (!input.trim() && !selectedFile) || isRecording}
                  className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground dark:bg-[#2d2d2d] dark:hover:bg-[#3d3d3d]"
                  size="icon"
                  title="Send message"
                >
                  <Send className="h-4 w-4 text-white" />
                  <span className="sr-only">Send</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}