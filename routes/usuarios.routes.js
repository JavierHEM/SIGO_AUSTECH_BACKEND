const express = require('express');
const { check } = require('express-validator');
const router = express.Router();
const usuariosController = require('../controllers/usuarios.controller');
const { auth, checkRole } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validation.middleware');

// Middleware para todas las rutas - Solo accesible por Gerentes
router.use(auth, checkRole(['Gerente']));

/**
 * @route GET /api/usuarios
 * @desc Obtener todos los usuarios
 * @access Private (solo gerentes)
 */
router.get('/', usuariosController.getUsuarios);

/**
 * @route GET /api/usuarios/:id
 * @desc Obtener un usuario por ID
 * @access Private (solo gerentes)
 */
router.get('/:id', usuariosController.getUsuarioById);

/**
 * @route POST /api/usuarios
 * @desc Crear un nuevo usuario
 * @access Private (solo gerentes)
 */
router.post(
  '/',
  [
    check('nombre', 'El nombre es requerido').not().isEmpty(),
    check('apellido', 'El apellido es requerido').not().isEmpty(),
    check('email', 'Por favor incluya un email válido').isEmail(),
    check('password', 'La contraseña debe tener al menos 6 caracteres').isLength({ min: 6 }),
    check('rol_id', 'El rol es requerido').isNumeric(),
    validate
  ],
  usuariosController.createUsuario
);

/**
 * @route PUT /api/usuarios/:id
 * @desc Actualizar un usuario
 * @access Private (solo gerentes)
 */
router.put(
  '/:id',
  [
    check('nombre', 'El nombre es requerido').not().isEmpty(),
    check('apellido', 'El apellido es requerido').not().isEmpty(),
    check('email', 'Por favor incluya un email válido').isEmail().optional(),
    check('rol_id', 'El rol es requerido').isNumeric(),
    validate
  ],
  usuariosController.updateUsuario
);

/**
 * @route PUT /api/usuarios/:id/cambiar-password
 * @desc Cambiar la contraseña de un usuario
 * @access Private (usuario propio o gerentes)
 */
router.put(
  '/:id/cambiar-password',
  [
    check('current_password', 'La contraseña actual es requerida').not().isEmpty(),
    check('password', 'La nueva contraseña debe tener al menos 6 caracteres').isLength({ min: 6 }),
    check('password_confirmation', 'La confirmación de contraseña es requerida').not().isEmpty(),
    validate
  ],
  // Usar auth sin checkRole para permitir que cualquier usuario autenticado pueda acceder
  // La verificación de permisos se realiza en el controlador
  auth,
  usuariosController.cambiarPassword
);

/**
 * @route DELETE /api/usuarios/:id
 * @desc Eliminar un usuario
 * @access Private (solo gerentes)
 */
router.delete('/:id', usuariosController.deleteUsuario);

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
  usuariosController.asignarSucursales
);

module.exports = router;