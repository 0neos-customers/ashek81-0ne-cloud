import { NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { type AppId, getUserPermissions, DEFAULT_PERMISSIONS } from '@0ne/auth'

export async function GET() {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check if requesting user is admin
  const permissions = await getUserPermissions(userId)
  if (!permissions.isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const client = await clerkClient()
    const users = await client.users.getUserList({ limit: 100 })

    const usersWithPermissions = users.data.map((user) => ({
      id: user.id,
      email: user.emailAddresses[0]?.emailAddress || '',
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      imageUrl: user.imageUrl,
      permissions: (user.publicMetadata?.permissions as typeof DEFAULT_PERMISSIONS) || DEFAULT_PERMISSIONS,
    }))

    return NextResponse.json({ users: usersWithPermissions })
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check if requesting user is admin
  const permissions = await getUserPermissions(userId)
  if (!permissions.isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { targetUserId, appId, enabled, isAdmin } = body as {
      targetUserId: string
      appId?: AppId
      enabled?: boolean
      isAdmin?: boolean
    }

    if (!targetUserId) {
      return NextResponse.json(
        { error: 'targetUserId is required' },
        { status: 400 }
      )
    }

    const client = await clerkClient()
    const targetUser = await client.users.getUser(targetUserId)
    const currentPermissions =
      (targetUser.publicMetadata?.permissions as typeof DEFAULT_PERMISSIONS) ||
      DEFAULT_PERMISSIONS

    let updatedPermissions = { ...currentPermissions }

    // Update app permission
    if (appId !== undefined && enabled !== undefined) {
      updatedPermissions = {
        ...updatedPermissions,
        apps: {
          ...updatedPermissions.apps,
          [appId]: enabled,
        },
      }
    }

    // Update admin status
    if (isAdmin !== undefined) {
      updatedPermissions = {
        ...updatedPermissions,
        isAdmin,
      }
    }

    await client.users.updateUser(targetUserId, {
      publicMetadata: {
        ...targetUser.publicMetadata,
        permissions: updatedPermissions,
      },
    })

    return NextResponse.json({
      success: true,
      permissions: updatedPermissions,
    })
  } catch (error) {
    console.error('Error updating permissions:', error)
    return NextResponse.json(
      { error: 'Failed to update permissions' },
      { status: 500 }
    )
  }
}
