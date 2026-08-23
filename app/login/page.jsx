"use client";

import axios from "axios";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { useForm } from "react-hook-form";

const Login = () => {
  const [error, setError] = useState("");
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm();

  const onSubmit = async (data) => {
    console.log(data);

    try {
      let res = await axios.post("http://localhost:3000/auth/login", data);
      console.log("response from login api", res);
      localStorage.setItem("access_token", res.data.access_token);
      console.log(
        "access token stored in local storage",
        localStorage.getItem("access_token"),
      );
      router.push("/");
    } catch (error) {
      setError(error.message);
      console.log("error occurred", error.response);
    //   localStorage.removeItem("access_token");
    }
  };

  if (error)
    return (
      <h1 className="flex items-center min-h-screen justify-center">{error}</h1>
    );

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="w-full max-w-sm rounded-lg bg-white p-6 shadow-md"
      >
        <h1 className="mb-6 text-center text-2xl font-bold">Admin Login</h1>

        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium">Email</label>

          <input
            type="email"
            placeholder="Enter your email"
            {...register("email", {
              required: "Email is required",
            })}
            className="w-full rounded-md border px-3 py-2 outline-none focus:border-blue-500"
          />

          {errors.email && (
            <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>
          )}
        </div>

        <div className="mb-6">
          <label className="mb-1 block text-sm font-medium">Password</label>

          <input
            type="password"
            placeholder="Enter your password"
            {...register("password", {
              required: "Password is required",
            })}
            className="w-full rounded-md border px-3 py-2 outline-none focus:border-blue-500"
          />

          {errors.password && (
            <p className="mt-1 text-sm text-red-500">
              {errors.password.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-md bg-blue-600 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isSubmitting ? "Logging in..." : "Login"}
        </button>
      </form>
    </div>
  );
};

export default Login;
