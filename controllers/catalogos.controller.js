const supabase = require('../config/supabase');

/**
 * Obtener tipos de sierra
 * @route GET /api/catalogos/tipos-sierra
 */
const getTiposSierra = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('tipos_sierra')
      .select('*')
      .order('nombre');

    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Error al obtener tipos de sierra',
        error: error.message
      });
    }

    res.json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtener tipos de afilado
 * @route GET /api/catalogos/tipos-afilado
 */
const getTiposAfilado = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('tipos_afilado')
      .select('*')
      .order('nombre');

    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Error al obtener tipos de afilado',
        error: error.message
      });
    }

    res.json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtener estados de sierra
 * @route GET /api/catalogos/estados-sierra
 */
const getEstadosSierra = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('estados_sierra')
      .select('*')
      .order('nombre');

    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Error al obtener estados de sierra',
        error: error.message
      });
    }

    res.json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtener roles de usuario
 * @route GET /api/catalogos/roles
 */
const getRoles = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('roles')
      .select('*')
      .order('nombre');

    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Error al obtener roles',
        error: error.message
      });
    }

    res.json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};

const createTipoSierra = async (req, res, next) => {
  try {
    const { nombre, descripcion } = req.body;
    
    // Validar datos de entrada
    if (!nombre) {
      return res.status(400).json({
        success: false,
        message: 'El nombre del tipo de sierra es requerido'
      });
    }
    
    // Crear tipo de sierra
    const { data, error } = await supabase
      .from('tipos_sierra')
      .insert([
        { 
          nombre, 
          descripcion,
          activo: true
        }
      ])
      .select()
      .single();
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Error al crear tipo de sierra',
        error: error.message
      });
    }
    
    res.status(201).json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Actualizar un tipo de sierra
 * @route PUT /api/catalogos/tipos-sierra/:id
 */
const updateTipoSierra = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, activo } = req.body;
    
    // Actualizar tipo de sierra
    const { data, error } = await supabase
      .from('tipos_sierra')
      .update({ 
        nombre, 
        descripcion,
        activo: activo !== undefined ? activo : true
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Error al actualizar tipo de sierra',
        error: error.message
      });
    }
    
    res.json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTiposSierra,
  getTiposAfilado,
  getEstadosSierra,
  getRoles,
  createTipoSierra,  
  updateTipoSierra 
};