const express = require('express');
const { check } = require('express-validator');
const router = express.Router();
const {
  getSucursales,
  getSucursalById,
  createSucursal,
  updateSucursal,
  deleteSucursal,
  getSucursalesByCliente
} = require('../controllers/sucursales.controller');
const { auth, checkRole, checkSucursalAccess } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validation.middleware');

// Middleware para todas las rutas
router.use(auth);

/**
 * @route GET /api/sucursales
 * @desc Obtener todas las sucursales
 * @access Private
 */
router.get('/', getSucursales);

/**
 * @route GET /api/sucursales/:id
 * @desc Obtener una sucursal por ID
 * @access Private
 */
router.get('/:id', checkSucursalAccess, getSucursalById);

/**
 * @route POST /api/sucursales
 * @desc Crear una nueva sucursal
 * @access Private (solo gerentes/administradores)
 */
router.post(
  '/',
  [
    checkRole(['Gerente', 'Administrador']),
    check('nombre', 'El nombre es requerido').not().isEmpty(),
    check('direccion', 'La dirección es requerida').not().isEmpty(),
    check('telefono', 'El teléfono es requerido').not().isEmpty(),
    check('cliente_id', 'El ID del cliente es requerido').isNumeric(),
    validate
  ],
  createSucursal
);

/**
 * @route PUT /api/sucursales/:id
 * @desc Actualizar una sucursal existente
 * @access Private (solo gerentes/administradores)
 */
router.put(
  '/:id',
  [
    checkRole(['Gerente', 'Administrador']),
    check('nombre', 'El nombre es requerido').not().isEmpty(),
    check('direccion', 'La dirección es requerida').not().isEmpty(),
    check('telefono', 'El teléfono es requerido').not().isEmpty(),
    check('cliente_id', 'El ID del cliente es requerido').isNumeric(),
    validate
  ],
  updateSucursal
);

/**
 * @route DELETE /api/sucursales/:id
 * @desc Eliminar una sucursal
 * @access Private (solo gerentes/administradores)
 */
router.delete(
  '/:id',
  checkRole(['Gerente', 'Administrador']),
  deleteSucursal
);

/**
 * @route GET /api/clientes/:id/sucursales
 * @desc Obtener sucursales por cliente
 * @access Private
 */
router.get('/cliente/:id', getSucursalesByCliente);

module.exports = router;