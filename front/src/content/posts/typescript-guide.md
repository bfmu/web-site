---
slug: guia-de-typeScript
title: Guía de TypeScript
published: 2023-08-23
description: Una introducción a los tipos en TypeScript, explicando la inferencia de tipos, `any`, `unknown`, `never`, y más.
tags: [TypeScript, Desarrollo, Programación]
category: Tutorial
draft: false
---

# Guía de TypeScript 🚀

TypeScript es un lenguaje tipado que se construye sobre JavaScript, proporcionando herramientas para detectar errores en tiempo de desarrollo y mejorar la calidad del código. En esta guía, exploraremos los **tipos** principales que ofrece TypeScript.

---

## **Tipos en TypeScript**

### **Inferencia de Tipos**
TypeScript puede **inferir** automáticamente los tipos de datos básicos. Esto significa que no siempre es necesario declarar el tipo explícitamente. Por ejemplo:

```typescript
// Inferencia de tipos
const a = 1; // a es de tipo number
const b = 2; // b es de tipo number
const c = a + b; // c es de tipo number
```

En este ejemplo, **TypeScript** infiere que `a`, `b` y `c` son de tipo `number` basándose en sus valores iniciales.

---

### **`any`**
El tipo `any` indica a TypeScript que **ignore el tipado**. Es importante evitar su uso, ya que contradice la filosofía de TypeScript, que busca promover la seguridad en el código.

```typescript
let anyValue: any = 'Hola';
// TypeScript no verifica el tipo de anyValue
anyValue = 42; // Cambia a number sin problemas
```

⚠️ **Evita `any` siempre que sea posible**. Usa tipos más específicos o `unknown` si el tipo es incierto.

---

### **`unknown`**
El tipo `unknown` representa un valor cuyo tipo no se conoce. Es más seguro que `any` porque no permite operar sobre él sin verificar primero su tipo.

```typescript
let variable: unknown = 'Hola';

if (typeof variable === 'string') {
  console.log(variable.toUpperCase()); // Ahora TypeScript sabe que es un string
}
```

---

### **`never`**
El tipo `never` indica que una expresión **nunca produce un valor**. Esto ocurre en funciones que siempre lanzan errores o que tienen bucles infinitos.

```typescript
// Función que nunca retorna
function throwError(message: string): never {
  throw new Error(message);
}
```

También se utiliza en situaciones donde el código **nunca debería ser alcanzado**:

```typescript
function processValue(value: string | number): never {
  if (typeof value === 'string') {
    console.log('Es un string');
  } else if (typeof value === 'number') {
    console.log('Es un número');
  } else {
    // Esta parte nunca se ejecutará
    throw new Error('Tipo no soportado');
  }
}
```

---

### **`void`**
El tipo `void` se utiliza para funciones que **no devuelven un valor**. Es común en funciones con efectos secundarios, como imprimir en la consola.

```typescript
function logMessage(message: string): void {
  console.log(message);
}
```

En este caso, `logMessage` no tiene un valor de retorno, por lo que TypeScript asume que es de tipo `void`.

---

### **Otros Tipos Comunes**

#### **`string`**
Se utiliza para representar texto:

```typescript
let saludo: string = 'Hola, TypeScript!';
```

#### **`number`**
Representa valores numéricos:

```typescript
let edad: number = 25;
```

#### **`boolean`**
Representa valores verdaderos o falsos:

```typescript
let esActivo: boolean = true;
```

#### **`array`**
Se utiliza para representar listas de valores:

```typescript
let numeros: number[] = [1, 2, 3, 4];
```

#### **`tuple`**
Permite representar un arreglo con un número fijo de elementos de tipos específicos:

```typescript
let coordenada: [number, number] = [10, 20];
```

#### **`enum`**
Define un conjunto de valores con nombre:

```typescript
enum Color {
  Rojo,
  Verde,
  Azul,
}

let colorFavorito: Color = Color.Rojo;
```

---

## **Buenas Prácticas**
- Evita el uso de `any` y prefiere tipos específicos o `unknown`.
- Declara explícitamente los tipos cuando no sea evidente para mejorar la legibilidad del código.
- Usa **interfaces** o **type aliases** para definir estructuras complejas.

---

¡Y eso es todo por ahora! TypeScript es una herramienta poderosa que mejora tu productividad y la calidad de tu código. 🎉 Si quieres explorar más, no dudes en consultar la [documentación oficial](https://www.typescriptlang.org/).

¿Listo para escribir código más seguro y limpio? 💻✨

