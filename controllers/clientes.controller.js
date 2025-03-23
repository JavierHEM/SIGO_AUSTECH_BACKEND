const supabase = require('../config/supabase');

/**
 * Obtener todos los clientes
 * @route GET /api/clientes
 */
const getClientes = async (req, res, next) => {
  try {
    let query = supabase
      .from('clientes')
      .select('*')
      .order('id');
    
    // Si es cliente, solo ver los clientes asociados a sus sucursales
    if (req.user.roles.nombre === 'Cliente') {
      const { data: sucursales } = await supabase
        .from('usuario_sucursal')
        .select('sucursales(cliente_id)')
        .eq('usuario_id', req.user.id);
      
      if (sucursales && sucursales.length > 0) {
        const clienteIds = [...new Set(sucursales.map(s => s.sucursales.cliente_id))];
        query = query.in('id', clienteIds);
      } else {
        // Si no tiene sucursales asignadas, no mostrar ningún cliente
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
        message: 'Error al obtener clientes',
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
 * Obtener un cliente por ID
 * @route GET /api/clientes/:id
 */
const getClienteById = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Verificar permisos si es Cliente
    if (req.user.roles.nombre === 'Cliente') {
      const { data: sucursales } = await supabase
        .from('usuario_sucursal')
        .select('sucursales(cliente_id)')
        .eq('usuario_id', req.user.id);
      
      const clienteIds = sucursales.map(s => s.sucursales.cliente_id);
      
      if (!clienteIds.includes(parseInt(id))) {
        return res.status(403).json({
          success: false,
          message: 'No tiene permisos para ver este cliente'
        });
      }
    }

    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado',
        error: error.message
      });
    }

    // Obtener sucursales del cliente
    const { data: sucursales, error: sucursalError } = await supabase
      .from('sucursales')
      .select('*')
      .eq('cliente_id', id);

    if (sucursalError) {
      console.error('Error al obtener sucursales del cliente:', sucursalError);
    }

    res.json({
      success: true,
      data: {
        ...data,
        sucursales: sucursales || []
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Crear un nuevo cliente
 * @route POST /api/clientes
 */
const createCliente = async (req, res, next) => {
  try {
    const { razon_social, rut, direccion, telefono, email } = req.body;

    const { data, error } = await supabase
      .from('clientes')
      .insert([
        { razon_social, rut, direccion, telefono, email }
      ])
      .select()
      .single();

    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Error al crear el cliente',
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
 * Actualizar un cliente
 * @route PUT /api/clientes/:id
 */
const updateCliente = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { razon_social, rut, direccion, telefono, email } = req.body;

    const { data, error } = await supabase
      .from('clientes')
      .update({ razon_social, rut, direccion, telefono, email })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Error al actualizar el cliente',
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
 * Eliminar un cliente
 * @route DELETE /api/clientes/:id
 */
const deleteCliente = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Verificar si el cliente tiene sucursales
    const { data: sucursales } = await supabase
      .from('sucursales')
      .select('id')
      .eq('cliente_id', id);

    if (sucursales && sucursales.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'No se puede eliminar el cliente porque tiene sucursales asociadas'
      });
    }

    const { error } = await supabase
      .from('clientes')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Error al eliminar el cliente',
        error: error.message
      });
    }

    res.json({
      success: true,
      message: 'Cliente eliminado correctamente'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getClientes,
  getClienteById,
  createCliente,
  updateCliente,
  deleteCliente
};