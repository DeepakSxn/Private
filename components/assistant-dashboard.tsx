"use client"

import { useState } from "react"
import { Header } from "@/components/header"
import { ChatInterface } from "@/components/chat-interface"
import { Sidebar } from "@/components/sidebar"
import type { SystemStatus } from "@/types/system-status"
import { useThreads } from "@/hooks/useThreads"
import { useMessages } from "@/hooks/useMessages"
import type { Message } from "@/types/message"

export function AssistantDashboard() {
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    status: "connected",
    message: "System ready",
  })
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [selectedThreadId, setSelectedThreadId] = useState<string | undefined>(undefined)

  const { 
    threads, 
    loading: threadsLoading, 
    createThread, 
    renameThread, 
    deleteThread, 
    fetchThreads
  } = useThreads()

  const { 
    messages, 
    loading: messagesLoading, 
    addMessage,
    fetchMessages,
    setMessages
  } = useMessages(selectedThreadId)

  const handleNewChat = async () => {
    const newThread = await createThread("New Chat")
    setSelectedThreadId(newThread.id)
    await fetchThreads(); // Refresh sidebar
  }

  const handleDeleteThread = async (id: string) => {
    await deleteThread(id)
    if (selectedThreadId === id) {
      setSelectedThreadId(undefined)
      setMessages([]) // Clear chat area after deleting selected thread
    }
    await fetchThreads(); // Refresh sidebar
  }

  const handleRenameThread = async (id: string, newName: string) => {
    await renameThread(id, newName)
    await fetchThreads(); // Refresh sidebar
  }

  const handleThreadNameUpdate = async (newName: string) => {
    if (selectedThreadId) {
      await renameThread(selectedThreadId, newName)
      await fetchThreads(); // Refresh sidebar
    }
  }

  return (
    <div className="flex h-screen flex-col">
      <Header systemStatus={systemStatus} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar
          isOpen={sidebarOpen}
          onNewChat={handleNewChat}
          threads={threads}
          selectedThreadId={selectedThreadId}
          setSelectedThreadId={setSelectedThreadId}
          onRenameThread={handleRenameThread}
          onDeleteThread={handleDeleteThread}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />
        <main className="flex-1 overflow-hidden transition-all duration-300">
          <ChatInterface
            onStatusChange={setSystemStatus}
            messages={messages}
            setMessages={setMessages}
            onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
            sidebarOpen={sidebarOpen}
            onThreadNameUpdate={handleThreadNameUpdate}
            addMessage={addMessage}
            selectedThreadId={selectedThreadId}
            setSelectedThreadId={setSelectedThreadId}
            createThread={createThread}
          />
        </main>
      </div>
    </div>
  )
}
