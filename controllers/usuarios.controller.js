const supabase = require('../config/supabase');

/**
 * Obtener todos los usuarios
 * @route GET /api/usuarios
 */
const getUsuarios = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('usuarios')
      .select('*, roles(nombre)')
      .order('id');

    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Error al obtener usuarios',
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
 * Obtener un usuario por ID
 * @route GET /api/usuarios/:id
 */
const getUsuarioById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('usuarios')
      .select('*, roles(nombre)')
      .eq('id', id)
      .single();

    if (error) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado',
        error: error.message
      });
    }

    // Obtener sucursales asignadas al usuario
    const { data: asignaciones, error: sucursalError } = await supabase
      .from('usuario_sucursal')
      .select('sucursal_id, sucursales(id, nombre)')
      .eq('usuario_id', id);

    if (sucursalError) {
      console.error('Error al obtener sucursales del usuario:', sucursalError);
    }

    res.json({
      success: true,
      data: {
        ...data,
        sucursales: asignaciones ? asignaciones.map(a => a.sucursales) : []
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Crear un nuevo usuario
 * @route POST /api/usuarios
 */
const createUsuario = async (req, res, next) => {
  try {
    const { nombre, apellido, email, password, rol_id } = req.body;

    // Verificar que el rol existe
    const { data: rol, error: rolError } = await supabase
      .from('roles')
      .select('id')
      .eq('id', rol_id)
      .single();

    if (rolError || !rol) {
      return res.status(404).json({
        success: false,
        message: 'Rol no encontrado'
      });
    }

    // Crear usuario en Supabase Auth
    let authData;
    try {
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true
      });
      
      if (error) throw error;
      authData = data;
    } catch (authError) {
      return res.status(400).json({
        success: false,
        message: 'Error al crear el usuario en Auth',
        error: authError.message
      });
    }

    // Crear usuario en nuestra tabla usando el mismo ID
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .insert([
          {
            id: authData.user.id, // Usamos el mismo ID que Auth
            nombre,
            apellido,
            email,
            rol_id
          }
        ])
        .select()
        .single();

      if (error) {
        // Si falla, eliminar el usuario de Auth
        try {
          await supabase.auth.admin.deleteUser(authData.user.id);
        } catch (deleteError) {
          console.error('Error al eliminar usuario de Auth tras fallo:', deleteError);
        }
        
        throw error;
      }

      return res.status(201).json({
        success: true,
        data
      });
    } catch (dbError) {
      return res.status(400).json({
        success: false,
        message: 'Error al crear el usuario en la base de datos',
        error: dbError.message
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Actualizar un usuario
 * @route PUT /api/usuarios/:id
 */
const updateUsuario = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { nombre, apellido, email, rol_id } = req.body;

    // Verificar si el usuario existe
    const { data: existingUser, error: findError } = await supabase
      .from('usuarios')
      .select('id')
      .eq('id', id)
      .single();

    if (findError || !existingUser) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado',
        error: findError ? findError.message : 'No existe el usuario'
      });
    }

    // Actualizar email en Auth si ha cambiado
    if (email) {
      try {
        await supabase.auth.admin.updateUserById(id, { // El ID es el mismo en ambos sistemas
          email
        });
      } catch (authError) {
        console.error('Error al actualizar email en Auth:', authError);
      }
    }

    // Actualizar usuario en nuestra tabla
    const { data, error } = await supabase
      .from('usuarios')
      .update({ nombre, apellido, email, rol_id })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Error al actualizar el usuario',
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
 * Eliminar un usuario
 * @route DELETE /api/usuarios/:id
 */
const deleteUsuario = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Verificar si el usuario existe
    const { data: usuario, error: findError } = await supabase
      .from('usuarios')
      .select('id')
      .eq('id', id)
      .single();

    if (findError || !usuario) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado',
        error: findError ? findError.message : 'No existe el usuario'
      });
    }

    // Eliminar relaciones en usuario_sucursal
    try {
      await supabase
        .from('usuario_sucursal')
        .delete()
        .eq('usuario_id', id);
    } catch (relError) {
      console.error('Error al eliminar relaciones de usuario_sucursal:', relError);
    }

    // Eliminar usuario de nuestra tabla
    const { error } = await supabase
      .from('usuarios')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Error al eliminar el usuario',
        error: error.message
      });
    }

    // Eliminar usuario de Auth (usando el mismo ID)
    try {
      await supabase.auth.admin.deleteUser(id);
    } catch (authError) {
      console.error('Error al eliminar usuario de Auth:', authError);
    }

    res.json({
      success: true,
      message: 'Usuario eliminado correctamente'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Asignar sucursales a un usuario
 * @route POST /api/usuarios/:id/sucursales
 */
const asignarSucursales = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { sucursales } = req.body;

    if (!Array.isArray(sucursales)) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere un array de IDs de sucursales'
      });
    }

    // Verificar que el usuario existe
    const { data: usuario, error: userError } = await supabase
      .from('usuarios')
      .select('id')
      .eq('id', id)
      .single();

    if (userError || !usuario) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Eliminar asignaciones actuales
    await supabase
      .from('usuario_sucursal')
      .delete()
      .eq('usuario_id', id);

    // Si el array está vacío, solo eliminamos las asignaciones
    if (sucursales.length === 0) {
      return res.json({
        success: true,
        message: 'Asignaciones de sucursales actualizadas correctamente'
      });
    }

    // Crear nuevas asignaciones
    const asignaciones = sucursales.map(sucursal_id => ({
      usuario_id: id,
      sucursal_id
    }));

    const { error } = await supabase
      .from('usuario_sucursal')
      .insert(asignaciones);

    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Error al asignar sucursales',
        error: error.message
      });
    }

    res.json({
      success: true,
      message: 'Sucursales asignadas correctamente'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUsuarios,
  getUsuarioById,
  createUsuario,
  updateUsuario,
  deleteUsuario,
  asignarSucursales
};