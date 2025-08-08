import { useState, useEffect, useCallback } from "react";
import type { Message, FileAttachment } from "@/types/message";

export function useMessages(threadId: string | undefined) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch messages for a thread
  const fetchMessages = useCallback(async () => {
    if (!threadId) return;
    setLoading(true);
    const res = await fetch(`/api/threads/${threadId}/messages`);
    const data = await res.json();
    console.log(`[useMessages] API /api/threads/${threadId}/messages response:`, data);
    setMessages(Array.isArray(data) ? data : []);
    console.log(`[useMessages] messages state set to:`, Array.isArray(data) ? data : []);
    setLoading(false);
  }, [threadId]);

  // Add a message to a thread
  const addMessage = async (role: string, content: string, file?: FileAttachment) => {
    if (!threadId) return;
    console.log(`[useMessages] addMessage called with:`, { threadId, role, content, file });
    const res = await fetch(`/api/threads/${threadId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, content, file }),
    });
    const newMsg = await res.json();
    console.log(`[useMessages] API /api/threads/${threadId}/messages POST response:`, newMsg);
    // Don't automatically add to messages state - let the parent component handle this
    return newMsg;
  };

  // Only fetch messages when threadId changes, but not automatically
  useEffect(() => {
    if (threadId) {
      fetchMessages();
    } else {
      setMessages([]);
      setLoading(false);
    }
  }, [threadId, fetchMessages]);

  return {
    messages,
    loading,
    fetchMessages,
    addMessage,
    setMessages,
  };
} 