"use client";
import { useState, useRef } from 'react';
import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { FileText, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setStatus('');
      setProgress(0);
    }
  };

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      setStatus('');
      setProgress(0);
    }
  };

  const handleCardClick = () => {
    fileInputRef.current?.click();
  };

  const resetForm = () => {
    setFile(null);
    setStatus('');
    setProgress(0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setStatus('');
    setLoading(true);
    setProgress(0);
    const formData = new FormData();
    formData.append('file', file);
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload-to-vectorstore', true);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        let percent = Math.round((event.loaded / event.total) * 100);
        if (percent >= 100) percent = 95; // Cap at 95% until upload is done
        setProgress(percent > 95 ? 95 : percent);
      }
    };
    xhr.onload = () => {
      setLoading(false);
      setProgress(100);
      try {
        const response = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300 && response.success) {
          setStatus('Upload successful!');
          setTimeout(() => {
            resetForm();
          }, 1500);
        } else {
          setStatus('Upload failed: ' + (response.details || response.error || 'Unknown error'));
        }
      } catch (e) {
        console.error('Error parsing response:', e);
        setStatus('Upload failed: Invalid server response');
      }
    };
    xhr.onerror = () => {
      setLoading(false);
      setProgress(0);
      setStatus('Upload failed: Network error. Please check your connection and try again.');
    };
    xhr.send(formData);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background dark:bg-black">
      <Header systemStatus={{status: 'connected', message: 'System ready'}} toggleSidebar={() => {}} />
      <Button
        onClick={() => router.push('/chat')}
        className="fixed left-4 top-20 flex items-center gap-2 px-4 py-2 bg-black text-white hover:bg-white hover:text-black border border-black rounded-full transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 z-50"
      >
        <ArrowLeft className="h-4 w-4" />
        <span className="font-medium">
          Back to Chat Area
        </span>
      </Button>
      <main className="flex-1 flex flex-col items-center justify-center p-4 mt-16">
        <div className="w-full max-w-md relative">
          <div
            className={`w-full bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl p-10 flex flex-col items-center gap-8 border border-border dark:border-zinc-800 transition-all relative cursor-pointer ${dragActive ? 'ring-4 ring-primary/40 dark:ring-primary/60' : ''}`}
            onClick={handleCardClick}
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            tabIndex={0}
          >
            <h1 className="text-3xl font-extrabold mb-2 text-center text-foreground dark:text-white tracking-tight">Upload Your Files</h1>
            <form onSubmit={handleSubmit} className="flex flex-col items-center gap-4 w-full" onClick={e => e.stopPropagation()}>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileChange}
                accept=".pdf,.txt,.docx,.doc,.xlsx,.xls,.csv,.jpg,.jpeg,.png,.gif,.webp,.bmp,.tiff"
                className="w-full text-foreground dark:text-white hidden"
                tabIndex={-1}
              />
              <div className="w-full flex items-center gap-2">
                <Button type="button" className="font-semibold border border-input bg-background text-black hover:bg-accent hover:text-accent-foreground" onClick={() => fileInputRef.current?.click()}>
                  Choose File
                </Button>
                <span className="truncate text-base text-foreground dark:text-white">{file ? file.name : 'No file chosen'}</span>
              </div>
              {file && (
                <div className="flex items-center gap-2 w-full bg-muted dark:bg-zinc-800 rounded p-2 mt-2">
                  <FileText className="text-primary dark:text-zinc-300" />
                  <span className="truncate text-sm text-foreground dark:text-white">{file.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground dark:text-zinc-400">{(file.size / 1024).toFixed(1)} KB</span>
                </div>
              )}
              <Button type="submit" className="w-full mt-2 text-white dark:text-black font-semibold bg-[#000000] hover:bg-[#000000]/90 dark:bg-white dark:hover:bg-white/90" disabled={!file || loading}>
                {loading ? 'Uploading...' : 'Upload'}
              </Button>
            </form>
            <div className="w-full flex flex-col gap-2">
              {(loading || progress > 0) && (
                <div className="w-full h-3 bg-muted dark:bg-zinc-800 rounded overflow-hidden border border-border dark:border-zinc-700 mt-2">
                  <div
                    className="h-full bg-primary dark:bg-zinc-400 transition-all duration-200 flex items-center justify-end pr-2"
                    style={{ width: `${progress}%` }}
                  >
                    {progress > 8 && (
                      <span className="text-xs font-semibold text-white dark:text-black">{progress}%</span>
                    )}
                  </div>
                </div>
              )}
              {status && (
                <p className={`mt-2 text-center text-base font-medium ${status.includes('successful') ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{status}</p>
              )}
              <div className="text-xs text-muted-foreground dark:text-zinc-400 mt-2 text-center select-none">
                Drag & drop a file here, or click anywhere on the card to select.
              </div>
            </div>
            {dragActive && (
              <div className="absolute inset-0 rounded-2xl bg-primary/10 dark:bg-primary/20 pointer-events-none z-10 transition-all" />
            )}
          </div>
        </div>
      </main>
    </div>
  );
} 