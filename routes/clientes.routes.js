const express = require('express');
const { check } = require('express-validator');
const router = express.Router();
const {
  getClientes,
  getClienteById,
  createCliente,
  updateCliente,
  deleteCliente
} = require('../controllers/clientes.controller');
const { auth, checkRole } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validation.middleware');

// Middleware para todas las rutas
router.use(auth);

/**
 * @route GET /api/clientes
 * @desc Obtener todos los clientes
 * @access Private
 */
router.get('/', getClientes);

/**
 * @route GET /api/clientes/:id
 * @desc Obtener un cliente por ID
 * @access Private
 */
router.get('/:id', getClienteById);

/**
 * @route POST /api/clientes
 * @desc Crear un nuevo cliente
 * @access Private (solo gerentes/administradores)
 */
router.post(
  '/',
  [
    checkRole(['Gerente', 'Administrador']),
    check('razon_social', 'La razón social es requerida').not().isEmpty(),
    check('rut', 'El RUT es requerido').not().isEmpty(),
    check('direccion', 'La dirección es requerida').not().isEmpty(),
    check('telefono', 'El teléfono es requerido').not().isEmpty(),
    check('email', 'Incluya un email válido').isEmail(),
    validate
  ],
  createCliente
);

/**
 * @route PUT /api/clientes/:id
 * @desc Actualizar un cliente existente
 * @access Private (solo gerentes/administradores)
 */
router.put(
  '/:id',
  [
    checkRole(['Gerente', 'Administrador']),
    check('razon_social', 'La razón social es requerida').not().isEmpty(),
    check('rut', 'El RUT es requerido').not().isEmpty(),
    check('direccion', 'La dirección es requerida').not().isEmpty(),
    check('telefono', 'El teléfono es requerido').not().isEmpty(),
    check('email', 'Incluya un email válido').isEmail(),
    validate
  ],
  updateCliente
);

/**
 * @route DELETE /api/clientes/:id
 * @desc Eliminar un cliente
 * @access Private (solo gerentes/administradores)
 */
router.delete(
  '/:id',
  checkRole(['Gerente', 'Administrador']),
  deleteCliente
);

module.exports = router;