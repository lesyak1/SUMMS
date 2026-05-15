import { useState, type FormEvent } from "react";
import Input from "../../../components/ui/Input/Input";
import AuthLayout from "../components/AuthLayou";
import Button from "../../../components/ui/Button/Button";
import { authService } from "../services/authServices";


const ForgotPassword = () => {
    const [email, setEmail] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const getErrorMessage = (err: unknown) => err instanceof Error ? err.message : "Something went wrong...";

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        setMessage("");

        try {
            await authService.resetPassword(email);
            setMessage("If an account exists, a reset link has been sent.");

        }
        catch (err: unknown) {
            setError(getErrorMessage(err))
        }
        finally {
            setLoading(false)
        }
    }

    return (
        <AuthLayout
            title="Reset your password"
            subtitle="Enter your email and we’ll send you a reset link."
            footerText="Remember your password?"
            footerLinkText="Login"
            footerLinkTo="/login"
        >
            <form onSubmit={handleSubmit} className="space-y-4">

                <Input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    error={error}
                />

                <Button type="submit" fullWidth loading={loading}>
                    Send Reset Link
                </Button>

                {message && (
                    <p className="text-sm text-green-600 text-center">
                        {message}
                    </p>
                )}

            </form>
        </AuthLayout>
    );
}

export default ForgotPassword;
