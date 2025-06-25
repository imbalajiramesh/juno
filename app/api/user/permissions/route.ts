import { NextResponse } from 'next/server';
import { getUserPermissions } from '@/lib/permissions-server';

export async function GET() {
  try {
    const userPermissions = await getUserPermissions();
    
    if (!userPermissions) {
      return NextResponse.json(
        { permissions: [], role: 'none' },
        { status: 200 }
      );
    }

    return NextResponse.json({
      permissions: userPermissions.permissions.map(permission => ({
        permission_name: permission
      })),
      role: userPermissions.role
    });
  } catch (error) {
    console.error('Error fetching user permissions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch permissions' },
      { status: 500 }
    );
  }
} 