
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const publicRooms = await prisma.room.findMany({
      where: {
        isPublic: true,
        // Optionally exclude rooms the user already has access to
        NOT: {
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
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        _count: {
          select: {
            members: true,
          },
        },
      },
      orderBy: {
        lastAccessed: 'desc',
      },
      take: 50, // Limit to 50 public rooms
    })

    const formattedRooms = publicRooms.map(room => ({
      id: room.id,
      name: room.name,
      createdAt: room.createdAt.toISOString(),
      updatedAt: room.updatedAt.toISOString(),
      lastAccessed: room.lastAccessed.toISOString(),
      isOwner: false,
      isPublic: true,
      owner: room.owner,
      memberCount: room._count.members,
    }))

    return NextResponse.json(formattedRooms)
  } catch (error) {
    console.error('Error fetching public rooms:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}