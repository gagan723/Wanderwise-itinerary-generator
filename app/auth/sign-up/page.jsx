"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { FcGoogle } from "react-icons/fc";

const SignUp = () => {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { name, email, password, confirmPassword } = form;

    // Validation
    if (!name.trim()) {
      setError("Please enter your full name.");
      return;
    }

    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!password) {
      setError("Please enter a password");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!isChecked) {
      setError("You must agree to the terms and conditions to sign up.");
      return;
    }

    setError("");
    setPending(true);

    try {
      const res = await fetch("/api/auth/sign-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, confirmPassword }),
      });
      
      const data = await res.json();

      if (res.ok) {
        toast.success(data.message || "Account created successfully!");
        router.push("/auth/sign-in");
      } else if (res.status === 400) {
        setError(data.message || "Invalid input data");
      } else if (res.status === 500) {
        setError(data.message || "Server error occurred");
      } else {
        setError("Something went wrong");
      }
    } catch (error) {
      console.log(error);
      toast.error("Sign up failed")
    } finally {
      setPending(false);
    }
  };

  const handleGoogleSignIn = (e) => {
    e.preventDefault();
    signIn("google", { callbackUrl: "/" });
  };

  const handleClose = () => {
    router.push("/");
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-slate-600 bg-opacity-50 z-50 backdrop-blur-sm h-screen">
      <div className="w-full max-w-[380px] p-6 bg-white border border-gray-300 rounded-lg shadow-lg">
        <form onSubmit={handleSubmit}>
          {/* Close Button */}
          <div className="mb-4 text-right">
            <button
              type="button"
              onClick={handleClose}
              className="text-gray-500 text-xl hover:text-gray-800 transition-colors"
              disabled={pending}
            >
              &times;
            </button>
          </div>

          {/* Title */}
          <h4 className="text-4xl text-gray-800 font-bold mb-2 text-center">
            Sign Up
          </h4>
          <p className="text-sm text-center text-gray-500 mb-6">
            Use email or service, to create account
          </p>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 p-3 rounded-md flex items-center gap-x-2 text-sm text-red-600 mb-4">
              <span>⚠️</span>
              <p>{error}</p>
            </div>
          )}

          {/* Full Name Input */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="Full name"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              disabled={pending}
              required
            />
          </div>

          {/* Email Input */}
          <div className="mb-4">
            <input
              type="email"
              placeholder="Email"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              disabled={pending}
              required
            />
          </div>

          {/* Password Input */}
          <div className="mb-4">
            <input
              type="password"
              placeholder="Password"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              disabled={pending}
              required
            />
          </div>

          {/* Confirm Password Input */}
          <div className="mb-4">
            <input
              type="password"
              placeholder="Confirm password"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              value={form.confirmPassword}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              disabled={pending}
              required
            />
          </div>

          {/* Sign Up Button */}
          <button
            type="submit"
            className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed mb-4"
            disabled={pending}
          >
            {pending ? "Creating account..." : "Continue"}
          </button>

          {/* Divider */}
          <div className="flex items-center my-4">
            <div className="flex-1 border-t border-gray-300"></div>
            <span className="px-3 text-gray-500 text-sm">or</span>
            <div className="flex-1 border-t border-gray-300"></div>
          </div>

          {/* Google Sign In Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-3 py-2 border border-gray-300 rounded hover:bg-gray-50 hover:scale-105 transition-all duration-200 disabled:opacity-50"
            disabled={pending}
          >
            <FcGoogle className="w-5 h-5" />
            <span className="text-gray-700">Continue with Google</span>
          </button>

          {/* Terms Checkbox */}
          <div className="mt-4 text-center">
            <label className="flex items-center justify-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 cursor-pointer accent-blue-600"
                checked={isChecked}
                onChange={() => setIsChecked(!isChecked)}
                disabled={pending}
              />
              <span className="text-sm text-gray-600">
                By continuing, I agree to the terms of use & privacy policy.
              </span>
            </label>
          </div>

          {/* Sign In Link */}
          <p className="mt-4 text-center text-sm text-gray-600">
            Already have an account?{" "}
            <span
              onClick={() => router.push("/sign-in")}
              className="text-blue-600 hover:underline cursor-pointer"
            >
              Sign in here
            </span>
          </p>
        </form>
      </div>
    </div>
  );
};

export default SignUp;