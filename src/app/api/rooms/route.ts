import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rooms = await prisma.room.findMany({
      where: {
        OR: [
          { ownerId: session.user.id },
          {
            members: {
              some: {
                userId: session.user.id,
              },
            },
          },
        ],
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        lastAccessed: 'desc',
      },
    })

    const formattedRooms = rooms.map(room => ({
      id: room.id,
      name: room.name,
      createdAt: room.createdAt.toISOString(),
      updatedAt: room.updatedAt.toISOString(),
      lastAccessed: room.lastAccessed.toISOString(),
      isOwner: room.ownerId === session.user.id,
    }))

    return NextResponse.json(formattedRooms)
  } catch (error) {
    console.error('Error fetching rooms:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name } = body

    const room = await prisma.room.create({
      data: {
        name: name || `Whiteboard ${new Date().toLocaleDateString()}`,
        ownerId: session.user.id,
        members: {
          create: {
            userId: session.user.id,
            role: 'owner',
          },
        },
      },
    })

    return NextResponse.json(room)
  } catch (error) {
    console.error('Error creating room:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}