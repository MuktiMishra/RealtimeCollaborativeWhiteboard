'use client'

import { useSession, signIn, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { motion } from 'motion/react'
import Image from 'next/image'

export default function TopBar() {
  const { data: session, status } = useSession()
  const router = useRouter()

  return (
    <div className="w-full h-16 bg-white shadow-sm flex items-center justify-between px-8">
      <div 
        className="text-2xl font-bold text-blue-600 cursor-pointer"
        onClick={() => router.push('/')}
      >
        Whiteboard
      </div>

      <div className="flex items-center gap-4">
        {status === 'loading' ? (
          <div className="text-gray-500">Loading...</div>
        ) : status === 'authenticated' ? (
          <>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 text-blue-600 hover:text-blue-700 font-medium"
            >
              Dashboard
            </motion.button>
            
            <div className="flex items-center gap-3">
              {session.user?.image && (
                <Image
                  src={session.user.image}
                  alt={session.user.name || 'User'}
                  width={32}
                  height={32}
                  className="rounded-full"
                />
              )}
              <span className="text-gray-700">{session.user?.name}</span>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => signOut({ callbackUrl: '/' })}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                Sign Out
              </motion.button>
            </div>
          </>
        ) : (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => signIn()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Sign In
          </motion.button>
        )}
      </div>
    </div>
  )
}