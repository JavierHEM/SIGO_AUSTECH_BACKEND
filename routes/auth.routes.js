const express = require('express');
const { check } = require('express-validator');
const router = express.Router();
const { login, register, getProfile } = require('../controllers/auth.controller');
const { auth, checkRole } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validation.middleware');

/**
 * @route POST /api/auth/login
 * @desc Iniciar sesión
 * @access Public
 */
router.post(
  '/login',
  [
    check('email', 'Por favor incluye un email válido').isEmail(),
    check('password', 'La contraseña es requerida').not().isEmpty(),
    validate
  ],
  login
);

/**
 * @route POST /api/auth/register
 * @desc Registrar un nuevo usuario
 * @access Private (solo administradores o gerentes)
 */
router.post(
  '/register',
  [
    auth,
    checkRole(['Gerente', 'Administrador']),
    check('nombre', 'El nombre es requerido').not().isEmpty(),
    check('email', 'Por favor incluye un email válido').isEmail(),
    check('password', 'La contraseña debe tener al menos 6 caracteres').isLength({ min: 6 }),
    check('rol_id', 'El rol es requerido').isNumeric(),
    validate
  ],
  register
);

/**
 * @route GET /api/auth/profile
 * @desc Obtener perfil del usuario autenticado
 * @access Private
 */
router.get('/profile', auth, getProfile);

module.exports = router;