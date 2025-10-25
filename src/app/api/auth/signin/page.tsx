'use client'

import { signIn } from 'next-auth/react'
import { motion } from 'motion/react'
import { FcGoogle } from 'react-icons/fc'

export default function SignIn() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome to Whiteboard
          </h1>
          <p className="text-gray-600">
            Sign in to access your collaborative workspaces
          </p>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => signIn('google', { callbackUrl: '/home/dashboard' })}
          className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-300 rounded-lg px-6 py-3 text-gray-700 font-medium hover:bg-gray-50 hover:border-gray-400 transition-all"
        >
          <FcGoogle size={24} />
          Continue with Google
        </motion.button>

        <div className="mt-8 text-center text-sm text-gray-500">
          By signing in, you agree to our Terms of Service and Privacy Policy
        </div>
      </motion.div>
    </div>
  )
}