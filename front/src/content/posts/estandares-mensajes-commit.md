---
title: Estándares para Mensajes de Commit
description: Aprende los estándares para escribir mensajes de commit claros y consistentes en tu flujo de trabajo de desarrollo colaborativo.
published: 2024-11-13
tags: [Git, Desarrollo, Mensajes de Commit, Buenas Prácticas]
category: Desarrollo
slug: estandares-mensajes-commit
draft: false
---

# Estándares para Mensajes de Commit

Los mensajes de commit son una parte importante de un flujo de trabajo de desarrollo colaborativo, ya que proporcionan información sobre los cambios que se han realizado en el código. A continuación, te mostraré algunos estándares comunes para escribir mensajes de commit, junto con ejemplos y explicaciones sobre cuándo usarlos:

### **`feat`**
Se utiliza para commits relacionados con la implementación de **nuevas características** o funcionalidades en el código.

- **Ejemplo**: `feat: Agregar autenticación de usuarios`

### **`fix`**
Se utiliza para commits que **corrigen errores** o bugs en el código existente.

- **Ejemplo**: `fix: Corregir error de validación en el formulario`

### **`docs`**
Se utiliza para commits relacionados con la **documentación**, como cambios en comentarios, archivos README o documentación de código.

- **Ejemplo**: `docs: Actualizar README con instrucciones de instalación`

### **`style`**
Se utiliza para commits que realizan cambios relacionados con el **estilo del código**, como cambios de formato, espaciado o nombres de variables.

- **Ejemplo**: `style: Corregir sangría en el archivo main.py`

### **`refactor`**
Se utiliza para commits relacionados con **cambios en la estructura** del código que no agregan ni corrigen funcionalidades, pero que mejoran la legibilidad o mantenibilidad.

- **Ejemplo**: `refactor: Reorganizar funciones en el módulo de utilidades`

### **`chore`**
Se utiliza para commits relacionados con tareas de **mantenimiento** o administrativas, como actualizaciones de dependencias, configuraciones de proyectos, etc.

- **Ejemplo**: `chore: Actualizar dependencias de desarrollo`

### **`test`**
Se utiliza para commits relacionados con **pruebas** unitarias o pruebas en general. Estos commits indican la adición o modificación de pruebas para el código existente.

- **Ejemplo**: `test: Agregar casos de prueba para la función de autenticación`

### **`perf`**
Se utiliza para commits que realizan **mejoras de rendimiento** en el código existente.

- **Ejemplo**: `perf: Optimizar algoritmo de búsqueda`

### **`ci`**
Se utiliza para commits relacionados con la configuración de la **integración continua** (CI, por sus siglas en inglés) o automatización de pruebas.

- **Ejemplo**: `ci: Configurar flujo de CI/CD en GitHub Actions`

### **`revert`**
Se utiliza para commits que **revierten cambios** anteriores en el historial del repositorio. Debe indicar el commit que se está revirtiendo.

- **Ejemplo**: `revert: Revertir cambios del commit abc123`

---

Seguir estos estándares te ayudará a mantener un historial de commits claro y útil para cualquier desarrollador que trabaje contigo en el proyecto. 😊