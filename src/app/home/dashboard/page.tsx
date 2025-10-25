'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { MdAdd, MdDelete, MdClose, MdPalette, MdPublic, MdPerson, MdPeople, MdStar, MdSettings, MdLogout } from 'react-icons/md'
import { IoMdTime } from 'react-icons/io'
import { HiSparkles } from 'react-icons/hi'
import { signOut } from 'next-auth/react'
import Image from 'next/image'

interface Room {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  lastAccessed: string
  isOwner: boolean
  isPublic?: boolean
}

const gradients = [
  'from-purple-400 via-pink-500 to-red-500',
  'from-green-400 via-blue-500 to-purple-600',
  'from-yellow-400 via-orange-500 to-red-500',
  'from-blue-400 via-cyan-500 to-teal-500',
  'from-pink-400 via-purple-500 to-indigo-500',
  'from-orange-400 via-red-500 to-pink-500',
]

type ViewType = 'all' | 'my-boards' | 'shared' | 'public' | 'favorites'

export default function Dashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [rooms, setRooms] = useState<Room[]>([])
  const [publicRooms, setPublicRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [roomName, setRoomName] = useState('')
  const [selectedGradient, setSelectedGradient] = useState(0)
  const [currentView, setCurrentView] = useState<ViewType>('all')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  useEffect(() => {
    if (status === 'authenticated') {
      fetchRooms()
      fetchPublicRooms()
    }
  }, [status])

  const fetchRooms = async () => {
    try {
      const response = await fetch('/api/rooms')
      const data = await response.json()
      setRooms(data)
    } catch (error) {
      console.error('Failed to fetch rooms:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchPublicRooms = async () => {
    try {
      const response = await fetch('/api/rooms/public')
      const data = await response.json()
      setPublicRooms(data)
    } catch (error) {
      console.error('Failed to fetch public rooms:', error)
    }
  }

  const createRoom = async () => {
    if (!roomName.trim()) return

    try {
      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: roomName }),
      })
      const data = await response.json()
      
      if (response.ok) {
        router.push(`/home/${data.id}`)
      }
    } catch (error) {
      console.error('Failed to create room:', error)
    }
  }

  const deleteRoom = async (roomId: string) => {
    try {
      await fetch(`/api/rooms/${roomId}`, {
        method: 'DELETE',
      })
      setRooms(rooms.filter(room => room.id !== roomId))
    } catch (error) {
      console.error('Failed to delete room:', error)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    return date.toLocaleDateString()
  }

  const getFilteredRooms = () => {
    switch (currentView) {
      case 'my-boards':
        return rooms.filter(room => room.isOwner)
      case 'shared':
        return rooms.filter(room => !room.isOwner)
      case 'public':
        return publicRooms
      case 'favorites':
        return [] // Implement favorites logic
      case 'all':
      default:
        return rooms
    }
  }

  const filteredRooms = getFilteredRooms()

  const sidebarItems = [
    { id: 'all', label: 'All Boards', icon: MdPalette, count: rooms.length },
    { id: 'my-boards', label: 'My Boards', icon: MdPerson, count: rooms.filter(r => r.isOwner).length },
    { id: 'shared', label: 'Shared with Me', icon: MdPeople, count: rooms.filter(r => !r.isOwner).length },
    { id: 'public', label: 'Public Boards', icon: MdPublic, count: publicRooms.length },
    { id: 'favorites', label: 'Favorites', icon: MdStar, count: 0 },
  ]

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full"
        />
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 overflow-hidden">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
          transition={{ duration: 20, repeat: Infinity }}
          className="absolute -top-24 -right-24 w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20"
        />
        <motion.div
          animate={{ scale: [1.2, 1, 1.2], rotate: [90, 0, 90] }}
          transition={{ duration: 25, repeat: Infinity }}
          className="absolute -bottom-24 -left-24 w-96 h-96 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20"
        />
      </div>

      <motion.aside
        initial={false}
        animate={{ width: sidebarCollapsed ? 80 : 280 }}
        className="relative backdrop-blur-xl bg-white/70 border-r border-white/20 shadow-xl flex flex-col z-10"
      >
        {/* User Profile Section */}
        <div className="p-6 border-b border-white/20">
          <motion.div layout className="flex items-center gap-3">
            {session?.user?.image && (
              <div className="relative flex-shrink-0">
                <Image
                  src={session.user.image}
                  alt={session.user.name || 'User'}
                  width={48}
                  height={48}
                  className="rounded-xl ring-2 ring-white/50 shadow-lg"
                />
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full ring-2 ring-white" />
              </div>
            )}
            {!sidebarCollapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex-1 min-w-0"
              >
                <p className="font-semibold text-gray-800 truncate">{session?.user?.name}</p>
                <p className="text-xs text-gray-600 truncate">{session?.user?.email}</p>
              </motion.div>
            )}
          </motion.div>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {sidebarItems.map((item) => {
            const Icon = item.icon
            const isActive = currentView === item.id
            
            return (
              <motion.button
                key={item.id}
                onClick={() => setCurrentView(item.id as ViewType)}
                whileHover={{ scale: 1.02 }}
                transition={{duration: 0.01}}
                whileTap={{ scale: 0.98 }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                    : 'bg-white/50 text-gray-700 hover:bg-white/80'
                }`}
              >
                <Icon size={20} className="flex-shrink-0" />
                {!sidebarCollapsed && (
                  <>
                    <span className="flex-1 text-left font-medium text-sm">{item.label}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      isActive ? 'bg-white/20' : 'bg-gray-200'
                    }`}>
                      {item.count}
                    </span>
                  </>
                )}
              </motion.button>
            )
          })}
        </nav>

        <div className="p-4 border-t border-white/20 space-y-2">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowCreateModal(true)}
            className="w-full flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all"
          >
            <MdAdd size={20} />
            {!sidebarCollapsed && <span>New Board</span>}
          </motion.button>

          {!sidebarCollapsed && (
            <>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full flex items-center gap-3 px-4 py-2 bg-white/50 text-gray-700 rounded-xl hover:bg-white/80 transition-all"
              >
                <MdSettings size={20} />
                <span className="text-sm">Settings</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => signOut({ callbackUrl: '/' })}
                className="w-full flex items-center gap-3 px-4 py-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-all"
              >
                <MdLogout size={20} />
                <span className="text-sm">Sign Out</span>
              </motion.button>
            </>
          )}
        </div>

        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="absolute -right-4 top-20 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center text-gray-600 hover:text-purple-600 border-2 border-white/50"
        >
          <motion.div
            animate={{ rotate: sidebarCollapsed ? 0 : 180 }}
            transition={{ duration: 0.3 }}
          >
            ◀
          </motion.div>
        </motion.button>
      </motion.aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="relative backdrop-blur-xl bg-white/70 border-b border-white/20 shadow-lg px-8 py-6">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-between items-center"
          >
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                {sidebarItems.find(item => item.id === currentView)?.label} ✨
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                {filteredRooms.length} board{filteredRooms.length !== 1 ? 's' : ''} available
              </p>
            </div>

            {/* Quick Stats */}
            <div className="flex gap-4">
              <div className="backdrop-blur-xl bg-white/70 rounded-xl px-4 py-2 border border-white/20">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-sm font-medium text-gray-700">Online</span>
                </div>
              </div>
            </div>
          </motion.div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-8">
          {filteredRooms.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center justify-center h-full"
            >
              <div className="backdrop-blur-xl bg-white/70 rounded-3xl p-12 border border-white/20 shadow-2xl max-w-md text-center">
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="text-6xl mb-4"
                >
                  {currentView === 'public' ? '🌍' : currentView === 'shared' ? '🤝' : '🎨'}
                </motion.div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">
                  No {currentView === 'public' ? 'public' : currentView === 'shared' ? 'shared' : ''} boards yet
                </h3>
                <p className="text-gray-600 mb-6">
                  {currentView === 'public' 
                    ? 'Check back later for public boards from the community'
                    : currentView === 'shared'
                    ? 'Boards shared with you will appear here'
                    : 'Start by creating your first whiteboard'}
                </p>
                {currentView === 'all' && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowCreateModal(true)}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl"
                  >
                    Create Your First Board
                  </motion.button>
                )}
              </div>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredRooms.map((room, index) => (
                <motion.div
                  key={room.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15, ease: 'easeIn' }}
                  whileHover={{ y: -8, scale: 1.05 }}
                  className="group relative backdrop-blur-xl bg-white/70 rounded-3xl border border-white/20 shadow-xl hover:shadow-2xl overflow-hidden cursor-pointer"
                  onClick={() => router.push(`/home/${room.id}`)}
                >
                  {/* Gradient Header */}
                  <div className={`h-32 bg-gradient-to-br ${gradients[index % gradients.length]} relative overflow-hidden`}>
                    <div className="absolute inset-0 bg-black/10 backdrop-blur-sm" />
                    <motion.div
                      animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
                      transition={{ duration: 10, repeat: Infinity }}
                      className="absolute -top-12 -right-12 w-32 h-32 bg-white/20 rounded-full blur-2xl"
                    />
                    
                    {/* Action Buttons */}
                    <div className="absolute top-4 right-4 flex gap-2">
                      {room.isOwner && (
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteRoom(room.id)
                          }}
                          className="w-8 h-8 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-colors shadow-lg"
                        >
                          <MdDelete size={18} />
                        </motion.button>
                      )}
                    </div>

                    {/* Owner Badge */}
                    <div className="absolute bottom-4 left-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md ${
                        room.isOwner 
                          ? 'bg-white/90 text-purple-700' 
                          : 'bg-white/70 text-gray-700'
                      }`}>
                        {room.isOwner ? '👑 Owner' : '🤝 Member'}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-3 truncate group-hover:text-purple-600 transition-colors">
                      {room.name || 'Untitled Whiteboard'}
                    </h3>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <IoMdTime size={16} className="text-purple-500" />
                        <span>{formatDate(room.lastAccessed)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        <span>Ready to collaborate</span>
                      </div>
                    </div>

                    {/* Hover Effect */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      whileHover={{ opacity: 1 }}
                      className="absolute inset-0 bg-gradient-to-t from-purple-600/20 to-transparent pointer-events-none"
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowCreateModal(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Create New Board
                </h2>
                <motion.button
                  whileHover={{ rotate: 90 }}
                  onClick={() => setShowCreateModal(false)}
                  className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-200"
                >
                  <MdClose size={20} />
                </motion.button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Board Name
                  </label>
                  <input
                    type="text"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    placeholder="My Awesome Whiteboard"
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    onKeyPress={(e) => e.key === 'Enter' && createRoom()}
                    autoFocus
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Choose a Theme
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {gradients.map((gradient, index) => (
                      <motion.button
                        key={index}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setSelectedGradient(index)}
                        className={`h-16 bg-gradient-to-br ${gradient} rounded-xl transition-all ${
                          selectedGradient === index ? 'ring-4 ring-purple-500 ring-offset-2' : ''
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setShowCreateModal(false)
                    setRoomName('')
                  }}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={createRoom}
                  disabled={!roomName.trim()}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create Board
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}