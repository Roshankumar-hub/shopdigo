export type UserRole = 'customer' | 'seller' | 'admin';

export type OrderStatus =
  | 'placed'
  | 'confirmed'
  | 'processing'
  | 'packed'
  | 'shipped'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'return_requested'
  | 'returned'
  | 'refunded';

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refund_pending' | 'refunded' | 'partially_refunded';
export type PaymentMethod = 'razorpay' | 'cod';

export type ProductStatus = 'draft' | 'pending_approval' | 'active' | 'rejected' | 'inactive' | 'archived_sample';
export type SellerStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

export interface Address {
  id: string;
  user_id: string;
  label: string;
  name: string;
  phone: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  is_default: boolean;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  image?: string;
  parent_id?: string | null;
  description?: string;
  created_at: string;
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  created_at: string;
}

export interface ProductImage {
  id: string;
  product_id: string;
  url: string;
  position: number;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  type: 'size' | 'color' | 'model';
  value: string;
  price_delta: number;
  stock: number;
  sku: string;
}

export interface Product {
  id: string;
  seller_id: string;
  seller_name?: string;
  category_id: string;
  category_name?: string;
  brand_id?: string;
  brand_name?: string;
  name: string;
  slug: string;
  description: string;
  specifications: Record<string, string>;
  mrp: number;
  price: number;
  discount_percent: number;
  stock: number;
  rating: number;
  review_count: number;
  images: ProductImage[];
  variants?: ProductVariant[];
  status: ProductStatus;
  is_featured: boolean;
  is_trending: boolean;
  created_at: string;
  updated_at: string;
  delivery_days?: number;
  return_window_days?: number;
  cod_available: boolean;
}

export interface CartItem {
  id: string;
  cart_id: string;
  product_id: string;
  product?: Product;
  variant_id?: string;
  quantity: number;
  price_at_time: number;
  created_at: string;
}

export interface Cart {
  id: string;
  user_id: string;
  items: CartItem[];
  coupon_code?: string;
  coupon_discount?: number;
  created_at: string;
  updated_at: string;
}

export interface WishlistItem {
  id: string;
  user_id: string;
  product_id: string;
  product?: Product;
  created_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product?: Product;
  seller_id: string;
  variant_id?: string;
  quantity: number;
  price: number;
  mrp: number;
  status: OrderStatus;
  created_at?: string;
  tracking_number?: string;
  shipped_at?: string;
  delivered_at?: string;
  cancellation_reason?: string;
  return_reason?: string;
}

export interface Order {
  id: string;
  order_number: string;
  user_id: string;
  address_id: string;
  address?: Address;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  delivery_charge: number;
  tax: number;
  total: number;
  coupon_code?: string;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  idempotency_key?: string;
  status: OrderStatus;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface SellerProfile {
  id: string;
  user_id: string;
  store_name: string;
  store_slug: string;
  store_logo?: string;
  store_description?: string;
  contact_email: string;
  contact_phone: string;
  business_name: string;
  gstin?: string;
  pan?: string;
  pickup_address: string;
  pickup_city: string;
  pickup_state: string;
  pickup_pincode: string;
  bank_account_name?: string;
  bank_account_number?: string;
  bank_ifsc?: string;
  bank_name?: string;
  status: SellerStatus;
  rejection_reason?: string;
  commission_rate: number;
  created_at: string;
  approved_at?: string;
}

export interface LedgerEntry {
  id: string;
  seller_id: string;
  order_id: string;
  order_item_id: string;
  type: 'sale' | 'commission' | 'refund' | 'adjustment' | 'payout';
  amount: number;
  description: string;
  created_at: string;
  settlement_id?: string;
}

export interface Settlement {
  id: string;
  seller_id: string;
  amount: number;
  status: 'pending' | 'processed' | 'failed';
  period_start: string;
  period_end: string;
  processed_at?: string;
  transaction_reference?: string;
  created_at: string;
}

export interface Review {
  id: string;
  product_id: string;
  user_id: string;
  user_name?: string;
  rating: number;
  title?: string;
  body: string;
  is_verified_purchase: boolean;
  helpful_count: number;
  created_at: string;
}

export interface ProductQuestion {
  id: string;
  product_id: string;
  user_id: string;
  user_name?: string;
  question: string;
  answer?: string;
  answered_by_seller?: boolean;
  created_at: string;
  answered_at?: string;
}

export interface Coupon {
  id: string;
  code: string;
  description: string;
  discount_type: 'percentage' | 'flat';
  discount_value: number;
  min_order_value: number;
  max_discount?: number;
  is_active: boolean;
  valid_from: string;
  valid_until: string;
  usage_limit?: number;
  times_used: number;
  seller_id?: string;
}

export interface Banner {
  id: string;
  title: string;
  subtitle?: string;
  image: string;
  link_url?: string;
  position: number;
  is_active: boolean;
}

export interface SupportTicket {
  id: string;
  user_id: string;
  user_name?: string;
  subject: string;
  message: string;
  category: 'order' | 'payment' | 'product' | 'seller' | 'other';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  order_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'order' | 'payment' | 'promotion' | 'system' | 'seller';
  is_read: boolean;
  link_url?: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  admin_user_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details?: Record<string, unknown>;
  created_at: string;
}

export interface PincodeService {
  pincode: string;
  city: string;
  state: string;
  delivery_days: number;
  cod_available: boolean;
  is_serviceable: boolean;
}
