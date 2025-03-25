import { useState, useEffect, useCallback } from "react";
import { Message } from "@shared/schema";

type ChatMessage = {
  id: number;
  conversationId: number;
  senderId: number;
  content: string;
  createdAt: string;
};

type WebSocketMessage = {
  type: string;
  conversationId?: number;
  content?: string;
  userId?: number;
  data?: any;
};

export const useChat = (userId: number | undefined) => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Initialize WebSocket connection
  useEffect(() => {
    if (!userId) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      setConnected(true);
      console.log("WebSocket connected");
      
      // Authenticate with the WebSocket server
      ws.send(JSON.stringify({
        type: "auth",
        userId,
      }));
    };
    
    ws.onclose = () => {
      setConnected(false);
      console.log("WebSocket disconnected");
    };
    
    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === "message") {
          // New message from someone else
          addMessage(data.data);
        } else if (data.type === "message_sent") {
          // Confirmation of a message we sent
          // We could use this to update the status of a message
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };
    
    setSocket(ws);
    
    // Clean up on unmount
    return () => {
      ws.close();
    };
  }, [userId]);

  // Send a message via WebSocket
  const sendMessage = useCallback(
    (message: WebSocketMessage) => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(message));
      } else {
        console.error("WebSocket not connected");
      }
    },
    [socket]
  );

  // Add a message to the local state
  const addMessage = useCallback((message: ChatMessage) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  return {
    connected,
    messages,
    sendMessage,
    addMessage,
  };
};
