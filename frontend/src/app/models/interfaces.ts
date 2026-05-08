export interface User {
  id: number;
  full_name: string;
  email: string;
  role: 'student' | 'faculty' | 'admin';
  student_id?: string;
  department_name?: string;
  campus_name?: string;
  phone?: string;
  avatar?: string;
  created_at: string;
}

export interface LostItem {
  id: number;
  user_id: number;
  category_id: number;
  item_name: string;
  description: string;
  image?: string;
  location: string;
  date_lost: string;
  status: 'pending' | 'matched' | 'claimed' | 'archived';
  campus_id?: number;
  department_id?: number;
  contact_info?: string;
  created_at: string;
  full_name?: string;
  category_name?: string;
}

export interface FoundItem {
  id: number;
  user_id: number;
  category_id: number;
  item_name: string;
  description: string;
  image?: string;
  location: string;
  pickup_location?: string;
  date_found: string;
  status: 'pending' | 'matched' | 'claimed' | 'archived';
  campus_id?: number;
  verification_notes?: string;
  created_at: string;
  full_name?: string;
  category_name?: string;
}

export interface Claim {
  id: number;
  lost_item_id?: number;
  found_item_id?: number;
  claimant_id: number;
  proof: string;
  status: 'pending' | 'approved' | 'rejected';
  approved_by?: number;
  admin_notes?: string;
  created_at: string;
  item_name?: string;
  claimant_name?: string;
}

export interface Notification {
  id: number;
  user_id: number;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

export interface Category {
  id: number;
  category_name: string;
  icon?: string;
}

export interface DashboardStats {
  totalLost: number;
  totalFound: number;
  totalClaimed: number;
  pendingClaims: number;
  totalUsers: number;
  recentActivities: any[];
}

export interface Announcement {
  id: number;
  title: string;
  content: string;
  priority: string;
  created_by: number;
  created_at: string;
}

export interface ItemMatch {
  id: number;
  lost_item_id: number;
  found_item_id: number;
  confidence_score: number;
  match_reason?: string;
  created_at: string;
  lost_item_name?: string;
  found_item_name?: string;
}
