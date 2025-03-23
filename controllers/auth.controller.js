const supabase = require('../config/supabase');

/**
 * Iniciar sesión
 * @route POST /api/auth/login
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Autenticar con Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError) {
      console.log('Error en autenticación:', authError.message);
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }
    
    if (!authData || !authData.user || !authData.session) {
      return res.status(401).json({
        success: false,
        message: 'Error en el inicio de sesión'
      });
    }
    
    // Obtener información del usuario
    const { data: usuario, error: userError } = await supabase
      .from('usuarios')
      .select('*, roles(*)')
      .eq('id', authData.user.id)
      .single();

    if (userError) {
      console.error('Error al obtener usuario:', userError.message);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener información del usuario'
      });
    }

    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado en el sistema'
      });
    }

    // Obtener sucursales asignadas si es Cliente
    let sucursalesAsignadas = [];
    if (usuario.roles.nombre === 'Cliente') {
      const { data: sucursales, error: sucursalError } = await supabase
        .from('usuario_sucursal')
        .select('sucursal_id')
        .eq('usuario_id', usuario.id);

      if (sucursalError) {
        console.error('Error al obtener sucursales asignadas:', sucursalError.message);
      } else if (sucursales && sucursales.length > 0) {
        sucursalesAsignadas = sucursales.map(s => s.sucursal_id);
      }
    }

    // Responder con token y datos del usuario
    res.json({
      success: true,
      data: {
        usuario: {
          id: usuario.id,
          nombre: usuario.nombre,
          email: usuario.email,
          rol: usuario.roles.nombre
        },
        sucursalesAsignadas,
        token: authData.session.access_token
      }
    });
  } catch (error) {
    console.error('Error en login:', error);
    next(error);
  }
};

/**
 * Registrar nuevo usuario
 * @route POST /api/auth/register
 */
const register = async (req, res, next) => {
  try {
    const { nombre, email, password, rol_id } = req.body;

    // Verificar que el rol existe
    const { data: rol, error: rolError } = await supabase
      .from('roles')
      .select('nombre')
      .eq('id', rol_id)
      .single();

    if (rolError || !rol) {
      return res.status(400).json({
        success: false,
        message: 'El rol especificado no existe o no es válido'
      });
    }

    // Crear usuario en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password
    });

    if (authError) {
      console.error('Error al crear usuario en Auth:', authError.message);
      return res.status(400).json({
        success: false,
        message: 'Error al crear el usuario',
        error: authError.message
      });
    }

    if (!authData || !authData.user) {
      return res.status(500).json({
        success: false,
        message: 'Error al crear el usuario en Auth'
      });
    }

    // Crear usuario en nuestra tabla de usuarios
    const { data: usuario, error: userError } = await supabase
      .from('usuarios')
      .insert([
        {
          id: authData.user.id,
          nombre,
          email,
          rol_id
        }
      ])
      .select()
      .single();

    if (userError) {
      // Si falla, intentar eliminar el usuario de Auth
      try {
        await supabase.auth.admin.deleteUser(authData.user.id);
      } catch (deleteError) {
        console.error('Error al eliminar usuario de Auth tras fallo:', deleteError);
      }
      
      return res.status(400).json({
        success: false,
        message: 'Error al registrar el usuario en la base de datos',
        error: userError.message
      });
    }

    res.status(201).json({
      success: true,
      data: {
        message: 'Usuario registrado correctamente',
        usuario: {
          id: usuario.id,
          nombre: usuario.nombre,
          email: usuario.email,
          rol: rol.nombre
        }
      }
    });
  } catch (error) {
    console.error('Error en register:', error);
    next(error);
  }
};

/**
 * Obtener perfil del usuario
 * @route GET /api/auth/profile
 */
const getProfile = async (req, res, next) => {
  try {
    // El usuario ya está en req.user gracias al middleware de autenticación
    const usuario = req.user;

    // Obtener sucursales asignadas si es Cliente
    let sucursalesAsignadas = [];
    if (usuario.roles.nombre === 'Cliente') {
      const { data: sucursales, error: sucursalError } = await supabase
        .from('usuario_sucursal')
        .select('sucursales(*)')
        .eq('usuario_id', usuario.id);

      if (sucursalError) {
        console.error('Error al obtener sucursales del perfil:', sucursalError);
      } else if (sucursales && sucursales.length > 0) {
        sucursalesAsignadas = sucursales.map(s => s.sucursales);
      }
    }

    res.json({
      success: true,
      data: {
        usuario: {
          id: usuario.id,
          nombre: usuario.nombre,
          email: usuario.email,
          rol: usuario.roles.nombre
        },
        sucursalesAsignadas
      }
    });
  } catch (error) {
    console.error('Error en getProfile:', error);
    next(error);
  }
};

module.exports = {
  login,
  register,
  getProfile
};