const supabase = require('../config/supabase');

/**
 * Middleware para verificar JWT token en headers
 */
const auth = async (req, res, next) => {
  try {
    // Obtener el token del header
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Acceso denegado. Token no proporcionado.' 
      });
    }

    // Verificar token con Supabase Auth
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Token inválido o expirado' 
      });
    }

    // Obtener información del usuario desde la base de datos
    const { data: usuario, error: userError } = await supabase
      .from('usuarios')
      .select('*, roles(*)')
      .eq('id', user.id)
      .single();
      
    if (userError || !usuario) {
      console.error('Error al obtener el usuario:', userError);
      return res.status(401).json({ 
        success: false, 
        message: 'Usuario no encontrado o no tiene permisos en el sistema' 
      });
    }

    // Añadir usuario al request para uso posterior
    req.user = usuario;
    req.token = token;
    
    next();
  } catch (error) {
    console.error('Error de autenticación:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error en el servidor de autenticación' 
    });
  }
};

/**
 * Middleware para verificar roles
 * @param {Array} roles - Lista de roles permitidos
 */
const checkRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Acceso denegado. Usuario no autenticado.' 
      });
    }

    const userRole = req.user.roles.nombre;
    
    if (!roles.includes(userRole)) {
      return res.status(403).json({ 
        success: false, 
        message: `Acceso denegado. Se requiere rol(es): ${roles.join(', ')}` 
      });
    }
    
    next();
  };
};

/**
 * Middleware para verificar acceso a sucursal
 */
const checkSucursalAccess = async (req, res, next) => {
  try {
    const sucursalId = req.params.id || req.body.sucursal_id;
    
    if (!sucursalId) {
      return res.status(400).json({
        success: false,
        message: 'ID de sucursal no proporcionado'
      });
    }
    
    // Si es Gerente o Administrador, tiene acceso completo
    if (req.user.roles.nombre === 'Gerente' || req.user.roles.nombre === 'Administrador') {
      return next();
    }
    
    // Para clientes, verificar si tiene acceso a la sucursal
    const { data, error } = await supabase
      .from('usuario_sucursal')
      .select('*')
      .eq('usuario_id', req.user.id)
      .eq('sucursal_id', sucursalId);
    
    if (error) {
      console.error('Error al verificar acceso a sucursal:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al verificar permisos de sucursal'
      });
    }
    
    if (!data || data.length === 0) {
      return res.status(403).json({ 
        success: false, 
        message: 'Acceso denegado. No tiene permiso para esta sucursal.' 
      });
    }
    
    next();
  } catch (error) {
    console.error('Error en middleware de sucursal:', error);
    next(error);
  }
};

module.exports = { auth, checkRole, checkSucursalAccess };