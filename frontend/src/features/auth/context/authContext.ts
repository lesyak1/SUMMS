import { createContext } from 'react';
import type { Session, User } from '@supabase/supabase-js';

export interface UserProfile {
    id: string;
    role: string;
    firstName: string | null;
    lastName: string | null;
    username: string | null;
    email: string;
    balance: number;
    city: string | null;
    preferredMobility: string | null;
    totalCo2Kg: number;
}

export interface Recommendation {
    id: string;
}

export interface AuthContextType {
    user: User | null;
    session: Session | null;
    profile: UserProfile | null;
    loading: boolean;
    recommendations: Recommendation[];
    loadingRecommendation: boolean;
}

export const AuthContext = createContext<AuthContextType>({
    user: null,
    session: null,
    profile: null,
    loading: true,
    recommendations: [],
    loadingRecommendation: true
});
