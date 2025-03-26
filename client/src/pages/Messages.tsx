// @ts-ignore
import { useState, useEffect, useRef } from "react";
// @ts-ignore
import { useQuery } from "@tanstack/react-query";
// @ts-ignore
import { useParams } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { useChat } from "@/hooks/useChat";
import { getSupabase } from "@/lib/supabase";
// @ts-ignore
import { formatDistanceToNow } from "date-fns";
// @ts-ignore
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
// @ts-ignore
import { Button } from "@/components/ui/button";
// @ts-ignore
import { Input } from "@/components/ui/input";
import { Conversation, Message } from "@shared/schema";
// @ts-ignore
import { Search, Send } from "lucide-react";

const Messages = () => {
  const { user } = useAuth();
  const { conversationId } = useParams();
  const [activeConversation, setActiveConversation] = useState<number | null>(
    conversationId ? parseInt(conversationId) : null
  );
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = getSupabase();
  
  // Connect to WebSocket for real-time messaging
  const { messages, sendMessage, addMessage } = useChat(user?.id);

  // Fetch all conversations for the current user
  const { data: conversationsData, isLoading: isLoadingConversations } = useQuery({
    queryKey: ['conversations', user?.id],
    queryFn: async () => {
      if (!user) return { conversations: [] };
      
      const { data: conversations, error } = await supabase
        .from('conversations')
        .select('*')
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { conversations: conversations || [] };
    },
    enabled: Boolean(user),
  });

  // Fetch messages for the active conversation
  const { data: messagesData, isLoading: isLoadingMessages } = useQuery({
    queryKey: ['conversation-messages', activeConversation],
    queryFn: async () => {
      if (!activeConversation) return { messages: [] };
      
      const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', activeConversation)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return { messages: messages || [] };
    },
    enabled: Boolean(activeConversation),
  });

  // Fetch product and user details for each conversation
  const { data: detailsData, isLoading: isLoadingDetails } = useQuery({
    queryKey: ['conversation-details', conversationsData?.conversations],
    queryFn: async () => {
      if (!conversationsData?.conversations || conversationsData.conversations.length === 0) {
        return { details: {} };
      }
      
      const details: Record<number, { product: any; otherUser: any }> = {};
      
      await Promise.all(
        conversationsData.conversations.map(async (conversation: Conversation) => {
          // Fetch product details
          const { data: product, error: productError } = await supabase
            .from('products')
            .select('*')
            .eq('id', conversation.product_id)
            .single();

          if (productError) throw productError;
          
          // Determine the other user in the conversation (buyer or seller)
          const otherUserId = conversation.buyer_id === user?.id ? conversation.seller_id : conversation.buyer_id;
          
          // Fetch user details
          const { data: otherUserData, error: userError } = await supabase
            .from('users')
            .select('full_name')
            .eq('id', otherUserId)
            .single();

          if (userError) throw userError;
          
          const otherUser = {
            id: otherUserId,
            fullName: otherUserData?.full_name || 'Unknown User',
            initials: (otherUserData?.full_name || 'UN').split(' ').map((n: string) => n[0]).join(''),
          };
          
          details[conversation.id] = {
            product,
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

  // Handle sending a new message
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !activeConversation || !user) return;

    try {
      const { data: message, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: activeConversation,
          sender_id: user.id,
          content: newMessage.trim()
        })
        .select()
        .single();

      if (error) throw error;

      // Add message to WebSocket state
      addMessage(message);
      
      // Clear input
      setNewMessage("");
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  // Handle pressing enter to send message
  // @ts-ignore
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!user) {
    return (
      // @ts-ignore
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <p className="text-neutral-600">Please log in to view messages.</p>
      </div>
    );
  }

  // @ts-ignore
  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Conversations List */}
      <div className="w-80 border-r border-neutral-200 bg-white">
        <div className="p-4 border-b border-neutral-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-500 h-4 w-4" />
            <Input
              placeholder="Search conversations..."
              className="pl-9"
            />
          </div>
        </div>
        
        <div className="overflow-y-auto h-full">
          {isLoadingConversations ? (
            <div className="p-4 text-center">
              <p className="text-neutral-600">Loading conversations...</p>
            </div>
          ) : conversationsData?.conversations.length === 0 ? (
            <div className="p-4 text-center">
              <p className="text-neutral-600">No conversations yet.</p>
            </div>
          ) : (
            conversationsData?.conversations.map((conversation: Conversation) => {
              const details = detailsData?.details[conversation.id];
              return (
                <button
                  key={conversation.id}
                  onClick={() => setActiveConversation(conversation.id)}
                  className={`w-full p-4 text-left hover:bg-neutral-50 ${
                    activeConversation === conversation.id ? 'bg-neutral-100' : ''
                  }`}
                >
                  <div className="flex items-center">
                    <Avatar>
                      <AvatarFallback>
                        {details?.otherUser?.initials || '??'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="ml-3">
                      <p className="font-medium text-sm">
                        {details?.otherUser?.fullName || 'Loading...'}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {details?.product?.title || 'Loading product...'}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 flex flex-col bg-neutral-50">
        {activeConversation ? (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4">
              {isLoadingMessages ? (
                <div className="text-center">
                  <p className="text-neutral-600">Loading messages...</p>
                </div>
              ) : (
                <>
                  {messagesData?.messages.map((message: Message) => (
                    <div
                      key={message.id}
                      className={`flex mb-4 ${
                        message.sender_id === user.id ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg p-3 ${
                          message.sender_id === user.id
                            ? 'bg-primary text-white'
                            : 'bg-white border border-neutral-200'
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                        <p className="text-xs mt-1 opacity-70">
                          {message.created_at
                            ? formatDistanceToNow(new Date(message.created_at), {
                                addSuffix: true,
                              })
                            : 'Just now'}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Message Input */}
            <div className="p-4 bg-white border-t border-neutral-200">
              <div className="flex space-x-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type a message..."
                  className="flex-1"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-neutral-600">Select a conversation to start messaging.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Messages;
