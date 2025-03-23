const express = require('express');
const { check } = require('express-validator');
const router = express.Router();
const {
  getTiposSierra,
  getTiposAfilado,
  getEstadosSierra,
  getRoles,
  createTipoSierra,  
  updateTipoSierra   
} = require('../controllers/catalogos.controller');
const { auth, checkRole } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validation.middleware');

// Middleware para todas las rutas
router.use(auth);

/**
 * @route GET /api/catalogos/tipos-sierra
 * @desc Obtener tipos de sierra
 * @access Private
 */
router.get('/tipos-sierra', getTiposSierra);

/**
 * @route GET /api/catalogos/tipos-afilado
 * @desc Obtener tipos de afilado
 * @access Private
 */
router.get('/tipos-afilado', getTiposAfilado);

/**
 * @route GET /api/catalogos/estados-sierra
 * @desc Obtener estados de sierra
 * @access Private
 */
router.get('/estados-sierra', getEstadosSierra);

/**
 * @route GET /api/catalogos/roles
 * @desc Obtener roles de usuario
 * @access Private (solo gerentes)
 */
router.get('/roles', checkRole(['Gerente']), getRoles);

router.post(
  '/tipos-sierra',
  [
    checkRole(['Gerente', 'Administrador']),
    check('nombre', 'El nombre es requerido').not().isEmpty(),
    validate
  ],
  createTipoSierra
);

router.put(
  '/tipos-sierra/:id',
  [
    checkRole(['Gerente', 'Administrador']),
    check('nombre', 'El nombre es requerido').not().isEmpty(),
    validate
  ],
  updateTipoSierra
);



module.exports = router;