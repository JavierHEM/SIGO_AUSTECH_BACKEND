/**
 * Middleware para manejar errores de forma centralizada
 */
const errorHandler = (err, req, res, next) => {
    console.error(`Error: ${err.message}`);
    console.error(err.stack);
  
    // Determinar el código de estado HTTP apropiado
    const statusCode = err.statusCode || 500;
  
    // Estructura estándar para respuestas de error
    res.status(statusCode).json({
      success: false,
      message: err.message || 'Error del servidor',
      stack: process.env.NODE_ENV === 'production' ? undefined : err.stack
    });
  };
  
  module.exports = { errorHandler };