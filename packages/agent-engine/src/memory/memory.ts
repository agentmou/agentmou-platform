/**
 * Stored memory item associated with an agent or session.
 */
export interface Memory {
  id: string;
  type: 'short_term' | 'long_term' | 'episodic' | 'semantic';
  content: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  expiresAt?: Date;
}

/**
 * Single conversational turn captured for short-term context.
 */
export interface ConversationTurn {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

/**
 * Filter options for querying stored memories.
 */
export interface MemoryQuery {
  type?: Memory['type'];
  search?: string;
  limit?: number;
  timeRange?: { start: Date; end: Date };
}

/**
 * In-memory implementation of conversational and long-lived memory primitives.
 */
export class MemoryManager {
  private memories: Map<string, Memory> = new Map();
  private conversations: Map<string, ConversationTurn[]> = new Map();

  async addMemory(memory: Omit<Memory, 'id'>): Promise<Memory> {
    const id = `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newMemory: Memory = { id, ...memory };
    this.memories.set(id, newMemory);
    return newMemory;
  }

  async getMemory(id: string): Promise<Memory | undefined> {
    return this.memories.get(id);
  }

  async searchMemories(query: MemoryQuery): Promise<Memory[]> {
    let results = Array.from(this.memories.values());

    if (query.type) {
      results = results.filter((m) => m.type === query.type);
    }

    if (query.search) {
      results = results.filter((m) =>
        m.content.toLowerCase().includes(query.search!.toLowerCase())
      );
    }

    return results.slice(0, query.limit || 100);
  }

  async addConversationTurn(
    sessionId: string,
    turn: Omit<ConversationTurn, 'timestamp'>
  ): Promise<ConversationTurn> {
    const newTurn: ConversationTurn = {
      ...turn,
      timestamp: new Date(),
    };

    if (!this.conversations.has(sessionId)) {
      this.conversations.set(sessionId, []);
    }

    this.conversations.get(sessionId)!.push(newTurn);
    return newTurn;
  }

  async getConversationHistory(sessionId: string, limit?: number): Promise<ConversationTurn[]> {
    const turns = this.conversations.get(sessionId) || [];
    return limit ? turns.slice(-limit) : turns;
  }

  async clearConversation(sessionId: string): Promise<void> {
    this.conversations.delete(sessionId);
  }

  async deleteMemory(id: string): Promise<boolean> {
    return this.memories.delete(id);
  }

  async getMemoriesByType(type: Memory['type']): Promise<Memory[]> {
    return Array.from(this.memories.values()).filter((m) => m.type === type);
  }
}
