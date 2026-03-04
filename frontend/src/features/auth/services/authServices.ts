import { generateUsername } from "unique-username-generator";
import { supabase } from "../../../lib/supabase"

export const authService = {
    async register(email: string, password: string, firstName: string, lastName: string) {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    firstName,
                    lastName,
                    username: generateUsername(" ", 2)
                }
            }
        })
        if (error) throw new Error(error.message);
        return data;
    },
    async login(email: string, password: string) {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        })
        if (error) throw new Error(error.message);
        return data;
    },
    async logout() {
        const { error } = await supabase.auth.signOut();
        if (error) throw new Error(error.message);
    },
    async getCurrentUser() {
        const { data } = await supabase.auth.getUser();
        return data.user;
    },
    async resendConfirmation(email: string) {
        const { error } = await supabase.auth.resend({
            type: "signup",
            email,
        });

        if (error) throw new Error(error.message);
    },
    async resetPassword(email: string) {
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        if (error) throw new Error(error.message);
    }
}