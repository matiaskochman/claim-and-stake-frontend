import {
  readdirSync,
  statSync,
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
} from "fs";
import { join, relative } from "path";

// Directorios y configuraciones
const srcDir = join(process.cwd(), "src");
const outputFile = join(process.cwd(), "output.txt");
const excludeDirs = ["fonts", "components", "abis"];
const excludeFiles = ["favicon.ico"];
const rootFiles = [
  "tsconfig.json",
  "package.json",
  "next.config.mjs",
  "tailwind.config.ts",
];

// Crear el archivo de salida si no existe
if (!existsSync(outputFile)) {
  writeFileSync(outputFile, ""); // Crear archivo vacío
}

// Función para copiar archivos y agregar contenido al archivo de salida
const copyToOutputFile = (dir) => {
  const files = readdirSync(dir);

  files.forEach((file) => {
    const filePath = join(dir, file);
    const stat = statSync(filePath);

    if (stat.isDirectory()) {
      if (!excludeDirs.includes(file)) {
        copyToOutputFile(filePath); // Recursivamente procesar subdirectorios
      }
    } else if (!excludeFiles.includes(file)) {
      const relativePath = relative(process.cwd(), filePath);
      const fileContent = readFileSync(filePath, "utf-8");

      // Agregar el path del archivo y el contenido al archivo de salida
      writeFileSync(
        outputFile,
        `// Path: ${relativePath}\n\n${fileContent}\n\n`,
        { flag: "a" }
      );
    }
  });
};

// Procesar los archivos en `src`
copyToOutputFile(srcDir);

// Procesar archivos de la raíz
// rootFiles.forEach((file) => {
//   const filePath = join(process.cwd(), file);

//   if (existsSync(filePath)) {
//     const relativePath = relative(process.cwd(), filePath);
//     const fileContent = readFileSync(filePath, "utf-8");

//     // Agregar el path del archivo y el contenido al archivo de salida
//     writeFileSync(
//       outputFile,
//       `// Path: ${relativePath}\n\n${fileContent}\n\n`,
//       { flag: "a" }
//     );
//   }
// });

console.log(`Todos los archivos han sido copiados a ${outputFile}`);
