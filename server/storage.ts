import { 
  users, type User, type InsertUser,
  products, type Product, type InsertProduct,
  productImages, type ProductImage, type InsertProductImage,
  conversations, type Conversation, type InsertConversation,
  messages, type Message, type InsertMessage
} from "@shared/schema";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Product operations
  getProduct(id: number): Promise<Product | undefined>;
  getProductsByCategory(category: string): Promise<Product[]>;
  getProductsBySeller(sellerId: number): Promise<Product[]>;
  getAllProducts(): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, product: Partial<Product>): Promise<Product | undefined>;
  deleteProduct(id: number): Promise<boolean>;
  incrementProductViews(id: number): Promise<boolean>;
  
  // Product image operations
  getProductImages(productId: number): Promise<ProductImage[]>;
  createProductImage(image: InsertProductImage): Promise<ProductImage>;
  
  // Conversation operations
  getConversation(id: number): Promise<Conversation | undefined>;
  getConversationByUsers(productId: number, buyerId: number, sellerId: number): Promise<Conversation | undefined>;
  getConversationsByUser(userId: number): Promise<Conversation[]>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  updateConversationLastMessage(id: number, message: string): Promise<boolean>;
  
  // Message operations
  getMessagesByConversation(conversationId: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private products: Map<number, Product>;
  private productImages: Map<number, ProductImage[]>;
  private conversations: Map<number, Conversation>;
  private messages: Map<number, Message[]>;
  private currentIds: {
    user: number;
    product: number;
    productImage: number;
    conversation: number;
    message: number;
  };

  constructor() {
    this.users = new Map();
    this.products = new Map();
    this.productImages = new Map();
    this.conversations = new Map();
    this.messages = new Map();
    this.currentIds = {
      user: 1,
      product: 1,
      productImage: 1,
      conversation: 1,
      message: 1,
    };
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentIds.user++;
    const now = new Date();
    const user: User = { 
      ...insertUser, 
      id, 
      uuid: crypto.randomUUID(),
      createdAt: now 
    };
    this.users.set(id, user);
    return user;
  }

  // Product operations
  async getProduct(id: number): Promise<Product | undefined> {
    return this.products.get(id);
  }

  async getProductsByCategory(category: string): Promise<Product[]> {
    return Array.from(this.products.values()).filter(
      (product) => product.category === category,
    );
  }

  async getProductsBySeller(sellerId: number): Promise<Product[]> {
    return Array.from(this.products.values()).filter(
      (product) => product.sellerId === sellerId,
    );
  }

  async getAllProducts(): Promise<Product[]> {
    return Array.from(this.products.values());
  }

  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const id = this.currentIds.product++;
    const now = new Date();
    const product: Product = { 
      ...insertProduct, 
      id, 
      uuid: crypto.randomUUID(),
      views: 0,
      createdAt: now 
    };
    this.products.set(id, product);
    this.productImages.set(id, []);
    return product;
  }

  async updateProduct(id: number, product: Partial<Product>): Promise<Product | undefined> {
    const existingProduct = this.products.get(id);
    if (!existingProduct) return undefined;
    
    const updatedProduct = { ...existingProduct, ...product };
    this.products.set(id, updatedProduct);
    return updatedProduct;
  }

  async deleteProduct(id: number): Promise<boolean> {
    return this.products.delete(id);
  }

  async incrementProductViews(id: number): Promise<boolean> {
    const product = this.products.get(id);
    if (!product) return false;
    
    product.views = (product.views || 0) + 1;
    this.products.set(id, product);
    return true;
  }

  // Product image operations
  async getProductImages(productId: number): Promise<ProductImage[]> {
    return this.productImages.get(productId) || [];
  }

  async createProductImage(insertImage: InsertProductImage): Promise<ProductImage> {
    const id = this.currentIds.productImage++;
    const now = new Date();
    const image: ProductImage = { ...insertImage, id, createdAt: now };
    
    const productImages = this.productImages.get(insertImage.productId) || [];
    productImages.push(image);
    this.productImages.set(insertImage.productId, productImages);
    
    return image;
  }

  // Conversation operations
  async getConversation(id: number): Promise<Conversation | undefined> {
    return this.conversations.get(id);
  }

  async getConversationByUsers(productId: number, buyerId: number, sellerId: number): Promise<Conversation | undefined> {
    return Array.from(this.conversations.values()).find(
      (conv) => conv.productId === productId && conv.buyerId === buyerId && conv.sellerId === sellerId,
    );
  }

  async getConversationsByUser(userId: number): Promise<Conversation[]> {
    return Array.from(this.conversations.values()).filter(
      (conv) => conv.buyerId === userId || conv.sellerId === userId,
    );
  }

  async createConversation(insertConversation: InsertConversation): Promise<Conversation> {
    const id = this.currentIds.conversation++;
    const now = new Date();
    const conversation: Conversation = { 
      ...insertConversation, 
      id, 
      createdAt: now,
      lastMessage: null,
      lastMessageTime: null
    };
    this.conversations.set(id, conversation);
    this.messages.set(id, []);
    return conversation;
  }

  async updateConversationLastMessage(id: number, message: string): Promise<boolean> {
    const conversation = this.conversations.get(id);
    if (!conversation) return false;
    
    conversation.lastMessage = message;
    conversation.lastMessageTime = new Date();
    this.conversations.set(id, conversation);
    return true;
  }

  // Message operations
  async getMessagesByConversation(conversationId: number): Promise<Message[]> {
    return this.messages.get(conversationId) || [];
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = this.currentIds.message++;
    const now = new Date();
    const message: Message = { ...insertMessage, id, createdAt: now };
    
    const conversationMessages = this.messages.get(insertMessage.conversationId) || [];
    conversationMessages.push(message);
    this.messages.set(insertMessage.conversationId, conversationMessages);
    
    // Update last message in conversation
    this.updateConversationLastMessage(insertMessage.conversationId, insertMessage.content);
    
    return message;
  }
}

export const storage = new MemStorage();
