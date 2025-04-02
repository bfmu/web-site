---
title: Arreglar problema de la hora en Dual Boot Windows y Linux
description: Solución sencilla para el problema de la diferencia de hora entre Windows y Linux en un sistema de arranque dual.
published: 2023-12-24
tags: [Linux, Windows, Dual Boot, Hora, Problemas Comunes]
category: Sistemas Operativos
slug: arreglar-problema-hora-dual-boot-windows-linux
drag: false
---

# Arreglar problema de la hora en Dual Boot Windows y Linux

Si usas un sistema en **dual boot** con **Windows** y **Linux**, es posible que hayas notado que la hora en uno de los sistemas siempre aparece incorrecta después de haber usado el otro. Esto ocurre porque Windows y Linux gestionan el reloj de la máquina de manera diferente.

Para solucionar este problema, simplemente ejecuta el siguiente comando en la terminal de **Linux**:

```sh
timedatectl set-local-rtc 1 --adjust-system-clock
```

Este comando indica a Linux que utilice la hora local, similar a cómo lo hace Windows, evitando así los desajustes de tiempo al cambiar de un sistema a otro.

Después de ejecutar este comando, la hora debería permanecer sincronizada correctamente entre ambos sistemas operativos. 😊

