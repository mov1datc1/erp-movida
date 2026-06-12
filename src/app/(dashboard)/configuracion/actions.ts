'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/utils/supabase/admin';

// --- ROLES (AppRole) ---

export async function getAppRoles() {
  try {
    const roles = await prisma.appRole.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return { success: true, data: roles };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createAppRole(data: { nombre: string; descripcion?: string; permisos: any }) {
  try {
    const role = await prisma.appRole.create({
      data: {
        nombre: data.nombre,
        descripcion: data.descripcion,
        permisos: data.permisos
      }
    });
    revalidatePath('/configuracion');
    return { success: true, data: role };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateAppRole(id: string, data: { nombre: string; descripcion?: string; permisos: any }) {
  try {
    const role = await prisma.appRole.update({
      where: { id },
      data: {
        nombre: data.nombre,
        descripcion: data.descripcion,
        permisos: data.permisos
      }
    });
    revalidatePath('/configuracion');
    return { success: true, data: role };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteAppRole(id: string) {
  try {
    await prisma.appRole.delete({ where: { id } });
    revalidatePath('/configuracion');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// --- USUARIOS (Profile + Supabase Auth) ---

export async function getUsuarios() {
  try {
    const profiles = await prisma.profile.findMany({
      include: {
        app_role: true
      },
      orderBy: { createdAt: 'desc' }
    });
    return { success: true, data: profiles };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createUserWithRole(data: { email: string; nombre: string; app_role_id: string; password?: string }) {
  try {
    const supabaseAdmin = createAdminClient();
    
    // 1. Crear el usuario en Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password || 'TempPassword123!', // Si no proveen password, se usa una temporal
      email_confirm: true, // Auto-confirmar
      user_metadata: {
        nombre: data.nombre
      }
    });

    if (authError) throw new Error(`Error en Auth: ${authError.message}`);
    if (!authData.user) throw new Error('No se pudo crear el usuario en Auth.');

    // 2. Crear o actualizar el Profile en Prisma
    // Nota: A veces el trigger de Supabase crea el profile vacío, así que usamos upsert o update si ya existe.
    // Buscamos si el trigger ya lo creó
    const existingProfile = await prisma.profile.findUnique({
      where: { auth_id: authData.user.id }
    });

    let profile;
    if (existingProfile) {
      profile = await prisma.profile.update({
        where: { auth_id: authData.user.id },
        data: {
          nombre: data.nombre,
          app_role_id: data.app_role_id,
        }
      });
    } else {
      profile = await prisma.profile.create({
        data: {
          auth_id: authData.user.id,
          email: data.email,
          nombre: data.nombre,
          app_role_id: data.app_role_id,
          rol: 'USER' // Mantenemos el rol default del sistema
        }
      });
    }

    revalidatePath('/configuracion');
    return { success: true, data: profile };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateUserRole(profileId: string, data: { nombre: string, app_role_id: string | null }) {
  try {
    const profile = await prisma.profile.update({
      where: { id: profileId },
      data: {
        nombre: data.nombre,
        app_role_id: data.app_role_id
      }
    });
    revalidatePath('/configuracion');
    return { success: true, data: profile };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// --- INTEGRACIONES ---

export async function getIntegraciones() {
  try {
    const integraciones = await prisma.integracion.findMany();
    return { success: true, data: integraciones };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function saveIntegracion(proveedor: string, config: any, activa: boolean) {
  try {
    const intg = await prisma.integracion.upsert({
      where: { proveedor },
      update: {
        config,
        activa
      },
      create: {
        proveedor,
        config,
        activa
      }
    });
    revalidatePath('/configuracion');
    return { success: true, data: intg };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
