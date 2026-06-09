# Guía de Despliegue y Flujo de Trabajo Git (ERP Movida)

Esta guía establece las mejores prácticas y el flujo de trabajo oficial para el equipo de desarrollo de **Movida TCI**.

## 1. Arquitectura de Ramas

El repositorio está estructurado en 4 ramas principales. **Nunca trabajes directamente sobre `main`.**

| Rama | Propósito | Entorno |
| :--- | :--- | :--- |
| **`main`** | Código estable listo para producción. | **Producción (Vercel)** |
| **`dev`** | Rama principal de desarrollo e integración. Aquí se unen todos los features. | Entorno local / Staging |
| **`feature`** | Ramas para desarrollar nuevas características (ej. `feature/modulo-pagos`). | Entorno local |
| **`hotfix`** | Para corregir bugs críticos en producción rápidamente. | Entorno local -> `main` |

## 2. Flujo de Trabajo Diario (Workflow)

Cuando vayas a crear algo nuevo, siempre parte de la rama `dev`:

```bash
# 1. Asegúrate de estar en dev y actualizado
git checkout dev
git pull origin dev

# 2. Crea tu rama de feature o bugfix
git checkout -b feature/nombre-del-feature

# 3. Haz tus cambios y commits
git add .
git commit -m "feat: descripción de los cambios"

# 4. Sube tu rama a GitHub
git push -u origin feature/nombre-del-feature
```

Una vez que el feature esté listo y probado, puedes fusionarlo con `dev` o crear un **Pull Request** en GitHub de tu rama `feature` hacia `dev`.

## 3. Despliegue en Vercel (Producción)

El proyecto está configurado para que **solo la rama `main`** dispare despliegues a producción.

### Pasos para pasar a producción:
Cuando la rama `dev` esté estable y queramos publicar los cambios al mundo real:

```bash
# 1. Ve a la rama main
git checkout main

# 2. Trae los cambios de dev
git merge dev

# 3. Sube a GitHub
git push origin main
```
> **Al hacer este último `push`, Vercel detectará el cambio en `main` y comenzará el proceso de build automáticamente.**

## 4. Hotfix (Emergencias en Producción)

Si hay un error grave en la web en vivo que no puede esperar:
```bash
# Partes desde main (el código actual en vivo)
git checkout main
git checkout -b hotfix/error-critico

# Haces la corrección y commiteas
git add .
git commit -m "fix: corrección del error crítico"

# Subes y fusionas directo a main para que Vercel actualice
git checkout main
git merge hotfix/error-critico
git push origin main

# MUY IMPORTANTE: Pasa el hotfix también a dev para no perderlo
git checkout dev
git merge hotfix/error-critico
git push origin dev
```

## 5. Notas sobre Supabase (Base de Datos)

Si tus cambios incluyeron modificaciones a la base de datos (archivo `schema.prisma`):
- Asegúrate de hacer `npx prisma db push` en tu entorno local.
- Asegúrate de que las variables de entorno de producción en Vercel (`DATABASE_URL`, `DIRECT_URL`, etc.) estén apuntando al proyecto correcto en Supabase.
