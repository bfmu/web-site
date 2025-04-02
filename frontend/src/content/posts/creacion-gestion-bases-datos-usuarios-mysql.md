---
title: Creación y Gestión de Bases de Datos y Usuarios en MySQL desde la Línea de Comando
description: Aprende a crear y gestionar bases de datos y usuarios en MySQL usando la línea de comando. Una guía paso a paso para realizar estas tareas fundamentales.
published: 2024-11-13
tags: [MySQL, Bases de Datos, Línea de Comando, Tutorial]
category: Bases de Datos
slug: creacion-gestion-bases-datos-usuarios-mysql
draft: false
---

# Creación y Gestión de Bases de Datos y Usuarios en MySQL desde la Línea de Comando

Crear y gestionar bases de datos y usuarios son tareas fundamentales cuando trabajamos con **MySQL**. En esta guía, aprenderemos cómo crear una base de datos, un usuario, y cómo otorgar privilegios a este usuario sobre la base de datos, todo desde la **línea de comando**.

## Paso 1: Acceso a MySQL

1. Abre la terminal.
2. Accede a MySQL usando el siguiente comando, reemplazando `tu_usuario` con tu nombre de usuario de MySQL:

   ```sh
   mysql -u tu_usuario -p
   ```

3. Ingresa tu contraseña cuando se te solicite.

## Paso 2: Creación de la Base de Datos

Una vez dentro de MySQL, ejecuta el siguiente comando para crear una nueva base de datos, reemplazando `nombre_base_de_datos` con el nombre deseado para tu base de datos:

```sql
CREATE DATABASE nombre_base_de_datos;
```

## Paso 3: Creación del Usuario

Ahora, crea un nuevo usuario con el siguiente comando, reemplazando `nombre_usuario` y `tu_contraseña` con el nombre de usuario y contraseña deseados, respectivamente:

```sql
CREATE USER 'nombre_usuario'@'%' IDENTIFIED BY 'tu_contraseña';
```

En este comando, el símbolo `%` permite que el usuario se conecte desde cualquier host. Si solo deseas permitir conexiones desde el host local, reemplaza `%` con `localhost`.

## Paso 4: Asignación de Privilegios

Otorga todos los privilegios al usuario sobre la base de datos que acabas de crear con el siguiente comando:

```sql
GRANT ALL PRIVILEGES ON nombre_base_de_datos.* TO 'nombre_usuario'@'%';
```

## Paso 5: Recarga de Privilegios

Para asegurar que los cambios surtan efecto, recarga los privilegios con el siguiente comando:

```sql
FLUSH PRIVILEGES;
```

## Paso 6: Salir de MySQL

Para salir de MySQL, simplemente ejecuta el siguiente comando:

```sql
EXIT;
```

Con estos pasos, habrás creado una nueva base de datos, un usuario, y otorgado todos los privilegios necesarios al usuario sobre la base de datos, todo desde la línea de comando en **MySQL**. 😊