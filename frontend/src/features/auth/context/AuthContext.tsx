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
}

interface AuthContextType {
    user: User | null;
    session: Session | null;
    profile: UserProfile | null;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    session: null,
    profile: null,
    loading: true,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    const loadProfile = async () => {
        try {
            const res = await api.get('/me');
            setProfile(res.data);
        } catch (e) {
            console.error('Failed to load profile', e);
            setProfile(null);
        }
    };

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
        <AuthContext.Provider value={{ user, session, profile, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);