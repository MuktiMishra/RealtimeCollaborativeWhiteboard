'use client'

import TopBar from "@/components/global/TopBar"
import { motion } from "motion/react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import AnimatedBackground from "@/components/global/AnimatedBackground"

export default function Home() {
  const router = useRouter()
  const { data: session, status } = useSession()

  const handleCreateWhiteboard = () => {
    if (status === 'authenticated') {
      router.push('/home/dashboard')
    } else {
      router.push('/api/auth/signin')
    }
  }

  const handleInviteFriend = () => {
    if (status === 'authenticated') {
      router.push('/home/dashboard')
    } else {
      router.push('/api/auth/signin')
    }
  }

  return (
    <div className="relative flex flex-col w-full h-screen overflow-hidden">
      {/* Background Animation */}
      <AnimatedBackground />

      {/* Top Bar */}
      <TopBar />

      {/* Main Section */}
      <div className="w-full h-4/5 flex flex-col gap-10 justify-center items-center bg-transparent z-10 relative">
        <div className="text-6xl tracking-wide font-bold text-center text-blue-600">
          <p className="mb-2">ONE TOOL TO MANAGE</p>
          <p>ALL WHITEBOARD PROBLEMS</p>
        </div>

        <div className="w-full h-20 flex justify-center items-center gap-5">
          <motion.button
            onClick={handleCreateWhiteboard}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="border px-4 py-3 rounded-lg tracking-tighter bg-blue-600 text-white cursor-pointer"
          >
            {status === 'authenticated' ? 'Go to Dashboard' : 'Get Started'}
          </motion.button>

          <motion.button
            onClick={handleInviteFriend}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="border cursor-pointer px-4 py-3 rounded-lg tracking-tighter bg-blue-500 text-white"
          >
            Invite a Friend
          </motion.button>
        </div>
      </div>
    </div>
  )
}