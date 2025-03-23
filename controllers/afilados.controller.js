const supabase = require('../config/supabase');

/**
 * Registrar nuevo afilado
 * @route POST /api/afilados
 */
function createAfilado(req, res, next) {
  try {
    const { sierra_id, tipo_afilado_id, observaciones, ultimo_afilado } = req.body;

    // Verificar que la sierra existe y no está obsoleta
    supabase
      .from('sierras')
      .select('*, estados_sierra(nombre), sucursal_id')
      .eq('id', sierra_id)
      .single()
      .then(async ({ data: sierra, error: sierraError }) => {
        if (sierraError || !sierra) {
          return res.status(404).json({
            success: false,
            message: 'Sierra no encontrada'
          });
        }

        // Verificar que la sierra no está obsoleta
        if (sierra.estados_sierra.nombre === 'Obsoleto') {
          return res.status(400).json({
            success: false,
            message: 'No se puede afilar una sierra obsoleta'
          });
        }

        // Verificar permisos para la sucursal de la sierra
        if (req.user.roles.nombre === 'Cliente') {
          const { data: permisos } = await supabase
            .from('usuario_sucursal')
            .select('*')
            .eq('usuario_id', req.user.id)
            .eq('sucursal_id', sierra.sucursal_id);
          
          if (!permisos || permisos.length === 0) {
            return res.status(403).json({
              success: false,
              message: 'No tiene permisos para registrar afilados para esta sierra'
            });
          }
        }

        // Verificar tipo de afilado
        const { data: tipoAfilado, error: tipoError } = await supabase
          .from('tipos_afilado')
          .select('*')
          .eq('id', tipo_afilado_id)
          .single();

        if (tipoError || !tipoAfilado) {
          return res.status(404).json({
            success: false,
            message: 'Tipo de afilado no encontrado'
          });
        }

        // Registrar el afilado
        const { data: afilado, error: afiladoError } = await supabase
          .from('afilados')
          .insert([
            {
              sierra_id,
              tipo_afilado_id,
              usuario_id: req.user.id,
              fecha_afilado: new Date().toISOString(), // Usar fecha_afilado en lugar de fecha_entrada
              observaciones,
              ultimo_afilado: ultimo_afilado || false // Valor por defecto si no se proporciona
            }
          ])
          .select()
          .single();

        if (afiladoError) {
          return res.status(400).json({
            success: false,
            message: 'Error al registrar el afilado',
            error: afiladoError.message
          });
        }

        // Si es el último afilado, marcar la sierra como obsoleta
        if (ultimo_afilado) {
          // Obtener el ID del estado "Obsoleto"
          const { data: estadoObsoleto } = await supabase
            .from('estados_sierra')
            .select('id')
            .eq('nombre', 'Obsoleto')
            .single();

          // Actualizar estado de la sierra
          await supabase
            .from('sierras')
            .update({ estado_id: estadoObsoleto.id })
            .eq('id', sierra_id);
        }

        res.status(201).json({
          success: true,
          data: afilado
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
 * Registrar fecha de salida de un afilado
 * @route PUT /api/afilados/:id/salida
 */
function registrarSalida(req, res, next) {
  try {
    const { id } = req.params;

    // Verificar que el afilado existe y no tiene fecha de salida
    supabase
      .from('afilados')
      .select('*, sierras(sucursal_id)')
      .eq('id', id)
      .is('fecha_salida', null)
      .single()
      .then(async ({ data: afilado, error: afiladoError }) => {
        if (afiladoError || !afilado) {
          return res.status(404).json({
            success: false,
            message: 'Afilado no encontrado o ya tiene fecha de salida'
          });
        }

        // Verificar permisos para la sucursal de la sierra
        if (req.user.roles.nombre === 'Cliente') {
          const { data: permisos } = await supabase
            .from('usuario_sucursal')
            .select('*')
            .eq('usuario_id', req.user.id)
            .eq('sucursal_id', afilado.sierras.sucursal_id);
          
          if (!permisos || permisos.length === 0) {
            return res.status(403).json({
              success: false,
              message: 'No tiene permisos para registrar la salida de este afilado'
            });
          }
        }

        // Registrar la fecha de salida
        const { data, error } = await supabase
          .from('afilados')
          .update({ 
            fecha_salida: new Date().toISOString()
            // Ya no incluimos observaciones_salida porque no existe ese campo
          })
          .eq('id', id)
          .select()
          .single();

        if (error) {
          return res.status(400).json({
            success: false,
            message: 'Error al registrar la fecha de salida',
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
  } catch (error) {
    next(error);
  }
}

/**
 * Obtener historial de afilados por sierra
 * @route GET /api/afilados/sierra/:id
 */
function getAfiladosBySierra(req, res, next) {
  try {
    const { id } = req.params;

    // Verificar que la sierra existe
    supabase
      .from('sierras')
      .select('sucursal_id')
      .eq('id', id)
      .single()
      .then(async ({ data: sierra, error: sierraError }) => {
        if (sierraError || !sierra) {
          return res.status(404).json({
            success: false,
            message: 'Sierra no encontrada'
          });
        }

        // Verificar permisos para la sucursal de la sierra
        if (req.user.roles.nombre === 'Cliente') {
          const { data: permisos } = await supabase
            .from('usuario_sucursal')
            .select('*')
            .eq('usuario_id', req.user.id)
            .eq('sucursal_id', sierra.sucursal_id);
          
          if (!permisos || permisos.length === 0) {
            return res.status(403).json({
              success: false,
              message: 'No tiene permisos para ver los afilados de esta sierra'
            });
          }
        }

        // Obtener afilados
        const { data, error } = await supabase
          .from('afilados')
          .select(`
            *,
            tipos_afilado (id, nombre),
            usuarios (id, nombre)
          `)
          .eq('sierra_id', id)
          .order('fecha_entrada', { ascending: false });

        if (error) {
          return res.status(400).json({
            success: false,
            message: 'Error al obtener afilados',
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
  } catch (error) {
    next(error);
  }
}

/**
 * Obtener historial de afilados por sucursal
 * @route GET /api/afilados/sucursal/:id
 */
function getAfiladosBySucursal(req, res, next) {
  try {
    const { id } = req.params;
    const { desde, hasta, pendientes } = req.query;

    // Verificar permisos para la sucursal
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
              message: 'No tiene permisos para ver los afilados de esta sucursal'
            });
          }
          continuarConsulta();
        })
        .catch(error => {
          next(error);
        });
    } else {
      continuarConsulta();
    }

    function continuarConsulta() {
      // Obtener sierras de la sucursal
      supabase
        .from('sierras')
        .select('id')
        .eq('sucursal_id', id)
        .then(({ data: sierras, error: sierrasError }) => {
          if (sierrasError || !sierras || sierras.length === 0) {
            return res.json({
              success: true,
              data: []
            });
          }

          const sierraIds = sierras.map(s => s.id);

          // Construir consulta base
          let query = supabase
            .from('afilados')
            .select(`
              *,
              tipos_afilado (id, nombre),
              usuarios (id, nombre),
              sierras (id, codigo, tipos_sierra(nombre))
            `)
            .in('sierra_id', sierraIds)
            .order('fecha_entrada', { ascending: false });

          // Aplicar filtros
          if (desde) {
            query = query.gte('fecha_entrada', desde);
          }
          
          if (hasta) {
            query = query.lte('fecha_entrada', hasta);
          }
          
          if (pendientes === 'true') {
            query = query.is('fecha_salida', null);
          }
          
          query
            .then(({ data, error }) => {
              if (error) {
                return res.status(400).json({
                  success: false,
                  message: 'Error al obtener afilados',
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
 * Obtener historial de afilados por cliente
 * @route GET /api/afilados/cliente/:id
 */
function getAfiladosByCliente(req, res, next) {
  try {
    const { id } = req.params;
    const { desde, hasta, pendientes } = req.query;

    // Verificar permisos si es cliente
    if (req.user.roles.nombre === 'Cliente') {
      supabase
        .from('usuario_sucursal')
        .select('sucursales(cliente_id)')
        .eq('usuario_id', req.user.id)
        .then(({ data: sucursales }) => {
          const clienteIds = [...new Set(sucursales.map(s => s.sucursales.cliente_id))];
          
          if (!clienteIds.includes(parseInt(id))) {
            return res.status(403).json({
              success: false,
              message: 'No tiene permisos para ver los afilados de este cliente'
            });
          }
          
          continuarConsulta();
        })
        .catch(error => {
          next(error);
        });
    } else {
      continuarConsulta();
    }

    function continuarConsulta() {
      // Obtener sucursales del cliente
      supabase
        .from('sucursales')
        .select('id')
        .eq('cliente_id', id)
        .then(({ data: sucursales, error: sucursalError }) => {
          if (sucursalError || !sucursales || sucursales.length === 0) {
            return res.json({
              success: true,
              data: []
            });
          }

          const sucursalIds = sucursales.map(s => s.id);

          // Obtener sierras de esas sucursales
          supabase
            .from('sierras')
            .select('id')
            .in('sucursal_id', sucursalIds)
            .then(({ data: sierras, error: sierrasError }) => {
              if (sierrasError || !sierras || sierras.length === 0) {
                return res.json({
                  success: true,
                  data: []
                });
              }

              const sierraIds = sierras.map(s => s.id);

              // Construir consulta base
              let query = supabase
                .from('afilados')
                .select(`
                  *,
                  tipos_afilado (id, nombre),
                  usuarios (id, nombre),
                  sierras (id, codigo, sucursal_id, tipos_sierra(nombre), sucursales:sucursales(id, nombre))
                `)
                .in('sierra_id', sierraIds)
                .order('fecha_entrada', { ascending: false });

              // Aplicar filtros
              if (desde) {
                query = query.gte('fecha_entrada', desde);
              }
              
              if (hasta) {
                query = query.lte('fecha_entrada', hasta);
              }
              
              if (pendientes === 'true') {
                query = query.is('fecha_salida', null);
              }
              
              query
                .then(({ data, error }) => {
                  if (error) {
                    return res.status(400).json({
                      success: false,
                      message: 'Error al obtener afilados',
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
 * Obtener afilados pendientes (sin fecha de salida)
 * @route GET /api/afilados/pendientes
 */
function getAfiladosPendientes(req, res, next) {
  try {
    let query = supabase
      .from('afilados')
      .select(`
        *,
        tipos_afilado (id, nombre),
        usuarios (id, nombre),
        sierras (id, codigo, tipos_sierra(nombre), sucursales:sucursales(id, nombre, cliente_id, clientes:clientes(id, nombre)))
      `)
      .is('fecha_salida', null)
      .order('fecha_entrada');
    
    // Si es cliente, filtrar por sus sucursales asignadas
    if (req.user.roles.nombre === 'Cliente') {
      supabase
        .from('usuario_sucursal')
        .select('sucursal_id')
        .eq('usuario_id', req.user.id)
        .then(({ data: sucursalesUser }) => {
          if (!sucursalesUser || sucursalesUser.length === 0) {
            return res.json({
              success: true,
              data: []
            });
          }
          
          const sucursalIds = sucursalesUser.map(s => s.sucursal_id);

          // Obtener sierras de esas sucursales
          supabase
            .from('sierras')
            .select('id')
            .in('sucursal_id', sucursalIds)
            .then(({ data: sierras }) => {
              if (!sierras || sierras.length === 0) {
                return res.json({
                  success: true,
                  data: []
                });
              }
              
              const sierraIds = sierras.map(s => s.id);
              
              supabase
                .from('afilados')
                .select(`
                  *,
                  tipos_afilado (id, nombre),
                  usuarios (id, nombre),
                  sierras (id, codigo, tipos_sierra(nombre), sucursales:sucursales(id, nombre, cliente_id, clientes:clientes(id, nombre)))
                `)
                .is('fecha_salida', null)
                .in('sierra_id', sierraIds)
                .order('fecha_entrada')
                .then(({ data, error }) => {
                  if (error) {
                    return res.status(400).json({
                      success: false,
                      message: 'Error al obtener afilados pendientes',
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
        })
        .catch(error => {
          next(error);
        });
    } else {
      // Para gerentes y administradores mostrar todos los pendientes
      query
        .then(({ data, error }) => {
          if (error) {
            return res.status(400).json({
              success: false,
              message: 'Error al obtener afilados pendientes',
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

// Exportar todas las funciones al final
module.exports = {
  createAfilado,
  registrarSalida,
  getAfiladosBySierra,
  getAfiladosBySucursal,
  getAfiladosByCliente,
  getAfiladosPendientes
};