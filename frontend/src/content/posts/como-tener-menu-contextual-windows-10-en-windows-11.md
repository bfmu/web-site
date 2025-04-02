---
slug: como-tener-menu-contextual-windows-10-en-windows-11
title: Cómo tener el menú contextual de Windows 10 en Windows 11
description: Aprende a cambiar el menú contextual de Windows 11 al clásico de Windows 10 usando PowerShell, y cómo revertirlo si lo necesitas.
published: 2024-11-13
tags: [Windows, PowerShell, Tutorial, Personalización]
category: Sistemas Operativos
draft: false
---


Windows 11 trae muchas novedades, pero el nuevo menú contextual puede ser un cambio incómodo para algunos usuarios que prefieren el menú clásico de Windows 10. Afortunadamente, puedes restaurar el menú contextual de Windows 10 en Windows 11 con un simple ajuste en el registro usando **PowerShell**. Aquí te muestro cómo hacerlo.

## Cambiar al menú contextual de Windows 10

Para hacer esto, necesitarás abrir una ventana de **PowerShell** con permisos de administrador. Luego, ejecuta el siguiente script para habilitar el menú contextual clásico:

```powershell
New-Item -Path "HKCU:\Software\Classes\CLSID\{86ca1aa0-34aa-4e8b-a509-50c905bae2a2}\InprocServer32" -Value "" -Force
```

### Revertir al menú contextual de Windows 11

Si más adelante decides volver al menú contextual de Windows 11, simplemente ejecuta el siguiente script en **PowerShell**:

```powershell
Remove-Item -Path "HKCU:\Software\Classes\CLSID\{86ca1aa0-34aa-4e8b-a509-50c905bae2a2}\InprocServer32"
```

## Reiniciar para aplicar los cambios

Una vez hayas ejecutado el script que prefieras, deberás **reiniciar** tu PC o simplemente **reiniciar el Explorador de archivos** desde el administrador de tareas para que los cambios surtan efecto.

### Cómo reiniciar el Explorador de archivos

1. Presiona `Ctrl + Shift + Esc` para abrir el **Administrador de Tareas**.
2. Busca **Explorador de Windows** en la lista de procesos.
3. Haz clic derecho y selecciona **Reiniciar**.

Esto actualizará el menú contextual sin necesidad de reiniciar todo el sistema.

---

Con estos simples pasos, puedes personalizar tu experiencia en Windows 11 para adaptarla mejor a tus preferencias. Si tienes alguna pregunta o comentario, ¡déjamelo saber! 😊

