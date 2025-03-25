const express = require('express');
const { check } = require('express-validator');
const router = express.Router();
const {
  getSierraByCodigo,
  getSierrasBySucursal,
  getSierrasByCliente,
  createSierra,
  updateSierra,
  getSierras,
  getSierraById
} = require('../controllers/sierras.controller');
const { auth, checkRole, checkSucursalAccess } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validation.middleware');

// Middleware para todas las rutas
router.use(auth);

/**
 * @route GET /api/sierras/codigo/:codigo
 * @desc Buscar sierra por código de barras
 * @access Private
 */
router.get('/codigo/:codigo', getSierraByCodigo);

/**
 * @route GET /api/sierras/sucursal/:id
 * @desc Obtener sierras por sucursal
 * @access Private
 */
router.get('/sucursal/:id', checkSucursalAccess, getSierrasBySucursal);

/**
 * @route GET /api/sierras/cliente/:id
 * @desc Obtener sierras por cliente
 * @access Private
 */
router.get('/cliente/:id', getSierrasByCliente);

/**
 * @route GET /api/sierras/:id
 * @desc Obtener sierra por ID
 * @access Private
 */
router.get('/:id', getSierraById);

/**
 * @route POST /api/sierras
 * @desc Crear nueva sierra
 * @access Private (todos los roles)
 */
router.post(
  '/',
  [
    check('codigo', 'El código de la sierra es requerido').not().isEmpty(),
    check('sucursal_id', 'La sucursal es requerida').isNumeric(),
    check('tipo_sierra_id', 'El tipo de sierra es requerido').isNumeric(),
    validate
  ],
  createSierra
);

/**
 * @route GET /api/sierras/todas
 * @desc Obtener todas las sierras (principalmente para gerentes)
 * @access Private
 */
router.get('/todas', getSierras);

/**
 * @route PUT /api/sierras/:id
 * @desc Actualizar sierra
 * @access Private (todos los roles)
 */
router.put(
  '/:id',
  [
    check('codigo', 'El código debe ser válido').optional().not().isEmpty(),
    check('sucursal_id', 'La sucursal debe ser válida').optional().isNumeric(),
    check('tipo_sierra_id', 'El tipo de sierra debe ser válido').optional().isNumeric(),
    check('estado_id', 'El estado debe ser válido').optional().isNumeric(),
    validate
  ],
  updateSierra
);

module.exports = router;