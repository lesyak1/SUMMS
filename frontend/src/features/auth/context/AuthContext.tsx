import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import type { User, Session } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";
import api from "../../../lib/api";
import { AuthContext, type Recommendation, type UserProfile } from "./authContext";

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
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
                    setRecommendations(res.data as Recommendation[]);
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
        } = supabase.auth.onAuthStateChange((event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                loadProfile();
                if (event === 'SIGNED_IN') {
                    navigate("/");
                }
            } else {
                setProfile(null);
            }
        });

        return () => subscription.unsubscribe();
    }, [navigate]);

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
