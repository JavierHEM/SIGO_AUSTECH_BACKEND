const express = require('express');
const { check } = require('express-validator');
const router = express.Router();
const afiladosController = require('../controllers/afilados.controller');
const { auth } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validation.middleware');

const authMiddleware = require('../middlewares/auth.middleware');
const { checkRole } = authMiddleware;

// Middleware para todas las rutas
router.use(auth);

/**
 * @route POST /api/afilados
 * @desc Registrar un nuevo afilado
 * @access Private
 */
router.post(
  '/',
  [
    check('sierra_id', 'El ID de la sierra es requerido').isNumeric(),
    check('tipo_afilado_id', 'El tipo de afilado es requerido').isNumeric(),
    check('ultimo_afilado', 'El campo "ultimo_afilado" debe ser booleano').optional().isBoolean(),
    validate
  ],
  afiladosController.createAfilado
);

/**
 * @route PUT /api/afilados/:id/salida
 * @desc Registrar la fecha de salida de un afilado
 * @access Private
 */
router.put(
  '/:id/salida',
  afiladosController.registrarSalida
);

/**
 * @route GET /api/afilados/sierra/:id
 * @desc Obtener historial de afilados por sierra
 * @access Private
 */
router.get('/sierra/:id', afiladosController.getAfiladosBySierra);

/**
 * @route GET /api/afilados/sucursal/:id
 * @desc Obtener historial de afilados por sucursal
 * @access Private
 */
router.get('/sucursal/:id', afiladosController.getAfiladosBySucursal);

/**
 * @route GET /api/afilados/todos
 * @desc Obtener todos los afilados (filtrado según rol)
 * @access Private
 */
router.get('/todos', afiladosController.getAllAfilados);

/**
 * @route GET /api/afilados/cliente/:id
 * @desc Obtener historial de afilados por cliente
 * @access Private
 */
router.get('/cliente/:id', afiladosController.getAfiladosByCliente);

/**
 * @route GET /api/afilados/pendientes
 * @desc Obtener afilados pendientes (sin fecha de salida)
 * @access Private
 */
router.get('/pendientes', afiladosController.getAfiladosPendientes);

/**
 * @route GET /api/afilados/:id
 * @desc Obtener un afilado por ID
 * @access Private
 */
router.get('/:id', afiladosController.getAfiladoById);

/**
 * @route POST /api/afilados/salida-masiva
 * @desc Registrar fecha de salida para múltiples afilados
 * @access Private
 */
router.post('/salida-masiva', afiladosController.registrarSalidaMasiva);

/**
 * @route POST /api/afilados/ultimo-afilado-masivo
 * @desc Marcar múltiples afilados como último afilado
 * @access Private (solo gerentes)
 */
router.post(
  '/ultimo-afilado-masivo',
  auth,
  checkRole(['Gerente', 'Administrador']),
  [
    check('afiladoIds', 'Se requiere un array de IDs de afilado').isArray().notEmpty(),
    validate
  ],
  afiladosController.marcarUltimoAfiladoMasivo
);

module.exports = router;