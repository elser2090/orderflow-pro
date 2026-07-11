import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Sirve los archivos estáticos generados por Vite en la carpeta 'dist'
app.use(express.static(path.join(__dirname, 'dist')));
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Ready for production. Serving the 'dist' directory.`);
});
