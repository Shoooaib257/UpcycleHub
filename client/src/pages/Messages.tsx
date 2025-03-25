import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { useChat } from "@/hooks/useChat";
import { apiRequest } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Conversation, Message } from "@shared/schema";
import { Search, Send } from "lucide-react";

const Messages = () => {
  const { user } = useAuth();
  const { conversationId } = useParams();
  const [activeConversation, setActiveConversation] = useState<number | null>(
    conversationId ? parseInt(conversationId) : null
  );
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Connect to WebSocket for real-time messaging
  const { messages, sendMessage, addMessage } = useChat(user?.id);

  // Fetch all conversations for the current user
  const { data: conversationsData, isLoading: isLoadingConversations } = useQuery({
    queryKey: ['/api/conversations', user?.id],
    queryFn: async () => {
      if (!user) return { conversations: [] };
      const res = await apiRequest('GET', `/api/conversations?userId=${user.id}`, undefined);
      return res.json();
    },
    enabled: Boolean(user),
  });

  // Fetch messages for the active conversation
  const { data: messagesData, isLoading: isLoadingMessages } = useQuery({
    queryKey: ['/api/conversations/messages', activeConversation],
    queryFn: async () => {
      if (!activeConversation) return { messages: [] };
      const res = await apiRequest('GET', `/api/conversations/${activeConversation}/messages`, undefined);
      return res.json();
    },
    enabled: Boolean(activeConversation),
  });

  // Fetch product and user details for each conversation
  const { data: detailsData, isLoading: isLoadingDetails } = useQuery({
    queryKey: ['/api/conversations/details', conversationsData?.conversations],
    queryFn: async () => {
      if (!conversationsData?.conversations || conversationsData.conversations.length === 0) {
        return { details: {} };
      }
      
      const details: Record<number, { product: any; otherUser: any }> = {};
      
      await Promise.all(
        conversationsData.conversations.map(async (conversation: Conversation) => {
          // Fetch product details
          const productRes = await apiRequest('GET', `/api/products/${conversation.productId}`, undefined);
          const productData = await productRes.json();
          
          // Determine the other user in the conversation (buyer or seller)
          const otherUserId = conversation.buyerId === user?.id ? conversation.sellerId : conversation.buyerId;
          
          // In a real implementation, we would fetch the user details from the API
          // For now, we'll generate a placeholder
          const otherUser = {
            id: otherUserId,
            fullName: otherUserId === conversation.sellerId ? "Seller User" : "Buyer User",
            // Use initials based on the role
            initials: otherUserId === conversation.sellerId ? "SU" : "BU",
          };
          
          details[conversation.id] = {
            product: productData.product,
            otherUser,
          };
        })
      );
      
      return { details };
    },
    enabled: Boolean(conversationsData?.conversations?.length),
  });

  // Scroll to bottom of messages when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messagesData, messages]);

  // Handle message submission
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !activeConversation || !user) return;
    
    // Send the message to the server and via WebSocket
    sendMessage({
      type: "chat",
      conversationId: activeConversation,
      content: newMessage,
    });
    
    // Add the message to the UI immediately for a responsive feel
    addMessage({
      id: Date.now(), // Temporary ID
      conversationId: activeConversation,
      senderId: user.id,
      content: newMessage,
      createdAt: new Date().toISOString(),
    });
    
    setNewMessage("");
  };

  // Prepare data for rendering
  const conversations = conversationsData?.conversations || [];
  const conversationMessages = messagesData?.messages || [];
  const details = detailsData?.details || {};
  
  // Combine API messages with real-time WebSocket messages
  const allMessages = [
    ...conversationMessages,
    ...messages.filter(m => m.conversationId === activeConversation),
  ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  // Loading states
  const isLoading = isLoadingConversations || isLoadingDetails;
  const noConversations = !isLoading && conversations.length === 0;

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <h2 className="text-2xl font-bold text-neutral-900 mb-6">Messages</h2>
      
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="h-[600px] flex">
          {/* Conversations sidebar */}
          <div className="w-80 border-r border-neutral-200">
            <div className="p-4 border-b border-neutral-200">
              <div className="relative">
                <Input
                  type="search"
                  className="w-full bg-neutral-100 border-transparent pl-9"
                  placeholder="Search conversations..."
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-neutral-400" />
                </div>
              </div>
            </div>
            
            <div className="overflow-y-auto h-[548px]">
              {isLoading ? (
                // Loading state
                Array(3).fill(0).map((_, index) => (
                  <div key={index} className="p-4 border-b border-neutral-200">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-neutral-200 animate-pulse"></div>
                      </div>
                      <div className="ml-3 flex-1">
                        <div className="h-4 bg-neutral-200 rounded w-3/4 mb-2 animate-pulse"></div>
                        <div className="h-3 bg-neutral-200 rounded w-1/2 mb-2 animate-pulse"></div>
                        <div className="h-3 bg-neutral-200 rounded w-1/4 animate-pulse"></div>
                      </div>
                    </div>
                  </div>
                ))
              ) : noConversations ? (
                <div className="p-8 text-center">
                  <p className="text-neutral-500">No conversations yet.</p>
                  <p className="text-sm text-neutral-400 mt-2">
                    Start by viewing a product and contacting a seller.
                  </p>
                </div>
              ) : (
                conversations.map((conversation: Conversation) => {
                  const conversationDetails = details[conversation.id];
                  const isActive = activeConversation === conversation.id;
                  const otherUser = conversationDetails?.otherUser;
                  const product = conversationDetails?.product;
                  
                  return (
                    <div
                      key={conversation.id}
                      className={`border-b border-neutral-200 cursor-pointer hover:bg-neutral-50 ${
                        isActive ? "bg-emerald-50 bg-opacity-10" : ""
                      }`}
                      onClick={() => setActiveConversation(conversation.id)}
                    >
                      <div className="p-4">
                        <div className="flex items-start">
                          <div className="flex-shrink-0">
                            <Avatar className="h-10 w-10">
                              <AvatarFallback className="bg-neutral-200 text-neutral-600">
                                {otherUser?.initials || "?"}
                              </AvatarFallback>
                            </Avatar>
                          </div>
                          <div className="ml-3 flex-1">
                            <p className="text-sm font-medium text-neutral-900">
                              {otherUser?.fullName || "User"}
                            </p>
                            <p className="text-sm text-neutral-500 truncate">
                              About: {product?.title || "Product"}
                            </p>
                            <div className="mt-1 flex items-center">
                              <p className="text-xs text-neutral-500">
                                {conversation.lastMessageTime ? (
                                  formatDistanceToNow(new Date(conversation.lastMessageTime), { addSuffix: true })
                                ) : (
                                  "No messages yet"
                                )}
                              </p>
                              {conversation.lastMessageTime && (
                                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500 text-white">
                                  New
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
          
          {/* Chat area */}
          <div className="flex-1 flex flex-col">
            {!activeConversation ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-neutral-500">Select a conversation to start chatting</p>
                </div>
              </div>
            ) : (
              <>
                {/* Chat header */}
                {isLoadingDetails ? (
                  <div className="flex items-center justify-between p-4 border-b border-neutral-200">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-neutral-200 animate-pulse"></div>
                      <div className="ml-3">
                        <div className="h-4 bg-neutral-200 rounded w-24 mb-1 animate-pulse"></div>
                        <div className="h-3 bg-neutral-200 rounded w-32 animate-pulse"></div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-4 border-b border-neutral-200">
                    <div className="flex items-center">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-neutral-200 text-neutral-600">
                          {details[activeConversation]?.otherUser?.initials || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-neutral-900">
                          {details[activeConversation]?.otherUser?.fullName || "User"}
                        </p>
                        <p className="text-xs text-neutral-500">
                          About: {details[activeConversation]?.product?.title || "Product"} - 
                          ${details[activeConversation]?.product?.price 
                              ? (details[activeConversation].product.price / 100).toFixed(2) 
                              : "0.00"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Chat messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {isLoadingMessages ? (
                    Array(3).fill(0).map((_, index) => (
                      <div key={index} className={`flex items-end ${index % 2 === 0 ? "" : "justify-end"}`}>
                        {index % 2 === 0 && (
                          <div className="flex-shrink-0 mr-3">
                            <div className="h-8 w-8 rounded-full bg-neutral-200 animate-pulse"></div>
                          </div>
                        )}
                        <div className={`flex flex-col space-y-2 max-w-[75%] ${index % 2 === 0 ? "" : "items-end"}`}>
                          <div className={`${
                            index % 2 === 0 
                              ? "bg-neutral-200 rounded-lg chat-bubble-left" 
                              : "bg-emerald-200 rounded-lg chat-bubble-right"
                            } py-2 px-4 animate-pulse h-16 w-64`}></div>
                          <div className="h-3 bg-neutral-200 rounded w-16 animate-pulse"></div>
                        </div>
                      </div>
                    ))
                  ) : allMessages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-neutral-500">No messages yet. Start the conversation!</p>
                    </div>
                  ) : (
                    <>
                      {/* Group messages by date */}
                      {allMessages.reduce((acc: JSX.Element[], message: Message, index: number, arr: Message[]) => {
                        // Check if we need a date separator
                        if (index === 0 || new Date(message.createdAt).toDateString() !== new Date(arr[index - 1].createdAt).toDateString()) {
                          acc.push(
                            <div key={`date-${index}`} className="relative flex items-center py-2">
                              <div className="flex-grow border-t border-neutral-200"></div>
                              <span className="flex-shrink-0 mx-4 text-xs text-neutral-500">
                                {new Date(message.createdAt).toLocaleDateString()}
                              </span>
                              <div className="flex-grow border-t border-neutral-200"></div>
                            </div>
                          );
                        }
                        
                        // Add the message
                        const isSender = message.senderId === user?.id;
                        
                        acc.push(
                          <div key={`msg-${message.id}`} className={`flex items-end ${isSender ? "justify-end" : ""}`}>
                            {!isSender && (
                              <div className="flex-shrink-0 mr-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback className="bg-neutral-200 text-neutral-600 text-xs">
                                    {details[activeConversation]?.otherUser?.initials || "?"}
                                  </AvatarFallback>
                                </Avatar>
                              </div>
                            )}
                            <div className={`flex flex-col space-y-2 max-w-[75%] ${isSender ? "items-end" : ""}`}>
                              <div 
                                className={`py-2 px-4 rounded-lg ${
                                  isSender 
                                    ? "bg-primary text-white chat-bubble-right" 
                                    : "bg-neutral-100 text-neutral-800 chat-bubble-left"
                                }`}
                              >
                                <p className="text-sm">{message.content}</p>
                              </div>
                              <span className="text-xs text-neutral-500">
                                {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                              </span>
                            </div>
                          </div>
                        );
                        
                        return acc;
                      }, [])}
                      
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>
                
                {/* Chat input */}
                <div className="border-t border-neutral-200 p-4">
                  <form className="flex space-x-2" onSubmit={handleSendMessage}>
                    <Input
                      type="text"
                      className="flex-1"
                      placeholder="Type a message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                    />
                    <Button type="submit" disabled={!newMessage.trim()}>
                      <Send className="h-5 w-5" />
                    </Button>
                  </form>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Messages;
