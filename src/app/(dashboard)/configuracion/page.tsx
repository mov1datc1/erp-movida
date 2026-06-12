import React from "react";
import ConfiguracionClient from "./ConfiguracionClient";
import { getAppRoles, getUsuarios, getIntegraciones } from "./actions";

export const dynamic = 'force-dynamic';

export default async function ConfiguracionPage() {
  const [rolesRes, usuariosRes, integracionesRes] = await Promise.all([
    getAppRoles(),
    getUsuarios(),
    getIntegraciones()
  ]);

  const roles = (rolesRes.success && rolesRes.data) ? rolesRes.data : [];
  const usuarios = (usuariosRes.success && usuariosRes.data) ? usuariosRes.data : [];
  const integraciones = (integracionesRes.success && integracionesRes.data) ? integracionesRes.data : [];

  return (
    <ConfiguracionClient 
      initialRoles={roles} 
      initialUsuarios={usuarios} 
      initialIntegraciones={integraciones} 
    />
  );
}
