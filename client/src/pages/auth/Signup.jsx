import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../../lib/firebase";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";

import {
  BookOpen,
  Mail,
  Lock,
  User,
} from "lucide-react";

export function Signup() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && user) {
      navigate("/dashboard");
    }
  }, [user, authLoading, navigate]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-xs sm:max-w-md my-20">
          <CardHeader className="text-center px-4 sm:px-6">
            <div className="flex items-center justify-center mb-3 sm:mb-4">
              <img
                src="/edvanta-logo.png"
                alt="Edvanta Logo"
                className="h-8 w-8 sm:h-10 sm:w-10 mr-2"
              />
              <span className="text-xl sm:text-2xl font-bold text-primary">Edvanta</span>
            </div>
            <CardTitle className="text-xl sm:text-2xl">Create Account</CardTitle>
            <CardDescription className="text-sm sm:text-base">
              Start your AI-powered learning journey today
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4 px-4 sm:px-6">
            {error && (
              <div className="bg-primary-50 border border-primary-200 rounded-md p-3 text-xs sm:text-sm text-primary-600">
                {error}
              </div>
            )}

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setLoading(true);
                setError("");
                try {
                  const userCredential = await createUserWithEmailAndPassword(
                    auth,
                    formData.email,
                    formData.password
                  );
                  await updateProfile(userCredential.user, {
                    displayName: formData.name,
                  });
                  await setDoc(doc(db, "users", userCredential.user.uid), {
                    name: formData.name,
                    email: formData.email,
                    role: "Student", // Default role
                    interests: ["Technology", "Science"], // Default interests
                    createdAt: new Date(),
                  });
                  navigate("/dashboard");
                } catch (error) {
                  setError(error.message);
                } finally {
                  setLoading(false);
                }
              }}
              className="space-y-3 sm:space-y-4"
            >
              <div className="space-y-1 sm:space-y-2">
                <label className="text-xs sm:text-sm font-medium">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 sm:top-3 h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Enter your full name"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    className="pl-9 sm:pl-10 text-sm sm:text-base py-2 sm:py-3"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1 sm:space-y-2">
                <label className="text-xs sm:text-sm font-medium">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 sm:top-3 h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    className="pl-9 sm:pl-10 text-sm sm:text-base py-2 sm:py-3"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1 sm:space-y-2">
                <label className="text-xs sm:text-sm font-medium">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 sm:top-3 h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                  <Input
                    type="password"
                    placeholder="Create a password"
                    value={formData.password}
                    onChange={(e) =>
                      handleInputChange("password", e.target.value)
                    }
                    className="pl-9 sm:pl-10 text-sm sm:text-base py-2 sm:py-3"
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full text-sm sm:text-base py-2 sm:py-3" disabled={loading}>
                {loading ? "Creating Account..." : "Create Account"}
              </Button>
            </form>

            <div className="text-center">
              <p className="text-xs sm:text-sm text-gray-600">
                Already have an account?{" "}
                <Link
                  to="/auth/login"
                  className="font-medium text-primary hover:text-primary-700"
                >
                  Login here
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
}
