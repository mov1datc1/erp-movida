import { Prioridad, CategoriaTarea, TareaStatus } from '@prisma/client';

export interface ParsedTarea {
  numero: string;
  titulo: string;
  descripcion: string;
  prioridad: Prioridad;
  categoria: CategoriaTarea;
  horas_estimadas: number;
  estatus: TareaStatus;
  subtareas: string[];
}

export interface ParsedSprint {
  numero: number;
  nombre: string;
  objetivo: string;
  tareas: ParsedTarea[];
}

export interface SprintPlanMetrics {
  totalSprints: number;
  totalTareas: number;
  totalSubtareas: number;
}

/**
 * Heurística de prioridad según palabras clave en el título y descripción
 */
function inferPrioridad(titulo: string, descripcion: string, indexInSprint: number): Prioridad {
  const combined = `${titulo} ${descripcion}`.toLowerCase();

  if (
    combined.includes('seguridad') ||
    combined.includes('auth') ||
    combined.includes('crítico') ||
    combined.includes('critico') ||
    combined.includes('urgente') ||
    combined.includes('bloqueo') ||
    combined.includes('restricción') ||
    combined.includes('restriccion') ||
    combined.includes('reserva automática') ||
    combined.includes('concurrencia')
  ) {
    return 'URGENTE';
  }

  if (
    indexInSprint === 0 ||
    combined.includes('core') ||
    combined.includes('maestro') ||
    combined.includes('datos') ||
    combined.includes('base de datos') ||
    combined.includes('crud') ||
    combined.includes('motor') ||
    combined.includes('layout') ||
    combined.includes('api') ||
    combined.includes('endpoint')
  ) {
    return 'ALTA';
  }

  if (combined.includes('documentar') || combined.includes('nota') || combined.includes('secundario')) {
    return 'BAJA';
  }

  return 'MEDIA';
}

/**
 * Heurística de categoría según palabras clave
 */
function inferCategoria(titulo: string, descripcion: string): CategoriaTarea {
  const combined = `${titulo} ${descripcion}`.toLowerCase();

  if (
    combined.includes('regla') ||
    combined.includes('catálogo') ||
    combined.includes('catalogo') ||
    combined.includes('admin') ||
    combined.includes('reporte') ||
    combined.includes('factura') ||
    combined.includes('fiscal') ||
    combined.includes('auditoría') ||
    combined.includes('auditoria') ||
    combined.includes('checkpoint')
  ) {
    return 'ADMINISTRATIVA';
  }

  if (
    combined.includes('marketing') ||
    combined.includes('notificación') ||
    combined.includes('notificacion') ||
    combined.includes('correo') ||
    combined.includes('email')
  ) {
    return 'MARKETING';
  }

  if (
    combined.includes('pedido') ||
    combined.includes('cotización') ||
    combined.includes('cotizacion') ||
    combined.includes('venta') ||
    combined.includes('cliente') ||
    combined.includes('portal')
  ) {
    return 'VENTAS';
  }

  return 'OPERATIVA';
}

/**
 * Parser inteligente para planes de sprints generados por Gemini / ChatGPT / Claude
 * Soporta texto colapsado (unilínea), texto plano con saltos de línea y Markdown con títulos/bullets.
 */
export function parseSprintPlan(
  rawText: string,
  horasPorSprint: number = 30
): ParsedSprint[] | null {
  if (!rawText || typeof rawText !== 'string' || !rawText.trim()) {
    return null;
  }

  let text = rawText.trim();

  // 1. Separar límites colapsados (cuando se copia sin saltos de línea desde navegadores o terminales)
  text = text.replace(/([a-záéíóúñA-Z0-9\)\.])\s*(Sprint\s*\d+)/gi, '$1\n\n$2');
  text = text.replace(/([a-záéíóúñA-Z0-9\)\.])\s*(Objetivo(?:\s+del\s+sprint)?|Meta|Goal)\s*[\:\-\.]/gi, '$1\n$2:');
  text = text.replace(/([a-záéíóúñA-Z0-9\)\.])\s*(?<!Sub)(?<!Sub-)(Tarea\s*\d+(?:\.\d+)?|Task\s*\d+(?:\.\d+)?)/gi, '$1\n$2');
  text = text.replace(/([a-záéíóúñA-Z0-9\)\.])\s*(Subtarea\s*\d*|Sub-tarea\s*\d*|Subtask\s*\d*)/gi, '$1\n$2');

  // 2. Etiquetar marcadores de manera segura (evitando colisión entre Subtarea y Tarea)
  text = text.replace(/(?:^|[^\w])(?:#+\s*|\*{1,3}|-\s*|\*\s*)?(Subtarea|Sub-tarea|Subtask)\s*(\d*)[\s\:\-\.]*(?:\*{1,3})?/gi, '\n<<<SUBTAREA>>> ');
  text = text.replace(/(?:^|[^\w])(?:#+\s*|\*{1,3})?(?<!Sub)(?<!Sub-)(Tarea|Task)\s*(\d+(?:\.\d+)?)[\s\:\-\.]*(?:\*{1,3})?/gi, '\n<<<TAREA_$2>>> ');
  text = text.replace(/(?:^|[^\w])(?:#+\s*|\*{1,3})?(Objetivo(?:\s+del\s+sprint)?|Meta|Goal)\s*[\:\-\.]*(?:\*{1,3})?/gi, '\n<<<OBJETIVO>>> ');
  text = text.replace(/(?:^|[^\w])(?:#+\s*|\*{1,3})?(Sprint|Semana)\s*(\d+)[\s\:\-\.]*(?:\*{1,3})?/gi, '\n\n<<<SPRINT_$2>>> ');

  // 3. Dividir por bloques de Sprint
  const sprintBlocks = text.split(/<<<SPRINT_[^>]+>>>/i);
  const sprintHeaders = text.match(/<<<SPRINT_([^>]+)>>>/gi);

  if (!sprintHeaders || sprintHeaders.length === 0) {
    return null;
  }

  const sprints: ParsedSprint[] = [];

  for (let i = 0; i < sprintHeaders.length; i++) {
    const rawHeader = sprintHeaders[i];
    const matchHeader = rawHeader.match(/<<<SPRINT_(\d+)>>>/i);
    const sprintNum = matchHeader ? parseInt(matchHeader[1], 10) : i + 1;
    const blockContent = sprintBlocks[i + 1] || '';

    let title = '';
    let objetivo = '';
    const rawTareas: Array<{
      numero: string;
      titulo: string;
      descripcion: string;
      subtareas: string[];
    }> = [];

    const linesOrSegments = blockContent.split('\n');
    let currentSection: 'TITLE' | 'OBJETIVO' | 'TAREA' | 'SUBTAREA' = 'TITLE';
    let currentTarea: { numero: string; titulo: string; descripcion: string; subtareas: string[] } | null = null;

    for (let segment of linesOrSegments) {
      segment = segment.trim();
      if (!segment) continue;

      // Limpiar markdown residual al inicio (#, *, -, etc.)
      segment = segment.replace(/^#+\s*/, '').replace(/^\*+\s*/, '').replace(/^-+\s*/, '').trim();

      if (segment.startsWith('<<<OBJETIVO>>>')) {
        currentSection = 'OBJETIVO';
        const objText = segment.replace('<<<OBJETIVO>>>', '').replace(/^\*+|\*+$/g, '').trim();
        if (objText) objetivo = (objetivo ? objetivo + ' ' : '') + objText;
      } else if (segment.match(/^<<<TAREA_[^>]+>>>/)) {
        currentSection = 'TAREA';
        const tareaMatch = segment.match(/^<<<TAREA_([0-9.]+)>>>\s*(.*)$/);
        const tareaNum = tareaMatch ? tareaMatch[1] : `${sprintNum}.${rawTareas.length + 1}`;
        const restOfLine = tareaMatch ? tareaMatch[2].replace(/^\*+|\*+$/g, '').trim() : '';

        currentTarea = {
          numero: tareaNum,
          titulo: restOfLine || `Tarea ${tareaNum}`,
          descripcion: '',
          subtareas: []
        };
        rawTareas.push(currentTarea);
      } else if (segment.match(/^<<<SUBTAREA>>>/)) {
        currentSection = 'SUBTAREA';
        const subText = segment.replace(/^<<<SUBTAREA>>>\s*/, '').replace(/^\*+|\*+$/g, '').trim();

        if (currentTarea && subText) {
          currentTarea.subtareas.push(subText);
        }
      } else {
        if (currentSection === 'TITLE') {
          title = (title ? title + ' ' : '') + segment.replace(/^\*+|\*+$/g, '');
        } else if (currentSection === 'OBJETIVO') {
          objetivo = (objetivo ? objetivo + ' ' : '') + segment.replace(/^\*+|\*+$/g, '');
        } else if (currentSection === 'TAREA' && currentTarea) {
          if (!currentTarea.descripcion) {
            currentTarea.descripcion = segment.replace(/^\*+|\*+$/g, '');
          } else {
            currentTarea.descripcion += ' ' + segment.replace(/^\*+|\*+$/g, '');
          }
        } else if (currentSection === 'SUBTAREA' && currentTarea) {
          if (currentTarea.subtareas.length > 0) {
            currentTarea.subtareas[currentTarea.subtareas.length - 1] += ' ' + segment.replace(/^\*+|\*+$/g, '');
          } else {
            currentTarea.subtareas.push(segment.replace(/^\*+|\*+$/g, ''));
          }
        }
      }
    }

    // Limpieza de título del Sprint
    title = title.replace(/^[\:\-\.\s]+/, '').replace(/[\:\-\.\s]+$/, '').trim();
    if (!title) {
      title = `Sprint ${sprintNum}`;
    }

    // Limpieza y estructuración final de Tareas
    const processedTareas: ParsedTarea[] = rawTareas.map((t, tIdx) => {
      let cleanTitulo = t.titulo.replace(/^[\:\-\.\s]+/, '').replace(/[\:\-\.\s]+$/, '').trim();
      let cleanDesc = (t.descripcion || '').trim();

      // En textos donde el título y la descripción quedaron pegados sin salto de línea
      if (!cleanDesc) {
        const matchJoined = cleanTitulo.match(
          /^(.+?[a-z\)])([A-Z][a-z]+(?:ar|er|ir|arás|erás|irán|ando|endo)\b\s*.*)$/
        );
        if (matchJoined && matchJoined[1].trim().length > 5) {
          cleanTitulo = matchJoined[1].trim();
          cleanDesc = matchJoined[2].trim();
        } else {
          const matchCommon = cleanTitulo.match(
            /^(.+?)(Configurar|Gestionar|Definir|Digitalizar|Permitir|Construir|Garantizar|Dar|Habilitar|Completar)\b\s*(.*)$/
          );
          if (
            matchCommon &&
            matchCommon[1].trim().length > 5 &&
            !matchCommon[1].endsWith('de ') &&
            !matchCommon[1].endsWith('para ')
          ) {
            cleanTitulo = matchCommon[1].trim();
            cleanDesc = (matchCommon[2] + ' ' + (matchCommon[3] || '')).trim();
          }
        }
      }

      const prioridad = inferPrioridad(cleanTitulo, cleanDesc, tIdx);
      const categoria = inferCategoria(cleanTitulo, cleanDesc);

      // Limpiar y deduplicar subtareas vacías
      const cleanSubtareas = t.subtareas
        .map(s => s.replace(/^[\:\-\.\s]+/, '').replace(/[\:\-\.\s]+$/, '').trim())
        .filter(s => s.length > 0);

      return {
        numero: t.numero,
        titulo: cleanTitulo,
        descripcion: cleanDesc,
        prioridad,
        categoria,
        horas_estimadas: 0, // Se calcula proporcionalmente abajo
        estatus: 'PENDIENTE',
        subtareas: cleanSubtareas
      };
    });

    // Distribuir horas por tarea dentro del sprint según capacidad semanal
    const totalSubtareasInSprint = processedTareas.reduce((sum, t) => sum + Math.max(1, t.subtareas.length), 0);
    processedTareas.forEach(t => {
      const weight = Math.max(1, t.subtareas.length);
      t.horas_estimadas = totalSubtareasInSprint > 0
        ? Math.max(2, Math.round((weight / totalSubtareasInSprint) * horasPorSprint))
        : Math.round(horasPorSprint / Math.max(1, processedTareas.length));
    });

    sprints.push({
      numero: sprintNum,
      nombre: title.startsWith(`Sprint ${sprintNum}`) ? title : `Sprint ${sprintNum}: ${title}`,
      objetivo: objetivo.trim() || `Objetivos y entregables clave del Sprint ${sprintNum}`,
      tareas: processedTareas
    });
  }

  return sprints.length > 0 ? sprints : null;
}

/**
 * Obtiene métricas agregadas del plan para visualización en la UI
 */
export function getSprintPlanMetrics(sprints: ParsedSprint[] | null): SprintPlanMetrics {
  if (!sprints || sprints.length === 0) {
    return { totalSprints: 0, totalTareas: 0, totalSubtareas: 0 };
  }

  let totalTareas = 0;
  let totalSubtareas = 0;

  for (const s of sprints) {
    totalTareas += s.tareas.length;
    for (const t of s.tareas) {
      totalSubtareas += t.subtareas.length;
    }
  }

  return {
    totalSprints: sprints.length,
    totalTareas,
    totalSubtareas
  };
}
