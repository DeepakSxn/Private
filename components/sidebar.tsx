"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Search, MoreHorizontal, Check, X, Menu, Plus, Upload, FileText } from "lucide-react"
import type { FileCategory } from "@/types/file"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { useRouter } from "next/navigation"

interface SidebarProps {
  isOpen: boolean
  onNewChat?: () => void
  threads?: { id: string; name: string }[]
  selectedThreadId?: string
  setSelectedThreadId?: (id: string) => void
  onRenameThread?: (id: string, newName: string) => void
  onDeleteThread?: (id: string) => void
  onToggleSidebar?: () => void
}

export function Sidebar({ 
  isOpen, 
  onNewChat, 
  threads = [], 
  selectedThreadId, 
  setSelectedThreadId, 
  onRenameThread, 
  onDeleteThread,
  onToggleSidebar 
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [editingThread, setEditingThread] = useState<{ id: string; name: string } | null>(null)
  const [newThreadName, setNewThreadName] = useState("")
  const router = useRouter()

  // Filter threads based on search query
  const filteredThreads = threads.filter(thread => 
    thread?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false
  )

  const handleRenameClick = (thread: { id: string; name: string }) => {
    setEditingThread(thread)
    setNewThreadName(thread.name)
    setTimeout(() => {
      const input = document.getElementById('thread-name') as HTMLInputElement
      if (input) {
        input.focus()
        input.select()
      }
    }, 0)
  }

  const handleRenameSubmit = () => {
    if (editingThread && newThreadName.trim() && onRenameThread) {
      onRenameThread(editingThread.id, newThreadName.trim())
      setEditingThread(null)
      setNewThreadName("")
    }
  }

  const handleRenameCancel = () => {
    setEditingThread(null)
    setNewThreadName("")
  }

  return (
    <>
      {/* Floating toggle button when sidebar is closed */}
      {!isOpen && (
        <Button
          variant="outline"
          size="icon"
          className="fixed left-6 top-20 z-50 bg-background border border-border shadow-md hover:bg-accent"
          onClick={onToggleSidebar}
        >
          <Menu className="h-4 w-4" />
          <span className="sr-only">Open sidebar</span>
        </Button>
      )}

      {/* Main sidebar */}
      {isOpen && (
        <div
          className="fixed top-16 left-0 w-[270px] h-[calc(100vh-4rem)] z-50 bg-white/70 dark:bg-zinc-900/70 shadow-2xl border-r border-border backdrop-blur-lg transition-transform duration-300 rounded-tr-3xl rounded-br-3xl"
          style={{ transform: isOpen ? "translateX(0)" : "translateX(-100%)", boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)' }}
        >
          <div className="relative h-full flex flex-col w-full text-foreground dark:text-white">
            {/* Toggle button inside sidebar */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute -right-10 top-4 z-40 bg-white/80 dark:bg-zinc-900/80 border border-border dark:border-white/10 rounded-l-none shadow-lg hover:bg-accent/40 dark:hover:bg-white/10 text-foreground dark:text-white backdrop-blur"
              onClick={onToggleSidebar}
            >
              <Menu className="h-4 w-4" />
              <span className="sr-only">Close sidebar</span>
            </Button>

            {/* Fixed header section */}
            <div className="flex-none">
              {/* Tabs for Documents and Upload */}
              <Tabs defaultValue="documents" className="flex-none">
                <div className="mt-6">
                  <TabsList className="w-full flex flex-col h-auto p-0 bg-transparent gap-3">
                    <TabsTrigger
                      value="documents"
                      className={`
                        w-full flex items-center gap-2 justify-start
                        rounded-full px-5 py-3 font-bold text-base text-foreground dark:text-white
                        transition-all duration-200
                        shadow-none border-none outline-none ring-0
                        bg-zinc-100/70 dark:bg-zinc-800/60
                        hover:scale-[1.04] hover:bg-primary/10 dark:hover:bg-primary/10
                        data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary/10 data-[state=active]:to-primary/5
                        data-[state=active]:shadow-md data-[state=active]:text-primary
                        dark:data-[state=active]:from-primary/20 dark:data-[state=active]:to-primary/10
                      `}
                      onClick={() => router.push('/documents')}
                    >
                      <FileText className="h-5 w-5" />
                      <span>Documents</span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="upload"
                      className={`
                        w-full flex items-center gap-2 justify-start
                        rounded-full px-5 py-3 font-bold text-base text-foreground dark:text-white
                        transition-all duration-200
                        shadow-none border-none outline-none ring-0
                        bg-zinc-100/70 dark:bg-zinc-800/60
                        hover:scale-[1.04] hover:bg-primary/10 dark:hover:bg-primary/10
                        data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary/10 data-[state=active]:to-primary/5
                        data-[state=active]:shadow-md data-[state=active]:text-primary
                        dark:data-[state=active]:from-primary/20 dark:data-[state=active]:to-primary/10
                      `}
                      onClick={() => router.push('/upload')}
                    >
                      <Upload className="h-5 w-5" />
                      <span>Upload</span>
                    </TabsTrigger>
                  </TabsList>
                </div>
              </Tabs>

              {/* New Chat Button */}
              <div className="px-4 pt-2 pb-3">
                <Button
                  variant="outline"
                  onClick={onNewChat}
                  className="w-full justify-start gap-2 bg-white/60 dark:bg-zinc-900/60 hover:bg-primary/10 dark:hover:bg-primary/10 text-foreground dark:text-white border-border dark:border-white/10 rounded-xl shadow-sm"
                >
                  <Plus className="h-4 w-4" />
                  New Chat
                </Button>
              </div>

              {/* Search - Fixed position */}
              <div className="px-4 pb-3 border-t border-border dark:border-white/10">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-foreground dark:text-white/50" />
                  <Input
                    type="search"
                    placeholder="Search conversations..."
                    className="pl-8 bg-white/60 dark:bg-zinc-900/60 border-border dark:border-white/10 text-foreground dark:text-white placeholder:text-foreground dark:placeholder:text-white/50 focus-visible:ring-primary/30 dark:focus-visible:ring-primary/30 rounded-xl shadow-sm"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Scrollable threads list */}
            <div className="flex-1 overflow-y-auto min-h-0">
              <div className="px-4 pb-4">
                <h3 className="text-sm font-medium px-2 mb-2 text-foreground dark:text-white/70">
                  {searchQuery ? 'Search Results' : 'Recent Conversations'}
                </h3>
                <div className="space-y-1">
                  {filteredThreads.length > 0 ? (
                    filteredThreads.map((thread) => (
                      <div
                        key={thread.id}
                        className={`group flex items-center justify-between rounded-xl px-3 py-2 transition-all shadow-sm border border-transparent ${
                          thread.id === selectedThreadId 
                            ? 'bg-primary/10 dark:bg-primary/20 text-foreground dark:text-white border-primary/40 dark:border-primary/40 scale-[1.03]' 
                            : 'hover:bg-primary/5 dark:hover:bg-primary/10 text-muted-foreground dark:text-white/70 hover:text-foreground dark:hover:text-white border-border/30 dark:border-white/10'
                        }`}
                        onClick={(e) => {
                          if (!(e.target as HTMLElement).closest('[data-dropdown-trigger]')) {
                            setSelectedThreadId && setSelectedThreadId(thread.id);
                          }
                        }}
                      >
                        <span className="truncate flex-1 text-sm" title={thread.name}>{thread.name}</span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button 
                              data-dropdown-trigger
                              className="ml-2 p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary/10 dark:hover:bg-primary/20 text-foreground dark:hover:bg-white/10" 
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent 
                            align="end" 
                            className="w-56 bg-white/90 dark:bg-zinc-900/90 border-border dark:border-white/10 text-foreground dark:text-white shadow-xl rounded-xl"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <DropdownMenuItem 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRenameClick(thread);
                              }}
                              className="text-foreground dark:text-white hover:bg-primary/10 focus:bg-primary/20 rounded-lg"
                            >
                              Rename
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteThread && onDeleteThread(thread.id);
                              }}
                              className="text-red-400 hover:bg-red-100/60 dark:hover:bg-red-900/40 focus:bg-red-200/60 focus:text-red-400 rounded-lg"
                            >
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-sm text-muted-foreground dark:text-white/50">
                      {searchQuery ? 'No conversations found' : 'No conversations yet'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/30 backdrop-blur-md z-20 md:hidden"
          onClick={onToggleSidebar}
        />
      )}

      <Dialog open={!!editingThread} onOpenChange={(open) => !open && handleRenameCancel()}>
        <DialogContent className="sm:max-w-[425px] bg-background dark:bg-black border-border dark:border-white/10 text-foreground dark:text-white">
          <DialogHeader>
            <DialogTitle className="text-foreground dark:text-white">Rename Thread</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Input
                id="thread-name"
                value={newThreadName}
                onChange={(e) => setNewThreadName(e.target.value)}
                placeholder="Enter new thread name"
                className="text-lg bg-background dark:bg-black border-border dark:border-white/10 text-foreground dark:text-white placeholder:text-foreground dark:placeholder:text-white/50 focus-visible:ring-accent dark:focus-visible:ring-white/20"
                autoFocus
                onFocus={(e) => e.target.select()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleRenameSubmit();
                  } else if (e.key === 'Escape') {
                    handleRenameCancel();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={handleRenameCancel}
              className="flex items-center gap-2 border-border dark:border-white/10 text-foreground dark:text-white hover:bg-accent dark:hover:bg-white/10"
            >
              <X className="h-4 w-4" />
              Cancel
            </Button>
            <Button
              onClick={handleRenameSubmit}
              className="flex items-center gap-2 bg-black text-white hover:bg-black/90 dark:bg-white/10 dark:hover:bg-white/20"
              disabled={!newThreadName.trim()}
            >
              <Check className="h-4 w-4" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}