# Imagen en dos etapas: se construye con Node y se sirve con nginx, así la
# imagen final no lleva ni Node ni node_modules, solo los estáticos.

# ---------- construcción ----------
FROM node:22-alpine AS construccion

WORKDIR /app

# Las dependencias en su propia capa: mientras no cambien los manifiestos,
# Docker reutiliza esta capa y el `npm ci` no se repite en cada build.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# En GitHub Pages la app cuelga de /SchemePlay/; en Docker se sirve desde la
# raíz. Se puede cambiar con --build-arg BASE_PATH=/loquesea/
ARG BASE_PATH=/
ENV BASE_PATH=$BASE_PATH

# Las reglas de fusión y el repaso espaciado deciden si se pierde trabajo y si
# repasas lo que toca: si fallan, no hay imagen.
RUN npm test
RUN npm run build

# ---------- servicio ----------
FROM nginx:1.27-alpine AS servicio

COPY --from=construccion /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY seguridad.conf /etc/nginx/snippets/seguridad.conf

# nginx ya corre como no-root desde la imagen oficial en el proceso worker,
# pero el healthcheck conviene tenerlo explícito.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -qO- http://localhost/ >/dev/null || exit 1

EXPOSE 80
