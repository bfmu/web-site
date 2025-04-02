---
title: Activar la ejecución de scripts en Windows
description: Aprende cómo activar la ejecución de scripts en Windows mediante PowerShell con una política de ejecución adecuada.
published: 2024-11-13
tags: [Windows, PowerShell, Seguridad, Tutorial]
category: Sistemas Operativos
draft: false
slug: activar-ejecucion-scripts-windows
---

# Activar la ejecución de scripts en Windows

Para poder ejecutar scripts de PowerShell en Windows, es necesario ajustar la política de ejecución. Puedes hacerlo fácilmente usando el siguiente comando en **PowerShell**:

```powershell
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Este comando permite la ejecución de scripts descargados de internet siempre que estén firmados por un editor de confianza. Solo afecta al usuario actual (`CurrentUser`), lo cual es útil si no tienes permisos de administrador en tu sistema.

Recuerda que modificar la política de ejecución puede tener implicaciones de seguridad, por lo que es importante saber qué scripts estás ejecutando y confiar en ellos. 😊

