"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { FcGoogle } from "react-icons/fc";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";

const Login = () => {
  const [data, setData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { email, password } = data;

    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!password) {
      setError("Please enter a password");
      return;
    }

    if (!isChecked) {
      setError("You must agree to the terms and conditions to log in.");
      return;
    }

    setError("");
    setPending(true);

    try {
      const res = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      if (res?.ok) {
        router.push("/");
        toast.success("Login successful!");
      } else if (res?.status === 401) {
        setError("Invalid credentials");
      } else {
        setError("Something went wrong");
      }
    } catch (error) {
      console.log(error);
      setError("Login failed!");
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

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="fixed inset-0 flexCenter bg-gray-800 backdrop-blur-sm bg-opacity-80 z-50">
      <div className="w-full max-w-[350px] p-6 bg-white border border-gray-300 rounded-lg shadow-lg">
        <form onSubmit={handleSubmit}>
          <div className=" text-right">
            <button
              type="button"
              onClick={handleClose}
              className="text-gray-600 text-xl hover:text-gray-800 hover:text-2xl transition-colors"
              disabled={pending}
            >
              ×
            </button>
          </div>

          <h4 className="text-4xl text-gray-800 font-bold mb-6 text-center">
            Login
          </h4>

          <div className="mb-4">
            <input
              type="email"
              placeholder="Email"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              value={data.email}
              onChange={(e) => setData({ ...data, email: e.target.value })}
              disabled={pending}
              required
            />
          </div>

          <div className="mb-4 relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              className="w-full px-3 py-2 pr-10 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              value={data.password}
              onChange={(e) => setData({ ...data, password: e.target.value })}
              disabled={pending}
              required
            />
            <button
              type="button"
              onClick={togglePasswordVisibility}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50"
              disabled={pending}
            >
              {showPassword ? (
                <AiOutlineEyeInvisible className="w-5 h-5" />
              ) : (
                <AiOutlineEye className="w-5 h-5" />
              )}
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 p-3 rounded-md flex items-center gap-x-2 text-sm text-red-600 mb-4">
              <span>⚠️</span>
              <p>{error}</p>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={pending}
          >
            {pending ? "Logging in..." : "Login"}
          </button>

          <div className="flex items-center my-4">
            <div className="flex-1 border-t border-gray-300"></div>
            <span className="px-3 text-gray-500 text-sm">or</span>
            <div className="flex-1 border-t border-gray-300"></div>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-3 py-2 border border-gray-300 rounded hover:bg-gray-50 hover:scale-105 transition-all duration-200 disabled:opacity-50"
            disabled={pending}
          >
            <FcGoogle className="w-5 h-5" />
            <span className="text-gray-700">Continue with Google</span>
          </button>

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

          <p className="mt-4 text-center text-sm text-gray-600">
            Don't have an account?{" "}
            <span
              onClick={() => router.push("/auth/sign-up")}
              className="text-blue-600 hover:underline cursor-pointer"
            >
              Sign up here
            </span>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Login;