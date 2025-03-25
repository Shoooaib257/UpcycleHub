import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { WebSocketServer } from "ws";
import WebSocket from "ws";
import { 
  insertUserSchema, 
  insertProductSchema, 
  insertProductImageSchema,
  insertConversationSchema,
  insertMessageSchema
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // WebSocket server for chat
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Store active connections
  const clients = new Map<number, WebSocket>();
  
  wss.on('connection', (ws) => {
    let userId: number | null = null;
    
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        // Handle authentication message
        if (data.type === 'auth') {
          userId = data.userId;
          clients.set(userId, ws);
          console.log(`User ${userId} connected`);
          return;
        }
        
        // Handle chat messages
        if (data.type === 'chat' && userId) {
          const { conversationId, content } = data;
          
          // Create the message
          const newMessage = await storage.createMessage({
            conversationId,
            senderId: userId,
            content
          });
          
          // Get the conversation to find both users
          const conversation = await storage.getConversation(conversationId);
          
          if (conversation) {
            // Determine the recipient (the other user in the conversation)
            const recipientId = (conversation.buyerId === userId) 
              ? conversation.sellerId 
              : conversation.buyerId;
            
            // Send to recipient if they're online
            const recipientWs = clients.get(recipientId);
            if (recipientWs && recipientWs.readyState === WebSocket.OPEN) {
              recipientWs.send(JSON.stringify({
                type: 'message',
                data: newMessage
              }));
            }
            
            // Send confirmation back to sender
            ws.send(JSON.stringify({
              type: 'message_sent',
              data: newMessage
            }));
          }
        }
      } catch (error) {
        console.error("WebSocket error:", error);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format'
        }));
      }
    });
    
    ws.on('close', () => {
      if (userId) {
        clients.delete(userId);
        console.log(`User ${userId} disconnected`);
      }
    });
  });

  // User Routes
  app.post('/api/auth/register', async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if email already exists
      const existingEmail = await storage.getUserByEmail(userData.email);
      if (existingEmail) {
        return res.status(400).json({ message: 'Email already in use' });
      }
      
      // Check if username already exists
      const existingUsername = await storage.getUserByUsername(userData.username);
      if (existingUsername) {
        return res.status(400).json({ message: 'Username already in use' });
      }
      
      const user = await storage.createUser(userData);
      
      // Remove password from the response
      const { password, ...userWithoutPassword } = user;
      
      res.status(201).json({ user: userWithoutPassword, message: 'User created successfully' });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid data', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to create account' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
      }
      
      const user = await storage.getUserByEmail(email);
      
      if (!user || user.password !== password) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      
      // Remove password from the response
      const { password: _, ...userWithoutPassword } = user;
      
      res.status(200).json({ user: userWithoutPassword });
    } catch (error) {
      res.status(500).json({ message: 'Login failed' });
    }
  });

  // Product Routes
  app.get('/api/products', async (req, res) => {
    try {
      const { category } = req.query;
      
      let products;
      if (category && typeof category === 'string') {
        products = await storage.getProductsByCategory(category);
      } else {
        products = await storage.getAllProducts();
      }
      
      res.status(200).json({ products });
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch products' });
    }
  });

  app.get('/api/products/:id', async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      
      if (isNaN(productId)) {
        return res.status(400).json({ message: 'Invalid product ID' });
      }
      
      const product = await storage.getProduct(productId);
      
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }
      
      // Increment view count
      await storage.incrementProductViews(productId);
      
      // Get product images
      const images = await storage.getProductImages(productId);
      
      res.status(200).json({ product, images });
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch product' });
    }
  });

  app.post('/api/products', async (req, res) => {
    try {
      const productData = insertProductSchema.parse(req.body);
      
      const product = await storage.createProduct(productData);
      
      res.status(201).json({ product, message: 'Product created successfully' });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid data', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to create product' });
    }
  });

  app.put('/api/products/:id', async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      
      if (isNaN(productId)) {
        return res.status(400).json({ message: 'Invalid product ID' });
      }
      
      const product = await storage.getProduct(productId);
      
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }
      
      const updatedProduct = await storage.updateProduct(productId, req.body);
      
      res.status(200).json({ product: updatedProduct, message: 'Product updated successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Failed to update product' });
    }
  });

  app.delete('/api/products/:id', async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      
      if (isNaN(productId)) {
        return res.status(400).json({ message: 'Invalid product ID' });
      }
      
      const product = await storage.getProduct(productId);
      
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }
      
      await storage.deleteProduct(productId);
      
      res.status(200).json({ message: 'Product deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Failed to delete product' });
    }
  });

  app.post('/api/products/:id/images', async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      
      if (isNaN(productId)) {
        return res.status(400).json({ message: 'Invalid product ID' });
      }
      
      const product = await storage.getProduct(productId);
      
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }
      
      const imageData = insertProductImageSchema.parse({
        ...req.body,
        productId
      });
      
      const image = await storage.createProductImage(imageData);
      
      res.status(201).json({ image, message: 'Image added successfully' });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid data', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to add image' });
    }
  });

  app.get('/api/products/:id/images', async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      
      if (isNaN(productId)) {
        return res.status(400).json({ message: 'Invalid product ID' });
      }
      
      const images = await storage.getProductImages(productId);
      
      res.status(200).json({ images });
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch images' });
    }
  });

  // Conversation Routes
  app.get('/api/conversations', async (req, res) => {
    try {
      const { userId } = req.query;
      
      if (!userId || typeof userId !== 'string') {
        return res.status(400).json({ message: 'User ID is required' });
      }
      
      const userIdInt = parseInt(userId);
      
      if (isNaN(userIdInt)) {
        return res.status(400).json({ message: 'Invalid user ID' });
      }
      
      const conversations = await storage.getConversationsByUser(userIdInt);
      
      res.status(200).json({ conversations });
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch conversations' });
    }
  });

  app.post('/api/conversations', async (req, res) => {
    try {
      const conversationData = insertConversationSchema.parse(req.body);
      
      // Check if a conversation already exists for these users and product
      const existingConversation = await storage.getConversationByUsers(
        conversationData.productId,
        conversationData.buyerId,
        conversationData.sellerId
      );
      
      if (existingConversation) {
        return res.status(200).json({ conversation: existingConversation, message: 'Conversation already exists' });
      }
      
      const conversation = await storage.createConversation(conversationData);
      
      res.status(201).json({ conversation, message: 'Conversation created successfully' });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid data', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to create conversation' });
    }
  });

  app.get('/api/conversations/:id/messages', async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      
      if (isNaN(conversationId)) {
        return res.status(400).json({ message: 'Invalid conversation ID' });
      }
      
      const conversation = await storage.getConversation(conversationId);
      
      if (!conversation) {
        return res.status(404).json({ message: 'Conversation not found' });
      }
      
      const messages = await storage.getMessagesByConversation(conversationId);
      
      res.status(200).json({ messages });
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch messages' });
    }
  });

  app.post('/api/conversations/:id/messages', async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      
      if (isNaN(conversationId)) {
        return res.status(400).json({ message: 'Invalid conversation ID' });
      }
      
      const conversation = await storage.getConversation(conversationId);
      
      if (!conversation) {
        return res.status(404).json({ message: 'Conversation not found' });
      }
      
      const messageData = insertMessageSchema.parse({
        ...req.body,
        conversationId
      });
      
      const message = await storage.createMessage(messageData);
      
      res.status(201).json({ message, status: 'Message sent successfully' });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid data', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to send message' });
    }
  });

  return httpServer;
}
