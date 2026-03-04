import { useState } from "react";
import AuthLayout from "../components/AuthLayou";
import Input from "../../../components/ui/Input/Input";
import Button from "../../../components/ui/Button/Button";
import { authService } from "../services/authServices";
import { useNavigate } from "react-router-dom";


const Register = () => {
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();

    const handleSubmit = async (e: React.SubmitEvent) => {
        e.preventDefault();

        setError("");
        setLoading(true);

        if (password !== confirmPassword) {
            setError("Passwords do not match");
            setLoading(false);
            return;
        }

        try {
            const data = await authService.register(
                email,
                password,
                firstName,
                lastName
            );
            if (data.user && !data.session) {
                navigate("/confirm-email", {
                    state: { email }
                });
                return;
            }
            if(data.session) {
                navigate("/");
                return;
            }
            if(!data.user) {
                setError("Account with this email already exists.");
                return;
            }


        } catch (err: any) {
            setError(err.message || "Registration failed.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout
            title="Create an account"
            subtitle="Start building with SUMMS today."
            footerText="Already have an account?"
            footerLinkText="Login"
            footerLinkTo="/login"
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                    placeholder="First Name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                />
                <Input
                    placeholder="Last Name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                />
                <Input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />
                <Input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />

                <Input
                    type="password"
                    placeholder="Confirm Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    error={error}
                />

                <Button type="submit" fullWidth loading={loading}>
                    Create Account
                </Button>

            </form>
        </AuthLayout>
    );
}
export default Register;