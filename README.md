# Proyecto Web

Este proyecto consiste en una aplicación web que se compone de un backend y un frontend, ambos construidos utilizando Docker. A continuación se detallan las instrucciones para configurar y ejecutar el proyecto.

## Estructura del Proyecto

```
web-site
├── backend
│   ├── Dockerfile
│   └── src
│       └── ...
├── frontend
│   ├── Dockerfile
│   └── src
│       └── ...
├── docker-compose.yml
└── README.md
```

## Requisitos Previos

- Tener Docker y Docker Compose instalados en tu máquina.

## Configuración del Proyecto

1. Clona el repositorio en tu máquina local.
2. Navega al directorio del proyecto.

## Construcción y Ejecución

Para construir y ejecutar la aplicación, utiliza el siguiente comando en la raíz del proyecto:

```
docker-compose up --build
```

Esto construirá las imágenes del backend y del frontend según los Dockerfiles y levantará los contenedores correspondientes.

## Acceso a la Aplicación

Una vez que los contenedores estén en funcionamiento, podrás acceder a la aplicación a través de tu navegador en la dirección `http://localhost:3000` (ajusta el puerto según la configuración de tu aplicación).

## Notas Adicionales

- Asegúrate de revisar los Dockerfiles en las carpetas `backend` y `frontend` para entender cómo se configuran las aplicaciones.
- Puedes detener los contenedores en ejecución con `docker-compose down`.

## Contribuciones

Las contribuciones son bienvenidas. Si deseas contribuir, por favor abre un issue o un pull request en el repositorio.