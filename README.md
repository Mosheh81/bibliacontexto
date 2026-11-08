# bibliacontexto

Lugar para ver recursos útiles en la vida del Reino de Jehová.

## Calendario Bíblico

SPA adaptable a móvil y escritorio para buscar y consultar las lecturas bíblicas semanales. La aplicación conserva la búsqueda, los filtros por bloque, el detalle de las siete lecturas y la navegación entre semanas. Las rutas usan el hash del navegador, por lo que un detalle se puede enlazar y la navegación atrás funciona.

El encabezado muestra la semana actual, contando desde el 15 de noviembre de 2026 y avanzando cada siete días.

Los datos del calendario se cargan desde `app/src/main/assets/calendario.json`.

### Ejecutar localmente

Desde la raíz del proyecto, inicia un servidor estático; por ejemplo:

```sh
python -m http.server 8000
```

Abre `http://localhost:8000`. La SPA no requiere instalar paquetes.

### Publicar con GitHub Pages

En el repositorio, abre **Settings → Pages** y selecciona **Deploy from a branch**, la rama `main` y la carpeta `/(root)`. Guarda los cambios; GitHub Pages publicará el sitio en `https://mosheh81.github.io/bibliacontexto/`.
