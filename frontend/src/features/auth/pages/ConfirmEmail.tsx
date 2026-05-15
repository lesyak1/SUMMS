import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { authService } from "../services/authServices";
import AuthLayout from "../components/AuthLayou";
import Button from "../../../components/ui/Button/Button";

type ConfirmEmailLocationState = {
  email?: string;
};

const ConfirmEmail = () => {
  const location = useLocation();
  const email = (location.state as ConfirmEmailLocationState | null)?.email || "";

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const getErrorMessage = (error: unknown) => error instanceof Error ? error.message : "Failed to resend email.";

  // cooldown 
  useEffect(() => {
    if (cooldown <= 0) return;

    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldown]);

  const handleResend = async () => {
    if (!email || cooldown > 0) return;

    setLoading(true);
    setMessage("");

    try {
      await authService.resendConfirmation(email);

      setMessage("Confirmation email resent successfully.");
      setCooldown(30);
    } catch (error: unknown) {
      setMessage(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Confirm your email"
      subtitle="We've sent you a verification link."
      footerLinkText="Login"
      footerText="Return to"
      footerLinkTo="/login"
    >
      <div className="space-y-6 text-center">

        <p className="text-sm text-gray-600">
          Please check your inbox and click the verification link to activate your account.
        </p>

        {email && (
          <p className="text-sm font-medium text-gray-800">
            Sent to: {email}
          </p>
        )}

        {message && (
          <p className="text-sm text-green-600">{message}</p>
        )}

        <Button
          onClick={handleResend}
          loading={loading}
          disabled={cooldown > 0}
          fullWidth
        >
          {cooldown > 0
            ? `Resend available in ${cooldown}s`
            : "Resend confirmation email"}
        </Button>

      </div>
    </AuthLayout>
  );
}

export default ConfirmEmail;
