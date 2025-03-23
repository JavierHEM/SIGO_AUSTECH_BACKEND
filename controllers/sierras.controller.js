const supabase = require('../config/supabase');

/**
 * Buscar sierra por código
 * @route GET /api/sierras?codigo=XXX
 */
function getSierraByCodigo(req, res, next) {
  try {
    const { codigo } = req.query;
    
    if (!codigo) {
      return res.status(400).json({
        success: false,
        message: 'El código de sierra es requerido'
      });
    }

    supabase
      .from('sierras')
      .select(`
        *,
        tipos_sierra (id, nombre),
        estados_sierra (id, nombre),
        sucursales (id, nombre, cliente_id, clientes:clientes (id, nombre))
      `)
      .eq('codigo_barra', codigo)  // CAMBIO: Usar codigo_barra en lugar de codigo
      .single()
      .then(async ({ data, error }) => {
        if (error) {
          // Si no se encuentra, devolver un mensaje específico
          if (error.code === 'PGRST116') {
            return res.status(404).json({
              success: false,
              message: 'Sierra no encontrada con ese código'
            });
          }
          
          return res.status(400).json({
            success: false,
            message: 'Error al buscar la sierra',
            error: error.message
          });
        }

        // Si es cliente, verificar acceso a la sucursal
        if (req.user.roles.nombre === 'Cliente') {
          const { data: permisos } = await supabase
            .from('usuario_sucursal')
            .select('*')
            .eq('usuario_id', req.user.id)
            .eq('sucursal_id', data.sucursal_id);
          
          if (!permisos || permisos.length === 0) {
            return res.status(403).json({
              success: false,
              message: 'No tiene permisos para ver esta sierra'
            });
          }
        }
        
        // Obtener el historial de afilados de la sierra
        const { data: afilados, error: afiladosError } = await supabase
          .from('afilados')
          .select('*, tipos_afilado(nombre)')
          .eq('sierra_id', data.id)
          .order('fecha_entrada', { ascending: false });
        
        if (afiladosError) {
          console.error('Error al obtener historial de afilados:', afiladosError);
        }

        res.json({
          success: true,
          data: {
            ...data,
            afilados: afilados || []
          }
        });
      })
      .catch(error => {
        next(error);
      });
  } catch (error) {
    next(error);
  }
}

/**
 * Obtener sierras por sucursal
 * @route GET /api/sierras/sucursal/:id
 */
function getSierrasBySucursal(req, res, next) {
  try {
    const { id } = req.params;
    
    // Si es cliente, verificar acceso a la sucursal
    if (req.user.roles.nombre === 'Cliente') {
      supabase
        .from('usuario_sucursal')
        .select('*')
        .eq('usuario_id', req.user.id)
        .eq('sucursal_id', id)
        .then(({ data: permisos }) => {
          if (!permisos || permisos.length === 0) {
            return res.status(403).json({
              success: false,
              message: 'No tiene permisos para ver sierras de esta sucursal'
            });
          }
          
          // Si tiene permisos, continuar con la consulta
          obtenerSierrasPorSucursal();
        })
        .catch(error => {
          next(error);
        });
    } else {
      // Si es gerente o administrador, continuar directamente
      obtenerSierrasPorSucursal();
    }
    
    function obtenerSierrasPorSucursal() {
      supabase
        .from('sierras')
        .select(`
          *,
          tipos_sierra (id, nombre),
          estados_sierra (id, nombre)
        `)
        .eq('sucursal_id', id)
        .order('codigo_barra')  // CAMBIO: Usar codigo_barra en lugar de codigo
        .then(({ data, error }) => {
          if (error) {
            return res.status(400).json({
              success: false,
              message: 'Error al obtener sierras',
              error: error.message
            });
          }

          res.json({
            success: true,
            data
          });
        })
        .catch(error => {
          next(error);
        });
    }
  } catch (error) {
    next(error);
  }
}

/**
 * Obtener sierras por cliente
 * @route GET /api/sierras/cliente/:id
 */
function getSierrasByCliente(req, res, next) {
  try {
    const { id } = req.params;
    
    // Si es cliente, verificar que el cliente corresponda a sus sucursales asignadas
    if (req.user.roles.nombre === 'Cliente') {
      supabase
        .from('usuario_sucursal')
        .select('sucursales(cliente_id)')
        .eq('usuario_id', req.user.id)
        .then(({ data: sucursales }) => {
          if (!sucursales || sucursales.length === 0) {
            return res.status(403).json({
              success: false,
              message: 'No tiene permisos para ver sierras de ningún cliente'
            });
          }
          
          const clienteIds = [...new Set(sucursales
            .filter(s => s.sucursales && s.sucursales.cliente_id)
            .map(s => s.sucursales.cliente_id))];
          
          if (!clienteIds.includes(parseInt(id))) {
            return res.status(403).json({
              success: false,
              message: 'No tiene permisos para ver sierras de este cliente'
            });
          }
          
          // Si tiene permisos, continuar con la consulta
          obtenerSierrasPorCliente();
        })
        .catch(error => {
          next(error);
        });
    } else {
      // Si es gerente o administrador, continuar directamente
      obtenerSierrasPorCliente();
    }
    
    function obtenerSierrasPorCliente() {
      // Obtener sucursales del cliente
      supabase
        .from('sucursales')
        .select('id')
        .eq('cliente_id', id)
        .then(({ data: sucursales, error: sucursalError }) => {
          if (sucursalError || !sucursales || sucursales.length === 0) {
            return res.status(404).json({
              success: false,
              message: 'Cliente no encontrado o sin sucursales'
            });
          }

          const sucursalIds = sucursales.map(s => s.id);

          // Obtener sierras de esas sucursales
          supabase
            .from('sierras')
            .select(`
              *,
              tipos_sierra (id, nombre),
              estados_sierra (id, nombre),
              sucursales (id, nombre)
            `)
            .in('sucursal_id', sucursalIds)
            .order('codigo')
            .then(({ data, error }) => {
              if (error) {
                return res.status(400).json({
                  success: false,
                  message: 'Error al obtener sierras',
                  error: error.message
                });
              }

              res.json({
                success: true,
                data
              });
            })
            .catch(error => {
              next(error);
            });
        })
        .catch(error => {
          next(error);
        });
    }
  } catch (error) {
    next(error);
  }
}

/**
 * Crear nueva sierra
 * @route POST /api/sierras
 */
function createSierra(req, res, next) {
  try {
    const { codigo, sucursal_id, tipo_sierra_id } = req.body;

    // Verificar que la sucursal existe
    supabase
      .from('sucursales')
      .select('*')
      .eq('id', sucursal_id)
      .single()
      .then(async ({ data: sucursal, error: sucursalError }) => {
        if (sucursalError || !sucursal) {
          return res.status(404).json({
            success: false,
            message: 'Sucursal no encontrada'
          });
        }

        // Verificar si el usuario tiene acceso a la sucursal
        if (req.user.roles.nombre === 'Cliente') {
          const { data: permisos, error: permisosError } = await supabase
            .from('usuario_sucursal')
            .select('*')
            .eq('usuario_id', req.user.id)
            .eq('sucursal_id', sucursal_id);
          
          if (permisosError || !permisos || permisos.length === 0) {
            return res.status(403).json({
              success: false,
              message: 'No tiene permisos para crear sierras en esta sucursal'
            });
          }
        }
        
        // Verificar que el tipo de sierra existe
        const { data: tipoSierra, error: tipoError } = await supabase
          .from('tipos_sierra')
          .select('*')
          .eq('id', tipo_sierra_id)
          .single();

        if (tipoError || !tipoSierra) {
          return res.status(404).json({
            success: false,
            message: 'Tipo de sierra no encontrado'
          });
        }

        // Verificar que el código no exista ya
        if (codigo) {
          const { data: existente, error: existenteError } = await supabase
            .from('sierras')
            .select('id')
            .eq('codigo_barra', codigo);

          if (!existenteError && existente && existente.length > 0) {
            return res.status(400).json({
              success: false,
              message: 'Ya existe una sierra con ese código'
            });
          }
        }

        // Obtener el ID del estado "En uso"
        const { data: estado, error: estadoError } = await supabase
          .from('estados_sierra')
          .select('id')
          .eq('nombre', 'En uso')
          .single();
          
        if (estadoError || !estado) {
          return res.status(500).json({
            success: false,
            message: 'Error al obtener el estado "En uso"'
          });
        }

        // Crear la sierra
        const { data, error } = await supabase
          .from('sierras')
          .insert([
            {
              codigo_barra: codigo,
              sucursal_id,
              tipo_sierra_id,
              estado_id: estado.id,
              // fecha_registro se asignará automáticamente con el valor por defecto CURRENT_DATE
              // activo se asignará automáticamente como TRUE por defecto
            }
          ])
          .select()
          .single();

        if (error) {
          return res.status(400).json({
            success: false,
            message: 'Error al crear la sierra',
            error: error.message
          });
        }

        res.status(201).json({
          success: true,
          data
        });
      })
      .catch(error => {
        next(error);
      });
  } catch (error) {
    next(error);
  }
}

/**
 * Actualizar sierra
 * @route PUT /api/sierras/:id
 */
function updateSierra(req, res, next) {
  try {
    const { id } = req.params;
    const { codigo, sucursal_id, tipo_sierra_id, estado_id, activo } = req.body;

    // Verificar que la sierra existe
    supabase
      .from('sierras')
      .select('*')
      .eq('id', id)
      .single()
      .then(async ({ data: sierra, error: sierraError }) => {
        if (sierraError || !sierra) {
          return res.status(404).json({
            success: false,
            message: 'Sierra no encontrada'
          });
        }

        // Si es cliente, verificar permisos para la sucursal actual
        if (req.user.roles.nombre === 'Cliente') {
          const { data: permisos, error: permisosError } = await supabase
            .from('usuario_sucursal')
            .select('*')
            .eq('usuario_id', req.user.id)
            .eq('sucursal_id', sierra.sucursal_id);
          
          if (permisosError || !permisos || permisos.length === 0) {
            return res.status(403).json({
              success: false,
              message: 'No tiene permisos para modificar esta sierra'
            });
          }
        }

        let verificaciones = Promise.resolve();

        // Si se está cambiando de sucursal, verificar que existe y permisos
        if (sucursal_id && sucursal_id !== sierra.sucursal_id) {
          verificaciones = verificaciones.then(async () => {
            const { data: sucursal, error: sucursalError } = await supabase
              .from('sucursales')
              .select('*')
              .eq('id', sucursal_id)
              .single();

            if (sucursalError || !sucursal) {
              throw new Error('Sucursal no encontrada');
            }

            // Verificar permisos para la nueva sucursal
            if (req.user.roles.nombre === 'Cliente') {
              const { data: permisos, error: permisosError } = await supabase
                .from('usuario_sucursal')
                .select('*')
                .eq('usuario_id', req.user.id)
                .eq('sucursal_id', sucursal_id);
              
              if (permisosError || !permisos || permisos.length === 0) {
                throw new Error('No tiene permisos para asignar la sierra a esta sucursal');
              }
            }
          });
        }

        // Si se está cambiando el código, verificar que no exista ya
        if (codigo && codigo !== sierra.codigo_barra) {
          verificaciones = verificaciones.then(async () => {
            const { data: existente, error: existenteError } = await supabase
              .from('sierras')
              .select('id')
              .eq('codigo_barra', codigo)
              .neq('id', id);

            if (!existenteError && existente && existente.length > 0) {
              throw new Error('Ya existe otra sierra con ese código');
            }
          });
        }

        // Verificar que el tipo de sierra existe si se está cambiando
        if (tipo_sierra_id && tipo_sierra_id !== sierra.tipo_sierra_id) {
          verificaciones = verificaciones.then(async () => {
            const { data, error } = await supabase
              .from('tipos_sierra')
              .select('id')
              .eq('id', tipo_sierra_id)
              .single();

            if (error || !data) {
              throw new Error('Tipo de sierra no encontrado');
            }
          });
        }

        // Verificar que el estado existe si se está cambiando
        if (estado_id && estado_id !== sierra.estado_id) {
          verificaciones = verificaciones.then(async () => {
            const { data, error } = await supabase
              .from('estados_sierra')
              .select('id')
              .eq('id', estado_id)
              .single();

            if (error || !data) {
              throw new Error('Estado de sierra no encontrado');
            }
          });
        }

        // Realizar todas las verificaciones y luego actualizar
        verificaciones
          .then(async () => {
            // Construir objeto de actualización con los campos modificados
            const updateData = {};
            
            if (codigo) updateData.codigo_barra = codigo;
            if (sucursal_id) updateData.sucursal_id = sucursal_id;
            if (tipo_sierra_id) updateData.tipo_sierra_id = tipo_sierra_id;
            if (estado_id) updateData.estado_id = estado_id;
            if (activo !== undefined) updateData.activo = activo;
            
            const { data, error } = await supabase
              .from('sierras')
              .update(updateData)
              .eq('id', id)
              .select()
              .single();

            if (error) {
              return res.status(400).json({
                success: false,
                message: 'Error al actualizar la sierra',
                error: error.message
              });
            }

            res.json({
              success: true,
              data
            });
          })
          .catch(error => {
            return res.status(400).json({
              success: false,
              message: error.message
            });
          });
      })
      .catch(error => {
        next(error);
      });
  } catch (error) {
    next(error);
  }
}

// Exportar todas las funciones
module.exports = {
  getSierraByCodigo,
  getSierrasBySucursal,
  getSierrasByCliente,
  createSierra,
  updateSierra
};