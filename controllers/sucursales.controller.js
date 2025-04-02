const supabase = require('../config/supabase');

/**
 * Obtener todas las sucursales
 * @route GET /api/sucursales
 */
const getSucursales = async (req, res, next) => {
  try {
    let query = supabase
      .from('sucursales')
      .select('*')
      .order('id');
    
    // Si es cliente, solo ver las sucursales asignadas
    if (req.user.roles.nombre === 'Cliente') {
      const { data: sucursalesAsignadas } = await supabase
        .from('usuario_sucursal')
        .select('sucursal_id')
        .eq('usuario_id', req.user.id);
      
      if (sucursalesAsignadas && sucursalesAsignadas.length > 0) {
        const sucursalIds = sucursalesAsignadas.map(s => s.sucursal_id);
        query = query.in('id', sucursalIds);
      } else {
        // Si no tiene sucursales asignadas, no mostrar ninguna
        return res.json({
          success: true,
          data: []
        });
      }
    }
    
    const { data: sucursales, error } = await query;

    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Error al obtener sucursales',
        error: error.message
      });
    }

    // Si no hay sucursales, devolver array vacío
    if (!sucursales || sucursales.length === 0) {
      return res.json({
        success: true,
        data: []
      });
    }

    // Obtener información de clientes en una consulta separada
    const clienteIds = [...new Set(sucursales.map(s => s.cliente_id))];
    
    const { data: clientes, error: clientesError } = await supabase
      .from('clientes')
      .select('id, nombre')
      .in('id', clienteIds);

    if (clientesError) {
      // Continuamos aunque no podamos obtener los clientes
    }

    // Crear un mapa de clientes por ID para facilitar el acceso
    const clientesMap = {};
    if (clientes) {
      clientes.forEach(cliente => {
        clientesMap[cliente.id] = cliente;
      });
    }

    // Enriquecer los datos de sucursales con la información de clientes
    const enrichedSucursales = sucursales.map(sucursal => ({
      ...sucursal,
      clientes: clientesMap[sucursal.cliente_id] || { id: sucursal.cliente_id, nombre: 'Desconocido' }
    }));

    res.json({
      success: true,
      data: enrichedSucursales
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtener una sucursal por ID
 * @route GET /api/sucursales/:id
 */
const getSucursalById = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Verificar permisos si es Cliente
    if (req.user.roles.nombre === 'Cliente') {
      const { data: permisos, error: permisosError } = await supabase
        .from('usuario_sucursal')
        .select('*')
        .eq('usuario_id', req.user.id)
        .eq('sucursal_id', id);
      
      if (permisosError || !permisos || permisos.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'No tiene permisos para ver esta sucursal'
        });
      }
    }

    // Consulta simplificada para obtener solo la sucursal
    const { data: sucursal, error } = await supabase
      .from('sucursales')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return res.status(404).json({
        success: false,
        message: 'Sucursal no encontrada',
        error: error.message
      });
    }

    // Obtener cliente relacionado en una consulta separada
    let cliente = null;
    if (sucursal.cliente_id) {
      const { data: clienteData, error: clienteError } = await supabase
        .from('clientes')
        .select('*')
        .eq('id', sucursal.cliente_id)
        .single();
        
      if (!clienteError) {
        cliente = clienteData;
      }
    }

    // Combinar datos
    const sucursalCompleta = {
      ...sucursal,
      cliente: cliente
    };

    res.json({
      success: true,
      data: sucursalCompleta
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Crear una nueva sucursal
 * @route POST /api/sucursales
 */
const createSucursal = async (req, res, next) => {
  try {
    const { nombre, direccion, telefono, cliente_id } = req.body;

    // Verificar que el cliente existe
    const { data: cliente, error: clienteError } = await supabase
      .from('clientes')
      .select('id')
      .eq('id', cliente_id)
      .single();

    if (clienteError || !cliente) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }

    const { data, error } = await supabase
      .from('sucursales')
      .insert([
        { nombre, direccion, telefono, cliente_id }
      ])
      .select()
      .single();

    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Error al crear la sucursal',
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
 * Actualizar una sucursal
 * @route PUT /api/sucursales/:id
 */
const updateSucursal = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { nombre, direccion, telefono, cliente_id } = req.body;

    // Verificar que la sucursal existe
    const { data: sucursal, error: sucursalError } = await supabase
      .from('sucursales')
      .select('id')
      .eq('id', id)
      .single();

    if (sucursalError || !sucursal) {
      return res.status(404).json({
        success: false,
        message: 'Sucursal no encontrada'
      });
    }

    // Si se está actualizando el cliente, verificar que existe
    if (cliente_id) {
      const { data: cliente, error: clienteError } = await supabase
        .from('clientes')
        .select('id')
        .eq('id', cliente_id)
        .single();

      if (clienteError || !cliente) {
        return res.status(404).json({
          success: false,
          message: 'Cliente no encontrado'
        });
      }
    }

    const { data, error } = await supabase
      .from('sucursales')
      .update({ nombre, direccion, telefono, cliente_id })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Error al actualizar la sucursal',
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
 * Eliminar una sucursal
 * @route DELETE /api/sucursales/:id
 */
const deleteSucursal = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Verificar si la sucursal tiene sierras
    const { data: sierras } = await supabase
      .from('sierras')
      .select('id')
      .eq('sucursal_id', id);

    if (sierras && sierras.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'No se puede eliminar la sucursal porque tiene sierras asociadas'
      });
    }

    // Eliminar relaciones en usuario_sucursal
    await supabase
      .from('usuario_sucursal')
      .delete()
      .eq('sucursal_id', id);

    // Eliminar sucursal
    const { error } = await supabase
      .from('sucursales')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Error al eliminar la sucursal',
        error: error.message
      });
    }

    res.json({
      success: true,
      message: 'Sucursal eliminada correctamente'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtener sucursales por cliente
 * @route GET /api/clientes/:id/sucursales
 */
const getSucursalesByCliente = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    let query = supabase
      .from('sucursales')
      .select('*')
      .eq('cliente_id', id)
      .order('nombre');
    
    // Si es cliente, filtrar por sucursales asignadas
    if (req.user.roles.nombre === 'Cliente') {
      const { data: sucursalesAsignadas } = await supabase
        .from('usuario_sucursal')
        .select('sucursal_id')
        .eq('usuario_id', req.user.id);
      
      if (sucursalesAsignadas && sucursalesAsignadas.length > 0) {
        const sucursalIds = sucursalesAsignadas.map(s => s.sucursal_id);
        query = query.in('id', sucursalIds);
      } else {
        // Si no tiene sucursales asignadas, no mostrar ninguna
        return res.json({
          success: true,
          data: []
        });
      }
    }
    
    const { data, error } = await query;

    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Error al obtener sucursales del cliente',
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
 * Obtener sucursales vinculadas al usuario actual
 * @route GET /api/sucursales/vinculadas
 */
const getSucursalesVinculadas = async (req, res, next) => {
  try {
    // Obtener el ID del usuario del token
    const userId = req.user.id;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'No se pudo identificar al usuario'
      });
    }
    
    // Buscar las entradas en usuario_sucursal
    const { data: usuarioSucursales, error: usuarioSucursalError } = await supabase
      .from('usuario_sucursal')
      .select('sucursal_id')
      .eq('usuario_id', userId);
    
    if (usuarioSucursalError) {
      return res.status(400).json({
        success: false,
        message: 'Error al obtener relaciones usuario-sucursal',
        error: usuarioSucursalError.message
      });
    }
    
    // Si no hay relaciones, devolver array vacío
    if (!usuarioSucursales || usuarioSucursales.length === 0) {
      return res.json({
        success: true,
        data: []
      });
    }
    
    // Extraer los IDs de sucursales
    const sucursalIds = usuarioSucursales.map(us => us.sucursal_id);
    
    // Obtener las sucursales completas
    const { data: sucursales, error: sucursalError } = await supabase
      .from('sucursales')
      .select('*, clientes(*)')
      .in('id', sucursalIds);
    
    if (sucursalError) {
      return res.status(400).json({
        success: false,
        message: 'Error al obtener sucursales',
        error: sucursalError.message
      });
    }
    
    res.json({
      success: true,
      data: sucursales
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSucursales,
  getSucursalById,
  createSucursal,
  updateSucursal,
  deleteSucursal,
  getSucursalesByCliente,
  getSucursalesVinculadas
};