const express = require('express');
const { check } = require('express-validator');
const router = express.Router();
const {
  getUsuarios,
  getUsuarioById,
  createUsuario,
  updateUsuario,
  deleteUsuario,
  asignarSucursales
} = require('../controllers/usuarios.controller');
const { auth, checkRole } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validation.middleware');

// Middleware para todas las rutas - Solo accesible por Gerentes
router.use(auth, checkRole(['Gerente']));

/**
 * @route GET /api/usuarios
 * @desc Obtener todos los usuarios
 * @access Private (solo gerentes)
 */
router.get('/', getUsuarios);

/**
 * @route GET /api/usuarios/:id
 * @desc Obtener un usuario por ID
 * @access Private (solo gerentes)
 */
router.get('/:id', getUsuarioById);

/**
 * @route POST /api/usuarios
 * @desc Crear un nuevo usuario
 * @access Private (solo gerentes)
 */
router.post(
  '/',
  [
    check('nombre', 'El nombre es requerido').not().isEmpty(),
    check('email', 'Por favor incluya un email válido').isEmail(),
    check('password', 'La contraseña debe tener al menos 6 caracteres').isLength({ min: 6 }),
    check('rol_id', 'El rol es requerido').isNumeric(),
    validate
  ],
  createUsuario
);

/**
 * @route PUT /api/usuarios/:id
 * @desc Actualizar un usuario existente
 * @access Private (solo gerentes)
 */
router.put(
  '/:id',
  [
    check('nombre', 'El nombre es requerido').not().isEmpty(),
    check('email', 'Por favor incluya un email válido').isEmail().optional(),
    check('rol_id', 'El rol es requerido').isNumeric(),
    validate
  ],
  updateUsuario
);

/**
 * @route DELETE /api/usuarios/:id
 * @desc Eliminar un usuario
 * @access Private (solo gerentes)
 */
router.delete('/:id', deleteUsuario);

/**
 * @route POST /api/usuarios/:id/sucursales
 * @desc Asignar sucursales a un usuario
 * @access Private (solo gerentes)
 */
router.post(
  '/:id/sucursales',
  [
    check('sucursales', 'Se requiere un array de IDs de sucursales').isArray(),
    validate
  ],
  asignarSucursales
);

module.exports = router;