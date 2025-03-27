const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
require('dotenv').config();

// Importar rutas
const authRoutes = require('./routes/auth.routes');
const usuariosRoutes = require('./routes/usuarios.routes');
const clientesRoutes = require('./routes/clientes.routes');
const sucursalesRoutes = require('./routes/sucursales.routes');
const sierrasRoutes = require('./routes/sierras.routes');
const afiladosRoutes = require('./routes/afilados.routes');
const catalogosRoutes = require('./routes/catalogos.routes');

// Error handler middleware
const { errorHandler } = require('./middlewares/error.middleware');

// Configuración de Swagger
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API Sistema de Control de Afilado para Sierras',
      version: '1.0.0',
      description: 'API REST para el Sistema de Control de Afilado de Sierras de Austech',
    },
    servers: [
      {
        url: 'https://sigo-austech-backend.onrender.com',
        description: 'Servidor de producción'
      },
      {
        url: 'http://localhost:5000',
        description: 'Servidor de desarrollo'
      },
    ],
  },
  apis: ['./routes/*.js'],
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);

// Inicializar app
const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
})); 

// Configuración CORS mejorada
app.use(cors({
  origin: [
  
    "https://austech-jade.vercel.app"

  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Total-Count'],
  credentials: true,
  maxAge: 86400 // Tiempo en segundos que el navegador puede cachear los resultados del pre-flight
}));

app.use(express.json()); // Parsear JSON
app.use(morgan('dev')); // Logging de requests

// Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Rutas API
app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/sucursales', sucursalesRoutes);
app.use('/api/sierras', sierrasRoutes);
app.use('/api/afilados', afiladosRoutes);
app.use('/api/catalogos', catalogosRoutes);

// Ruta básica para probar
app.get('/', (req, res) => {
  res.json({ 
    message: 'API Sistema de Control de Afilado para Sierras de Austech', 
    status: 'online',
    docs: '/api-docs'
  });
});

// Middleware error handler
app.use(errorHandler);

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT} [${process.env.NODE_ENV || 'development'}]`);
});