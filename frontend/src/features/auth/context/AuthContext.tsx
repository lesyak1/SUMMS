import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import type { User, Session } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";

import api from "../../../lib/api";

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
}

interface AuthContextType {
    user: User | null;
    session: Session | null;
    profile: UserProfile | null;
    loading: boolean;
    recommendations: any[];
    loadingRecommendation: boolean;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    session: null,
    profile: null,
    loading: true,
    recommendations: [],
    loadingRecommendation: true
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [recommendations, setRecommendations] = useState<any[]>([]);
    const [loadingRecommendation, setLoadingRecommendation] = useState(false);

    const loadProfile = async () => {
        try {
            const res = await api.get('/me');
            setProfile(res.data);
        } catch (e) {
            console.error('Failed to load profile', e);
            setProfile(null);
        }
    };


    useEffect(() => {
        const loadRecommendations = async () => {
            if (profile?.preferredMobility && profile?.city) {
                setLoadingRecommendation(true);
                try {
                    // Fetch vehicles matching the user's preferred mobility and ensure they are available
                    const res = await api.get(`/vehicles?type=${profile.preferredMobility}&availability=true`);
                    setRecommendations(res.data);
                } catch (e) {
                    console.error('Failed to load recommendations', e);
                } finally {
                    setLoadingRecommendation(false);
                }
            }
        };

        if (profile) loadRecommendations();
    }, [profile]);


    const navigate = useNavigate();
    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => {
            setSession(data.session);
            setUser(data.session?.user ?? null);
            if (data.session?.user) {
                loadProfile().finally(() => setLoading(false));
            } else {
                setLoading(false);
            }
        });

        // auth changes, if logged in navigate to home page
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                loadProfile();
                navigate("/");
            } else {
                setProfile(null);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    return (
        <AuthContext.Provider value={{ 
            user, 
            session, 
            profile, 
            loading,
            recommendations,
            loadingRecommendation
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);