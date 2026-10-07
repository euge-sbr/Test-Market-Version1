export interface Product {
  id: string;
  name: string;
  shop_name?: string;
  description: string;
  price: number;
  image: string;
  category: string;
  rating?: number;
  is_available: boolean;
  created_at: string;
  best_seller_rank: number | null;
  is_new_this_week: boolean;
}