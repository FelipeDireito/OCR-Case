"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";

interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
  createdAt: string;
}

interface Conversation {
  id: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  documentId: string;
  messages: Message[];
  document: {
    fileName: string;
    fileType: string;
    fileSize: number;
    extractedText: string | null;
  };
}

interface DocumentChatProps {
  documentId: string;
}

export default function DocumentChat({ documentId }: DocumentChatProps) {
  const { data: session } = useSession();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch or create conversation on component mount
  useEffect(() => {
    const fetchOrCreateConversation = async () => {
      if (!session?.user?.token || !documentId) return;

      try {
        setLoading(true);
        // First try to find an existing conversation for this document
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/conversations`,
          {
            headers: {
              Authorization: `Bearer ${session.user.token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch conversations");
        }

        const conversations = await response.json();
        const existingConversation = conversations.find(
          (conv: any) => conv.documentId === documentId
        );

        if (existingConversation) {
          // If found, fetch the full conversation with messages
          const detailResponse = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/conversations/${existingConversation.id}`,
            {
              headers: {
                Authorization: `Bearer ${session.user.token}`,
              },
            }
          );

          if (!detailResponse.ok) {
            throw new Error("Failed to fetch conversation details");
          }

          const conversationDetails = await detailResponse.json();
          setConversation(conversationDetails);
        } else {
          // If not found, create a new conversation
          setCreating(true);
          const createResponse = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/conversations`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session.user.token}`,
              },
              body: JSON.stringify({ documentId }),
            }
          );

          if (!createResponse.ok) {
            throw new Error("Failed to create conversation");
          }

          const newConversation = await createResponse.json();
          setConversation(newConversation);
          setCreating(false);
        }
      } catch (err: any) {
        console.error("Error with conversation:", err);
        setError(err.message || "Failed to load or create conversation");
      } finally {
        setLoading(false);
        setCreating(false);
      }
    };

    fetchOrCreateConversation();
  }, [documentId, session]);

  // Scroll to bottom of messages when conversation updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation?.messages]);

  // Handle sending a message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !conversation || !session?.user?.token) return;

    try {
      setSending(true);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/conversations/message`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.user.token}`,
          },
          body: JSON.stringify({
            conversationId: conversation.id,
            content: message,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      const result = await response.json();
      
      // Update the conversation with the new messages
      setConversation((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          messages: [
            ...prev.messages,
            result.userMessage,
            result.assistantMessage,
          ],
        };
      });
      
      // Clear the input
      setMessage("");
      setError("");
    } catch (err: any) {
      console.error("Error sending message:", err);
      setError(err.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="mb-2 h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-blue-500"></div>
          <p>Loading conversation...</p>
        </div>
      </div>
    );
  }

  if (creating) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="mb-2 h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-blue-500"></div>
          <p>Creating new conversation...</p>
        </div>
      </div>
    );
  }

  if (error && !conversation) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="rounded-lg bg-red-50 p-4 text-red-700">
          <h3 className="mb-2 font-semibold">Error</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!conversation?.document.extractedText) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="rounded-lg bg-yellow-50 p-4 text-yellow-700">
          <h3 className="mb-2 font-semibold">Document Not Processed</h3>
          <p>
            This document hasn't been processed with OCR yet. Please extract text
            from the document before starting a conversation.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Document Chat</h2>
      </div>

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto rounded border border-gray-300 bg-gray-50 p-4">
        {conversation?.messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-gray-500">
            <p className="mb-2">No messages yet</p>
            <p className="text-sm">
              Start a conversation by asking a question about this document.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {conversation?.messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-3/4 rounded-lg p-3 ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-800"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  <p
                    className={`mt-1 text-right text-xs ${
                      msg.role === "user" ? "text-blue-200" : "text-gray-500"
                    }`}
                  >
                    {new Date(msg.createdAt).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Message input */}
      <form onSubmit={handleSendMessage} className="mt-4">
        {error && (
          <div className="mb-2 rounded bg-red-50 p-2 text-sm text-red-700">
            {error}
          </div>
        )}
        <div className="flex">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ask a question about this document..."
            className="flex-1 rounded-l border border-gray-300 p-2 focus:border-blue-500 focus:outline-none"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={sending || !message.trim()}
            className="rounded-r bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:bg-blue-300"
          >
            {sending ? (
              <span className="flex items-center">
                <svg
                  className="mr-2 h-4 w-4 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Sending...
              </span>
            ) : (
              "Send"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
