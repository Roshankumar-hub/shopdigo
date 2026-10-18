export interface SessionUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'customer' | 'seller' | 'admin';
  seller_id: string | null;
  seller_status: string | null;
}
