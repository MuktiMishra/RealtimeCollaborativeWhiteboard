import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { roomId } = params

    const room = await prisma.room.findFirst({
      where: {
        id: roomId,
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
    })

    if (!room) {
      return NextResponse.json({ error: 'Room not found or access denied' }, { status: 404 })
    }

    const elements = await prisma.canvasElement.findMany({
      where: {
        roomId,
      },
      orderBy: {
        createdAt: 'asc',
      },
    })

    const formattedElements = elements.map(el => ({
      tool: el.tool,
      props: JSON.parse(el.props),
    }))

    return NextResponse.json(formattedElements)
  } catch (error) {
    console.error('Error fetching canvas elements:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { roomId } = await params; 
    const body = await request.json()
    console.log("body:", body)
    const { elements, text } = body; 


    const room = await prisma.room.findFirst({
      where: {
        id: roomId,
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
    })

    if (!room) {
      return NextResponse.json({ error: 'Room not found or access denied' }, { status: 404 })
    }

    await prisma.canvasElement.deleteMany({
      where: {
        roomId,
      },
    })

    const createdElements = await prisma.canvasElement.createMany({
      data: elements.map((el: any) => ({
        roomId,
        tool: el.tool,
        elementId: el.props.id,
        props: JSON.stringify(el.props),
      })),
    })

    // console.log("reciving following text: ", text); 

    await prisma.room.update({
      where: { id: roomId },
      data: { lastAccessed: new Date(), notes: text },
    })

    return NextResponse.json({ 
      success: true, 
      count: createdElements.count 
    })
  } catch (error) {
    console.error('Error saving canvas elements:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { roomId } = params

    const room = await prisma.room.findFirst({
      where: {
        id: roomId,
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
    })

    if (!room) {
      return NextResponse.json({ error: 'Room not found or access denied' }, { status: 404 })
    }

    await prisma.canvasElement.deleteMany({
      where: {
        roomId,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error clearing canvas elements:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}