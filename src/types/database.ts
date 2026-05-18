export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      documents: {
        Row: {
          collection_name: string;
          created_at: string;
          data: Json;
          id: string;
          owner_id: string | null;
          updated_at: string;
        };
        Insert: {
          collection_name: string;
          created_at?: string;
          data?: Json;
          id: string;
          owner_id?: string | null;
          updated_at?: string;
        };
        Update: {
          collection_name?: string;
          created_at?: string;
          data?: Json;
          id?: string;
          owner_id?: string | null;
          updated_at?: string;
        };
      };
      subscriptions: {
        Row: {
          created_at: string;
          current_period_end: string | null;
          id: string;
          plan: string;
          status: string;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          user_id: string;
        };
        Insert: {
          current_period_end?: string | null;
          id?: string;
          plan?: string;
          status?: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          user_id: string;
        };
        Update: {
          current_period_end?: string | null;
          plan?: string;
          status?: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
        };
      };
    };
  };
};
