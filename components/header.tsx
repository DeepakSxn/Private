"use client"

import { Button } from "@/components/ui/button"
import { Menu, User, Upload, Trash2 } from "lucide-react"
import type { SystemStatus } from "@/types/system-status"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { useState, useEffect } from "react"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { useTheme } from "next-themes"

interface HeaderProps {
  systemStatus: SystemStatus
  toggleSidebar: () => void
}

export function Header({ systemStatus, toggleSidebar }: HeaderProps) {
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false)
  const [profileImage, setProfileImage] = useState<string | null>(null)
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setProfileImage(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveImage = () => {
    setProfileImage(null)
  }

  return (
    <header className="fixed top-0 left-0 w-full z-50 bg-background">
      <div className="flex h-16 items-center px-4 md:px-6 border-b border-border">
        <div className="flex items-center flex-shrink-0">
          {mounted ? (
            <img
              src={theme === 'dark' ? '/dark.webp' : '/light.webp'}
              alt="Logo"
              className="h-10 w-auto"
            />
          ) : (
            <img
              src="/light.webp"
              alt="Logo"
              className="h-10 w-auto"
            />
          )}
        </div>
        <div className="flex-1" />

        <div className="ml-auto flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="text-right hidden md:block">
              <p className="text-sm font-medium">Rajat Jain</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full"
              onClick={() => setIsProfileDialogOpen(true)}
            >
              {profileImage ? (
                <Avatar className="h-9 w-9">
                  <AvatarImage src={profileImage} alt="Profile" />
                  <AvatarFallback>RJ</AvatarFallback>
                </Avatar>
              ) : (
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <User className="h-5 w-5" />
                </div>
              )}
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={isProfileDialogOpen} onOpenChange={setIsProfileDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Profile Picture</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="h-32 w-32 rounded-full overflow-hidden border-2 border-border">
              {profileImage ? (
                <img src={profileImage} alt="Profile" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full bg-primary/10 flex items-center justify-center text-primary">
                  <User className="h-16 w-16" />
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="gap-2" asChild>
                <label>
                  <Upload className="h-4 w-4" />
                  Upload
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageUpload}
                  />
                </label>
              </Button>
              {profileImage && (
                <Button variant="destructive" className="gap-2" onClick={handleRemoveImage}>
                  <Trash2 className="h-4 w-4" />
                  Remove
                </Button>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsProfileDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  )
}
