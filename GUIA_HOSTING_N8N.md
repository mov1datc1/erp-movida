# 🚀 Guía de Hosting para n8n (Self-Hosted)

## ¿Puedo instalar n8n en SiteGround?

La respuesta corta es: **No es recomendable y en la mayoría de los planes (Shared Hosting) es imposible.**

**¿Por qué?**
SiteGround está diseñado principalmente para alojar sitios web (WordPress, PHP, MySQL). n8n es una aplicación de Node.js compleja que requiere correr como un proceso en segundo plano de forma persistente (24/7) y consume cierta cantidad de memoria constante. Los servidores de hosting compartido matan estos procesos porque asumen que son tareas atascadas. Además, n8n se instala idealmente usando **Docker**, una tecnología que SiteGround no permite en sus planes normales.

*Nota: Solo podrías si tuvieras un servidor "Cloud Dedicado" en SiteGround con acceso `root` por SSH, pero son muy costosos ($100+/mes) comparados con las alternativas.*

---

## 🌟 La Alternativa Ideal: Un VPS de $5 USD al mes

La forma estándar en la que todas las empresas hacen "self-hosting" de n8n es rentando un pequeño Servidor Privado Virtual (VPS). Te costará entre $4 y $6 dólares al mes y tendrás control total.

**Proveedores recomendados:**
1. **DigitalOcean** (Tienen un botón de "Instalar Docker en 1 clic")
2. **Hetzner** (El más barato y potente, desde €4/mes)
3. **Linode / Akamai**

---

## 🛠️ Procedimiento de Instalación (Vía VPS con Docker)

Este es el procedimiento estándar de la industria. Tomará unos 15 minutos.

### Paso 1: Configurar el Servidor
1. Crea una cuenta en DigitalOcean o Hetzner.
2. Crea un nuevo servidor (Droplet/Instance) con **Ubuntu 22.04**.
3. Elige el tamaño mínimo: **1 GB RAM** (n8n corre bien ahí para cargas ligeras) o 2 GB RAM (recomendado). Costo aprox: $5 a $6 USD/mes.
4. Asegúrate de que el servidor tenga **Docker** instalado (DigitalOcean tiene una imagen preconfigurada en su Marketplace, sino, se instala con un comando).

### Paso 2: Conectar un Subdominio
1. Ve a SiteGround (o donde tengas tu dominio comprado).
2. En la Zona DNS, crea un **Registro A**.
3. Nombre: `n8n` (para que quede `n8n.tudominio.com`).
4. Valor/IP: La dirección IP pública que te dio tu nuevo VPS.

### Paso 3: Instalar n8n usando Docker Compose
Conéctate por SSH a tu nuevo servidor:

```bash
ssh root@IP_DE_TU_SERVIDOR
```

Crea una carpeta para n8n y entra en ella:
```bash
mkdir n8n-docker
cd n8n-docker
```

Crea un archivo llamado `docker-compose.yml`:
```bash
nano docker-compose.yml
```

Pega esta configuración básica. (Este setup usa SQLite interno, perfecto para empezar):
```yaml
version: '3.8'

services:
  n8n:
    image: docker.n8n.io/n8nio/n8n
    restart: always
    ports:
      - "5678:5678"
    environment:
      - N8N_HOST=n8n.tudominio.com
      - N8N_PORT=5678
      - N8N_PROTOCOL=http
      - NODE_ENV=production
      - WEBHOOK_URL=http://n8n.tudominio.com:5678/
    volumes:
      - n8n_data:/home/node/.n8n

volumes:
  n8n_data:
```

Guarda el archivo (`Ctrl + X`, luego `Y`, luego `Enter`).

Levanta n8n:
```bash
docker compose up -d
```

### Paso 4: Acceder a n8n
Abre tu navegador y entra a:
`http://IP_DE_TU_SERVIDOR:5678` o `http://n8n.tudominio.com:5678`

La primera vez que entres, te pedirá que crees un usuario administrador y una contraseña.

> **Importante para Producción:** Lo ideal es poner un "Reverse Proxy" (como Caddy, Nginx Proxy Manager o Traefik) frente a n8n para tener certificado **HTTPS (SSL)** gratuito. Si usas Meta Ads, Meta te exigirá que la URL del webhook de n8n sea HTTPS.

---

## ⚙️ Cómo subir el Flujo (JSON) a tu nuevo n8n

Una vez que tienes tu n8n funcionando (o si decides usar la versión Cloud de ellos mientras tanto):

1. Abre tu panel de n8n.
2. En el menú de la izquierda, haz clic en el botón de **"+" (Add workflow)** para crear un flujo en blanco.
3. Arriba a la derecha, verás un ícono de menú de tres puntitos **(⋮)**. Haz clic ahí.
4. Selecciona **"Import from File..."**.
5. Sube el archivo `n8n_meta_ads_leads_workflow.json` que te generé anteriormente.
6. El flujo aparecerá en pantalla. Solo tendrás que:
   - Hacer doble clic en el primer nodo (Facebook) y darle a "Create New Credential" para loguearte con tu Facebook.
   - Hacer doble clic en el segundo nodo (HTTP Request) y crear tu credencial con el `WEBHOOK_SECRET`.
7. Arriba a la derecha, activa el switch para poner el flujo en **"Active"**.

¡Listo! Ya tienes tu automatización corriendo sin pagar suscripciones mensuales de plataformas de integración.
