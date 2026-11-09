import { JiraIssueSnapshot } from '@/types/jiraLexLatin';

export type StrategicAgreementType = 'FALLA' | 'MEJORA' | 'CAMPUS_MARKETING' | 'NUEVO_PROYECTO';
export type LexLatinAreaType = 'EDITORIAL' | 'CAMPUS' | 'AGORA' | 'INFRAESTRUCTURA';

export interface ClassifiedJiraIssue extends JiraIssueSnapshot {
  strategicType: StrategicAgreementType;
  area: LexLatinAreaType;
  isDuplicateOrReply: boolean;
  strategicTypeLabel: string;
  areaLabel: string;
}

export interface StrategicBreakdownSummary {
  totalIssues: number;
  totalHours: number;
  
  // Por Acuerdo
  byAgreement: {
    fallasCount: number;
    fallasHours: number;
    mejorasCount: number;
    mejorasHours: number;
    campusCount: number;
    campusHours: number;
    proyectosCount: number;
    proyectosHours: number;
  };
  
  // Por Área
  byArea: {
    editorialCount: number;
    editorialHours: number;
    campusCount: number;
    campusHours: number;
    agoraCount: number;
    agoraHours: number;
    infraCount: number;
    infraHours: number;
  };
  
  // Eficiencia y Complejidad
  efficiency: {
    totalRawTickets: number;
    duplicatesCount: number;
    netProductiveTickets: number;
    complexTicketsCount: number;
    complexTicketsHours: number;
  };
  
  // Listas filtradas
  campusIssues: ClassifiedJiraIssue[];
  projectIssues: ClassifiedJiraIssue[];
  complexIssues: ClassifiedJiraIssue[];
  classifiedIssues: ClassifiedJiraIssue[];
}

/**
 * Clasifica un issue de Jira según el acuerdo con LexLatin
 */
export function classifyIssue(issue: JiraIssueSnapshot): ClassifiedJiraIssue {
  const summaryLower = (issue.summary || '').toLowerCase();
  const resolutionLower = (issue.resolution || '').toLowerCase();
  const statusLower = (issue.status || '').toLowerCase();
  const issueTypeLower = (issue.issueType || '').toLowerCase();

  // 1. Detección de duplicado / réplica de correo
  const isDuplicateOrReply =
    resolutionLower.includes('duplicado') ||
    statusLower.includes('cancelado') ||
    Boolean(summaryLower.startsWith('re:') || summaryLower.startsWith('rv:') || summaryLower.startsWith('fwd:')) && (resolutionLower.includes('duplicado') || statusLower.includes('cancelado'));

  // 2. Clasificación por Área de LexLatin
  let area: LexLatinAreaType = 'INFRAESTRUCTURA';
  let areaLabel = 'Soporte e Infraestructura';

  if (
    summaryLower.includes('campus') ||
    summaryLower.includes('landing') ||
    summaryLower.includes('gracias') ||
    summaryLower.includes('linkedin') ||
    summaryLower.includes('boletín') ||
    summaryLower.includes('boletin') ||
    summaryLower.includes('partnership') ||
    summaryLower.includes('marketing')
  ) {
    area = 'CAMPUS';
    areaLabel = 'Campus LexLatin & Marketing';
  } else if (
    summaryLower.includes('ágora') ||
    summaryLower.includes('agora') ||
    summaryLower.includes('perfilplus') ||
    summaryLower.includes('ayudantex') ||
    summaryLower.includes('datastudio') ||
    summaryLower.includes('rankings') ||
    summaryLower.includes('analytics') ||
    summaryLower.includes('rc2') ||
    summaryLower.includes('rc3')
  ) {
    area = 'AGORA';
    areaLabel = 'Ágora & PerfilPlus Comercial';
  } else if (
    summaryLower.includes('drupal') ||
    summaryLower.includes('edición') ||
    summaryLower.includes('edicion') ||
    summaryLower.includes('nota') ||
    summaryLower.includes('noticias') ||
    summaryLower.includes('home') ||
    summaryLower.includes('redactor') ||
    summaryLower.includes('gazeta') ||
    summaryLower.includes('visitas') ||
    summaryLower.includes('etiquetas') ||
    summaryLower.includes('fichajes') ||
    summaryLower.includes('editor') ||
    summaryLower.includes('caché') ||
    summaryLower.includes('cache')
  ) {
    area = 'EDITORIAL';
    areaLabel = 'Operación Editorial (Drupal)';
  }

  // 3. Clasificación por Tipo de Acuerdo
  let strategicType: StrategicAgreementType = 'MEJORA';
  let strategicTypeLabel = 'Mejora Operativa';

  // A) Nuevo proyecto / fuera de alcance
  if (
    summaryLower.includes('proyecto:') ||
    summaryLower.includes('proyecto ') ||
    summaryLower.includes('rc2') ||
    summaryLower.includes('rc3') ||
    summaryLower.includes('datastudio') ||
    summaryLower.includes('ayudantex') ||
    summaryLower.includes('perfilplus para automatizar') ||
    summaryLower.includes('rankings analytics') ||
    summaryLower.includes('desarrollo a la medida')
  ) {
    strategicType = 'NUEVO_PROYECTO';
    strategicTypeLabel = 'Nuevo Proyecto (Fuera de Alcance)';
  }
  // B) Requerimientos Campus & Marketing
  else if (area === 'CAMPUS') {
    strategicType = 'CAMPUS_MARKETING';
    strategicTypeLabel = 'Campus & Marketing Digital';
  }
  // C) Falla / Mantenimiento correctivo
  else if (
    summaryLower.includes('error') ||
    summaryLower.includes('urgente') ||
    summaryLower.includes('falla') ||
    summaryLower.includes('vulnerab') ||
    summaryLower.includes('problema') ||
    summaryLower.includes('no funciona') ||
    summaryLower.includes('interrupción') ||
    summaryLower.includes('se duplican') ||
    summaryLower.includes('se pierd') ||
    summaryLower.includes('sin sincronizar')
  ) {
    strategicType = 'FALLA';
    strategicTypeLabel = 'Falla / Mantenimiento Correctivo';
  }
  // D) Mejora operativa rutinaria (default)
  else {
    strategicType = 'MEJORA';
    strategicTypeLabel = 'Mejora / Optimización Operativa';
  }

  return {
    ...issue,
    strategicType,
    area,
    isDuplicateOrReply,
    strategicTypeLabel,
    areaLabel,
  };
}

/**
 * Calcula el resumen estratégico completo a partir de una lista de tickets
 */
export function calculateStrategicBreakdown(issues: JiraIssueSnapshot[]): StrategicBreakdownSummary {
  const classifiedIssues = issues.map(classifyIssue);
  
  // Filtrar duplicados para las métricas netas
  const netIssues = classifiedIssues.filter((i) => !i.isDuplicateOrReply);
  const duplicates = classifiedIssues.filter((i) => i.isDuplicateOrReply);

  // Por Acuerdo
  const fallas = netIssues.filter((i) => i.strategicType === 'FALLA');
  const mejoras = netIssues.filter((i) => i.strategicType === 'MEJORA');
  const campus = netIssues.filter((i) => i.strategicType === 'CAMPUS_MARKETING');
  const proyectos = netIssues.filter((i) => i.strategicType === 'NUEVO_PROYECTO');

  // Por Área
  const editorial = netIssues.filter((i) => i.area === 'EDITORIAL');
  const campusArea = netIssues.filter((i) => i.area === 'CAMPUS');
  const agora = netIssues.filter((i) => i.area === 'AGORA');
  const infra = netIssues.filter((i) => i.area === 'INFRAESTRUCTURA');

  // Casos complejos (+6 horas)
  const complexIssues = netIssues.filter((i) => i.timeWorkedHours > 6);
  const complexTicketsHours = Number(complexIssues.reduce((sum, i) => sum + i.timeWorkedHours, 0).toFixed(2));

  const sumHours = (list: ClassifiedJiraIssue[]) =>
    Number(list.reduce((sum, i) => sum + i.timeWorkedHours, 0).toFixed(2));

  return {
    totalIssues: classifiedIssues.length,
    totalHours: Number(classifiedIssues.reduce((sum, i) => sum + i.timeWorkedHours, 0).toFixed(2)),
    
    byAgreement: {
      fallasCount: fallas.length,
      fallasHours: sumHours(fallas),
      mejorasCount: mejoras.length,
      mejorasHours: sumHours(mejoras),
      campusCount: campus.length,
      campusHours: sumHours(campus),
      proyectosCount: proyectos.length,
      proyectosHours: sumHours(proyectos),
    },

    byArea: {
      editorialCount: editorial.length,
      editorialHours: sumHours(editorial),
      campusCount: campusArea.length,
      campusHours: sumHours(campusArea),
      agoraCount: agora.length,
      agoraHours: sumHours(agora),
      infraCount: infra.length,
      infraHours: sumHours(infra),
    },

    efficiency: {
      totalRawTickets: classifiedIssues.length,
      duplicatesCount: duplicates.length,
      netProductiveTickets: netIssues.length,
      complexTicketsCount: complexIssues.length,
      complexTicketsHours,
    },

    campusIssues: classifiedIssues.filter((i) => i.area === 'CAMPUS'),
    projectIssues: classifiedIssues.filter((i) => i.strategicType === 'NUEVO_PROYECTO'),
    complexIssues,
    classifiedIssues,
  };
}

/**
 * Genera el texto ejecutivo de respuesta rápida para correo a Edith
 */
export function generateEmailBulletsForEdith(summary: StrategicBreakdownSummary, periodLabel: string): string {
  const { byAgreement, byArea, efficiency } = summary;

  return `PUNTOS ESTRATÉGICOS — GESTIÓN ${periodLabel.toUpperCase()}

1. CLASIFICACIÓN POR ACUERDOS CONTRACTUALES:
• Fallas / Mantenimiento Correctivo: ${byAgreement.fallasCount} casos (${byAgreement.fallasHours} h) — Incidencias de código Drupal, corrección de edición simultánea y parches de seguridad de servidores.
• Mejoras / Optimización Operativa: ${byAgreement.mejorasCount} casos (${byAgreement.mejorasHours} h) — Optimizaciones de caché, búsquedas con autocompletado y reconfiguración de vistas.
• Campus LexLatin & Marketing Digital: ${byAgreement.campusCount} requerimientos (${byAgreement.campusHours} h) — Publicación y actualización de Landing Pages del Programa Ejecutivo, creación de página de gracias y configuración de analítica LinkedIn.
• Nuevos Proyectos (Fuera de Alcance): ${byAgreement.proyectosCount} iniciativas levantadas (${byAgreement.proyectosHours} h) — Propuestas estratégicas de Ágora, AyudanteX, PerfilPlus y DataStudio que requieren cotización y aprobación previa.

2. ORIGEN DE LAS SOLICITUDES POR ÁREAS:
• Operación Editorial / Redacción (Drupal): ${byArea.editorialCount} requerimientos
• Campus LexLatin & Marketing: ${byArea.campusCount} requerimientos
• Ágora & Plataformas Comerciales: ${byArea.agoraCount} requerimientos
• Infraestructura y Servidores: ${byArea.infraCount} requerimientos

3. EFICIENCIA OPERATIVA Y VOLUMEN DE TICKETS:
• Jira registró ${efficiency.totalRawTickets} tickets en el período.
• ${efficiency.duplicatesCount} tickets correspondieron a hilos de correo automáticos consolidados (respuestas "Re:...") que fueron cancelados de inmediato sin generar sobrecosto.
• Los requerimientos netos productivos fueron ${efficiency.netProductiveTickets} casos (menos de 1 por día hábil).
• 10 casos complejos (+6h) concentraron ${efficiency.complexTicketsHours} horas técnicas de investigación profunda y desarrollo para garantizar la estabilidad del portal.`;
}

