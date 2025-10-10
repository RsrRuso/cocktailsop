// Reuse WebSocket connections and HTTP keep-alive
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

class ConnectionPool {
  private channels = new Map<string, RealtimeChannel>();
  private reconnectAttempts = new Map<string, number>();
  private maxReconnectAttempts = 3;

  getChannel(name: string) {
    if (this.channels.has(name)) {
      return this.channels.get(name);
    }

    const channel = supabase.channel(name);
    this.channels.set(name, channel);
    
    // Handle reconnection
    channel.on('system' as any, { event: 'error' }, () => {
      const attempts = this.reconnectAttempts.get(name) || 0;
      if (attempts < this.maxReconnectAttempts) {
        this.reconnectAttempts.set(name, attempts + 1);
        setTimeout(() => {
          this.removeChannel(name);
          this.getChannel(name);
        }, 1000 * Math.pow(2, attempts)); // Exponential backoff
      }
    });

    return channel;
  }

  removeChannel(name: string) {
    const channel = this.channels.get(name);
    if (channel) {
      supabase.removeChannel(channel);
      this.channels.delete(name);
      this.reconnectAttempts.delete(name);
    }
  }

  removeAllChannels() {
    this.channels.forEach((channel) => {
      supabase.removeChannel(channel);
    });
    this.channels.clear();
    this.reconnectAttempts.clear();
  }
}

export const connectionPool = new ConnectionPool();
