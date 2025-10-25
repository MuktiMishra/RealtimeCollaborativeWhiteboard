'use client'

import TopBar from "@/components/global/TopBar";
import { motion } from 'motion/react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

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
      router.push('/auth/signin')
    }
  }

  return (
    <div className="relative flex flex-col w-full h-screen overflow-hidden">
      <TopBar />
      <div className="w-full h-4/5 flex flex-col gap-10 justify-center items-center bg-transparent">
        <div className="z-0 text-6xl tracking-wide font-bold text-center text-blue-600">
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
            className="border cursor-pointer px-4 py-3 rounded-lg tracking-tighter bg-blue-600 text-white"
          >
            Invite a friend
          </motion.button>
        </div>
      </div>
      <div className="w-full -z-12">
        <div className="absolute inset-0 -z-10 bg-[#F6F6F4]">
          <div className="absolute inset-0 mt-20 -z-10 h-3/4 w-full bg-white bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] mask-radial-from-50% mask-radial-to-80% bg-[size:6rem_4rem]"></div>
        </div>
      </div>
    </div>
  );
}