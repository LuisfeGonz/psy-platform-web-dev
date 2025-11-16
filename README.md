PsyPlatform es una aplicación web (sin backend) para gestionar y realizar tests psicológicos directamente en el navegador. 
Incluye autenticación básica con roles (admin, consultor y consultante), un constructor de preguntas con tipos abierta/cerrada/múltiple y soporte de imágenes, 
asignación de pruebas con fecha límite y avance guardado, envío de respuestas y visualización detallada de resultados, además de un dashboard con métricas 
por rol, tema claro/oscuro e interfaz responsiva.

La persistencia se maneja en memoria y en LocalStorage, con herramientas para exportar y guardar datos en archivos JSON (incluyendo la File System Access API en Chrome). 
Es un proyecto académico/demostrativo sin servidor backend, por lo que las credenciales en `data/users.json` están en texto plano y no debe usarse en producción. 
Para probar, abre `index.html` en un navegador moderno (idealmente vía `http://localhost`).
