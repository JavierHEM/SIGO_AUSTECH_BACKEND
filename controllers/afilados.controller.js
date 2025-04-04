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
              fecha_afilado: new Date().toISOString(), // Usar fecha_afilado
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
          .order('fecha_afilado', { ascending: false });

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
              sierras (id, codigo_barra, tipos_sierra(nombre))
            `)
            .in('sierra_id', sierraIds)
            .order('fecha_afilado', { ascending: false });

          // Aplicar filtros
          if (desde) {
            query = query.gte('fecha_afilado', desde);
          }
          
          if (hasta) {
            query = query.lte('fecha_afilado', hasta);
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
          // ... código existente ...

          const sucursalIds = sucursales.map(s => s.id);

          // Obtener sierras de esas sucursales
          supabase
            .from('sierras')
            .select('id, fecha_registro') // Asegúrate de incluir fecha_registro aquí
            .in('sucursal_id', sucursalIds)
            .then(({ data: sierras, error: sierrasError }) => {
              // ... código existente ...

              const sierraIds = sierras.map(s => s.id);
              
              // Crear un mapa de fechas de registro de sierras
              const sierrasFechasMap = {};
              sierras.forEach(sierra => {
                sierrasFechasMap[sierra.id] = sierra.fecha_registro;
              });

              // Construir consulta base
              let query = supabase
                .from('afilados')
                .select(`
                  *,
                  tipos_afilado (id, nombre),
                  usuarios (id, nombre),
                  sierras (id, codigo_barra, sucursal_id, tipos_sierra(nombre), sucursales:sucursales(id, nombre))
                `)
                .in('sierra_id', sierraIds)
                .order('fecha_afilado', { ascending: false });

              // Aplicar filtros
              // ... código existente para filtros ...
              
              query
                .then(({ data, error }) => {
                  if (error) {
                    return res.status(400).json({
                      success: false,
                      message: 'Error al obtener afilados',
                      error: error.message
                    });
                  }

                  // Añadir la fecha_registro a cada afilado
                  const dataConFechaRegistro = data.map(afilado => ({
                    ...afilado,
                    sierra_fecha_registro: sierrasFechasMap[afilado.sierra_id]
                  }));

                  res.json({
                    success: true,
                    data: dataConFechaRegistro
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
    // Si es cliente, filtrar por sus sucursales asignadas
    if (req.user.roles.nombre === 'Cliente') {
      // Primero, obtener las sucursales del usuario
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
              
              // Consulta simplificada de afilados pendientes
              supabase
                .from('afilados')
                .select(`
                  *,
                  tipos_afilado(id, nombre),
                  usuarios(id, nombre)
                `)
                .is('fecha_salida', null)
                .in('sierra_id', sierraIds)
                .order('fecha_afilado')
                .then(async ({ data, error }) => {
                  if (error) {
                    return res.status(400).json({
                      success: false,
                      message: 'Error al obtener afilados pendientes',
                      error: error.message
                    });
                  }

                  // Ahora, enriquecemos los datos obteniendo la información adicional por separado
                  const enrichedData = await enrichAfiladosData(data);

                  res.json({
                    success: true,
                    data: enrichedData
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
      // Para gerentes y administradores, consulta simplificada
      supabase
        .from('afilados')
        .select(`
          *,
          tipos_afilado(id, nombre),
          usuarios(id, nombre)
        `)
        .is('fecha_salida', null)
        .order('fecha_afilado')
        .then(async ({ data, error }) => {
          if (error) {
            return res.status(400).json({
              success: false,
              message: 'Error al obtener afilados pendientes',
              error: error.message
            });
          }

          // Enriquecer datos con información adicional
          const enrichedData = await enrichAfiladosData(data);

          res.json({
            success: true,
            data: enrichedData
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

// Función auxiliar para enriquecer los datos de afilados con información de sierra, sucursal y cliente
async function enrichAfiladosData(afilados) {
  if (!afilados || afilados.length === 0) return [];

  // Obtener los IDs de sierras
  const sierraIds = [...new Set(afilados.map(a => a.sierra_id))];

  // Obtener información de sierras
  const { data: sierras } = await supabase
    .from('sierras')
    .select('id, codigo_barra, sucursal_id, tipo_sierra_id')
    .in('id', sierraIds);

  // Mapear sierras por ID para fácil acceso
  const sierrasMap = {};
  sierras.forEach(sierra => {
    sierrasMap[sierra.id] = sierra;
  });

  // Obtener tipos de sierra
  const tipoSierraIds = [...new Set(sierras.map(s => s.tipo_sierra_id))];
  const { data: tiposSierra } = await supabase
    .from('tipos_sierra')
    .select('id, nombre')
    .in('id', tipoSierraIds);

  // Mapear tipos de sierra por ID
  const tiposSierraMap = {};
  tiposSierra.forEach(tipo => {
    tiposSierraMap[tipo.id] = tipo;
  });

  // Obtener sucursales
  const sucursalIds = [...new Set(sierras.map(s => s.sucursal_id))];
  const { data: sucursales } = await supabase
    .from('sucursales')
    .select('id, nombre, cliente_id')
    .in('id', sucursalIds);

  // Mapear sucursales por ID
  const sucursalesMap = {};
  sucursales.forEach(sucursal => {
    sucursalesMap[sucursal.id] = sucursal;
  });

  // Obtener clientes
  const clienteIds = [...new Set(sucursales.map(s => s.cliente_id))];
  const { data: clientes } = await supabase
    .from('clientes')
    .select('id, nombre')
    .in('id', clienteIds);

  // Mapear clientes por ID
  const clientesMap = {};
  clientes.forEach(cliente => {
    clientesMap[cliente.id] = cliente;
  });

  // Construir la respuesta enriquecida
  return afilados.map(afilado => {
    const sierra = sierrasMap[afilado.sierra_id] || {};
    const tipoSierra = sierra.tipo_sierra_id ? tiposSierraMap[sierra.tipo_sierra_id] || {} : {};
    const sucursal = sierra.sucursal_id ? sucursalesMap[sierra.sucursal_id] || {} : {};
    const cliente = sucursal.cliente_id ? clientesMap[sucursal.cliente_id] || {} : {};

    return {
      ...afilado,
      sierras: {
        id: sierra.id,
        codigo_barra: sierra.codigo_barra,
        tipos_sierra: tipoSierra,
        sucursales: {
          id: sucursal.id,
          nombre: sucursal.nombre,
          cliente_id: sucursal.cliente_id,
          clientes: {
            id: cliente.id,
            nombre: cliente.nombre
          }
        }
      }
    };
  });
}

/**
 * Obtener un afilado por ID
 * @route GET /api/afilados/:id
 */
function getAfiladoById(req, res, next) {
  try {
    const { id } = req.params;
    const numericId = parseInt(id, 10);
    
    if (isNaN(numericId)) {
      return res.status(400).json({
        success: false,
        message: 'El ID del afilado debe ser un número válido'
      });
    }
    
    // Obtener el afilado con su información relacionada
    supabase
      .from('afilados')
      .select('*')
      .eq('id', numericId)
      .single()
      .then(async ({ data: afilado, error }) => {
        if (error) {
          return res.status(404).json({
            success: false,
            message: 'Afilado no encontrado'
          });
        }
        
        if (!afilado) {
          return res.status(404).json({
            success: false,
            message: 'Afilado no encontrado'
          });
        }
        
        // Verificar permisos solo si es usuario Cliente
        if (req.user.roles && req.user.roles.nombre === 'Cliente') {
          // Obtener la sierra para verificar la sucursal
          const { data: sierra } = await supabase
            .from('sierras')
            .select('sucursal_id')
            .eq('id', afilado.sierra_id)
            .single();
            
          if (sierra) {
            // Verificar si el usuario tiene acceso a esa sucursal
            const { data: permisos } = await supabase
              .from('usuario_sucursal')
              .select('*')
              .eq('usuario_id', req.user.id)
              .eq('sucursal_id', sierra.sucursal_id);
              
            if (!permisos || permisos.length === 0) {
              return res.status(403).json({
                success: false,
                message: 'No tiene permisos para ver este afilado'
              });
            }
          }
        }
        
        // Obtener datos relacionados
        const { data: tipoAfilado } = await supabase
          .from('tipos_afilado')
          .select('id, nombre')
          .eq('id', afilado.tipo_afilado_id)
          .single();
          
        const { data: usuario } = await supabase
          .from('usuarios')
          .select('id, nombre')
          .eq('id', afilado.usuario_id)
          .single();
          
        const { data: sierra } = await supabase
          .from('sierras')
          .select('id, codigo_barra, sucursal_id, tipo_sierra_id')
          .eq('id', afilado.sierra_id)
          .single();
          
        let sucursal = null;
        let cliente = null;
        let tipoSierra = null;
        
        if (sierra) {
          // Obtener tipo de sierra
          const { data: tipoData } = await supabase
            .from('tipos_sierra')
            .select('id, nombre')
            .eq('id', sierra.tipo_sierra_id)
            .single();
            
          tipoSierra = tipoData;
          
          // Obtener sucursal
          const { data: sucursalData } = await supabase
            .from('sucursales')
            .select('id, nombre, cliente_id')
            .eq('id', sierra.sucursal_id)
            .single();
            
          sucursal = sucursalData;
          
          // Obtener cliente
          if (sucursal && sucursal.cliente_id) {
            const { data: clienteData } = await supabase
              .from('clientes')
              .select('id, razon_social')
              .eq('id', sucursal.cliente_id)
              .single();
              
            cliente = clienteData;
          }
        }
        
        // Construir respuesta enriquecida
        const afiladoCompleto = {
          ...afilado,
          tipos_afilado: tipoAfilado || {},
          usuarios: usuario || {},
          sierras: sierra ? {
            ...sierra,
            tipos_sierra: tipoSierra || {},
            sucursales: sucursal ? {
              ...sucursal,
              clientes: cliente || {}
            } : {}
          } : {}
        };
        
        res.json({
          success: true,
          data: afiladoCompleto
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
 * Obtener todos los afilados (filtrado según rol)
 * @route GET /api/afilados/todos
 */
function getAllAfilados(req, res, next) {
  try {
    // Parámetros para filtrado opcional
    const { desde, hasta, pendientes, sucursal_id, cliente_id } = req.query;
    
    // Si es cliente, filtrar por sus sucursales asignadas
    if (req.user.roles.nombre === 'Cliente') {
      // Obtener las sucursales del usuario
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
              
              // Consulta de afilados básica
              let query = supabase
                .from('afilados')
                .select(`
                  *,
                  tipos_afilado(id, nombre),
                  usuarios(id, nombre)
                `)
                .in('sierra_id', sierraIds)
                .order('fecha_afilado', { ascending: false });
              
              // Aplicar filtros adicionales
              applyFilters(query, desde, hasta, pendientes)
                .then(async ({ data, error }) => {
                  if (error) {
                    return res.status(400).json({
                      success: false,
                      message: 'Error al obtener afilados',
                      error: error.message
                    });
                  }

                  // Enriquecer los datos
                  const enrichedData = await enrichAfiladosData(data);

                  res.json({
                    success: true,
                    data: enrichedData
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
      // Para gerentes y administradores, consulta sin restricción de sucursales
      let query = supabase
        .from('afilados')
        .select(`
          *,
          tipos_afilado(id, nombre),
          usuarios(id, nombre)
        `)
        .order('fecha_afilado', { ascending: false });
      
      // Filtrar por sucursal si se especifica
      if (sucursal_id) {
        query = query.in('sierra_id', function(subQuery) {
          return subQuery.from('sierras').select('id').eq('sucursal_id', sucursal_id);
        });
      }
      
      // Filtrar por cliente si se especifica
      if (cliente_id) {
        query = query.in('sierra_id', function(subQuery) {
          return subQuery
            .from('sierras')
            .select('id')
            .in('sucursal_id', function(subSubQuery) {
              return subSubQuery.from('sucursales').select('id').eq('cliente_id', cliente_id);
            });
        });
      }
      
      // Aplicar otros filtros
      applyFilters(query, desde, hasta, pendientes)
        .then(async ({ data, error }) => {
          if (error) {
            return res.status(400).json({
              success: false,
              message: 'Error al obtener afilados',
              error: error.message
            });
          }

          // Enriquecer los datos
          const enrichedData = await enrichAfiladosData(data);

          res.json({
            success: true,
            data: enrichedData
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

// Función auxiliar para aplicar filtros comunes
async function applyFilters(query, desde, hasta, pendientes) {
  if (desde) {
    query = query.gte('fecha_afilado', desde);
  }
  
  if (hasta) {
    query = query.lte('fecha_afilado', hasta);
  }
  
  if (pendientes === 'true') {
    query = query.is('fecha_salida', null);
  }
  
  return await query;
}

/**
 * Registrar fecha de salida para múltiples afilados
 * @route POST /api/afilados/salida-masiva
 */
function registrarSalidaMasiva(req, res, next) {
  try {
    const { afilado_ids } = req.body;
    
    // Validar que se recibió un array de IDs
    if (!Array.isArray(afilado_ids) || afilado_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere un array no vacío de IDs de afilados'
      });
    }
    
    // Obtener los afilados para verificar permisos
    supabase
      .from('afilados')
      .select('id, sierra_id, fecha_salida, sierras(sucursal_id)')
      .in('id', afilado_ids)
      .is('fecha_salida', null)
      .then(async ({ data: afilados, error: afiladosError }) => {
        if (afiladosError) {
          return res.status(400).json({
            success: false,
            message: 'Error al obtener los afilados',
            error: afiladosError.message
          });
        }
        
        // Verificar que se encontraron afilados pendientes
        if (!afilados || afilados.length === 0) {
          return res.status(404).json({
            success: false,
            message: 'No se encontraron afilados pendientes con los IDs proporcionados'
          });
        }
        
        // Verificar permisos para cada afilado si el usuario es Cliente
        if (req.user.roles.nombre === 'Cliente') {
          // Obtener todas las sucursales del usuario
          const { data: sucursalesUser } = await supabase
            .from('usuario_sucursal')
            .select('sucursal_id')
            .eq('usuario_id', req.user.id);
            
          const sucursalIds = sucursalesUser.map(s => s.sucursal_id);
          
          // Verificar que el usuario tiene acceso a todas las sucursales de los afilados
          for (const afilado of afilados) {
            if (!sucursalIds.includes(afilado.sierras.sucursal_id)) {
              return res.status(403).json({
                success: false,
                message: `No tiene permisos para registrar la salida del afilado ID ${afilado.id}`
              });
            }
          }
        }
        
        // Todos los afilados son accesibles, actualizar fecha de salida
        const fechaActual = new Date().toISOString();
        const { data: updated, error: updateError } = await supabase
          .from('afilados')
          .update({ fecha_salida: fechaActual })
          .in('id', afilado_ids)
          .is('fecha_salida', null);
          
        if (updateError) {
          return res.status(400).json({
            success: false,
            message: 'Error al actualizar los afilados',
            error: updateError.message
          });
        }
        
        // Consultar los afilados actualizados para devolverlos en la respuesta
        const { data: afiladosActualizados } = await supabase
          .from('afilados')
          .select('*')
          .in('id', afilado_ids);
        
        res.json({
          success: true,
          message: `Se registró la salida de ${afilados.length} afilados`,
          data: afiladosActualizados || []
        });
      })
      .catch(error => {
        next(error);
      });
  } catch (error) {
    next(error);
  }
}

// Función auxiliar para enriquecer los datos
async function enrichAfiladosData(afilados) {
  if (!afilados || afilados.length === 0) return [];

  // Obtener los IDs de sierras
  const sierraIds = [...new Set(afilados.map(a => a.sierra_id))];

  // Obtener información de sierras
  const { data: sierras } = await supabase
    .from('sierras')
    .select('id, codigo_barra, sucursal_id, tipo_sierra_id')
    .in('id', sierraIds);

  // Mapear sierras por ID
  const sierrasMap = {};
  if (sierras) {
    sierras.forEach(sierra => {
      sierrasMap[sierra.id] = sierra;
    });
  }

  // Obtener tipos de sierra
  const tipoSierraIds = sierras ? [...new Set(sierras.filter(s => s.tipo_sierra_id).map(s => s.tipo_sierra_id))] : [];
  const { data: tiposSierra } = await supabase
    .from('tipos_sierra')
    .select('id, nombre')
    .in('id', tipoSierraIds);

  // Mapear tipos de sierra por ID
  const tiposSierraMap = {};
  if (tiposSierra) {
    tiposSierra.forEach(tipo => {
      tiposSierraMap[tipo.id] = tipo;
    });
  }

  // Obtener sucursales
  const sucursalIds = sierras ? [...new Set(sierras.filter(s => s.sucursal_id).map(s => s.sucursal_id))] : [];
  const { data: sucursales } = await supabase
    .from('sucursales')
    .select('id, nombre, cliente_id')
    .in('id', sucursalIds);

  // Mapear sucursales por ID
  const sucursalesMap = {};
  if (sucursales) {
    sucursales.forEach(sucursal => {
      sucursalesMap[sucursal.id] = sucursal;
    });
  }

  // Obtener clientes
  const clienteIds = sucursales ? [...new Set(sucursales.filter(s => s.cliente_id).map(s => s.cliente_id))] : [];
  const { data: clientes } = await supabase
    .from('clientes')
    .select('id, nombre')
    .in('id', clienteIds);

  // Mapear clientes por ID
  const clientesMap = {};
  if (clientes) {
    clientes.forEach(cliente => {
      clientesMap[cliente.id] = cliente;
    });
  }

  // Construir la respuesta enriquecida
  return afilados.map(afilado => {
    const sierra = sierrasMap[afilado.sierra_id] || {};
    const tipoSierra = sierra.tipo_sierra_id ? tiposSierraMap[sierra.tipo_sierra_id] || {} : {};
    const sucursal = sierra.sucursal_id ? sucursalesMap[sierra.sucursal_id] || {} : {};
    const cliente = sucursal.cliente_id ? clientesMap[sucursal.cliente_id] || {} : {};

    return {
      ...afilado,
      sierras: {
        id: sierra.id,
        codigo_barra: sierra.codigo_barra,
        tipos_sierra: tipoSierra,
        sucursales: {
          id: sucursal.id,
          nombre: sucursal.nombre,
          cliente_id: sucursal.cliente_id,
          clientes: {
            id: cliente.id,
            nombre: cliente.nombre
          }
        }
      }
    };
  });
}

/**
 * Marca múltiples afilados como "último afilado" en una sola operación
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 * @param {Function} next - Función para pasar al siguiente middleware
 */
const marcarUltimoAfiladoMasivo = async (req, res, next) => {
  try {
    // Verificar que el usuario tiene rol de Gerente o Administrador
    if (req.user.roles.nombre !== 'Gerente' && req.user.roles.nombre !== 'Administrador') {
      return res.status(403).json({
        success: false,
        message: 'Solo los usuarios con rol de Gerente o Administrador pueden realizar esta operación'
      });
    }

    const { afiladoIds } = req.body;
    
    // Validar que se hayan proporcionado IDs
    if (!afiladoIds || !Array.isArray(afiladoIds) || afiladoIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Debe proporcionar un array válido de IDs de afilado'
      });
    }
    
    // Registrar la acción en logs para auditoría
    console.log(`Usuario ${req.user.id} (${req.user.nombre || req.user.email}) ha solicitado marcar como último afilado los registros con IDs:`, afiladoIds);
    
    // Obtener todos los afilados en una sola consulta para validar que existan
    const { data: afilados, error: afiladosError } = await supabase
      .from('afilados')
      .select('id, sierra_id, ultimo_afilado')
      .in('id', afiladoIds);
    
    if (afiladosError) {
      console.error("Error al obtener afilados:", afiladosError);
      return res.status(500).json({
        success: false,
        message: 'Error al consultar afilados',
        error: afiladosError.message
      });
    }
    
    if (!afilados || afilados.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No se encontraron afilados con los IDs proporcionados'
      });
    }
    
    // Validar que todos los afilados existan
    if (afilados.length !== afiladoIds.length) {
      const afiladosEncontrados = afilados.map(a => a.id);
      const noEncontrados = afiladoIds.filter(id => !afiladosEncontrados.includes(id));
      
      return res.status(400).json({
        success: false,
        message: `No se encontraron algunos afilados: ${noEncontrados.join(', ')}`
      });
    }
    
    // Verificar si algún afilado ya está marcado como último afilado
    const yaUltimoAfilado = afilados.filter(afilado => afilado.ultimo_afilado);
    
    if (yaUltimoAfilado.length > 0) {
      const afiladosYaMarcados = yaUltimoAfilado.map(a => a.id).join(', ');
      
      return res.status(400).json({
        success: false,
        message: `Algunos afilados ya están marcados como último afilado: ${afiladosYaMarcados}`
      });
    }
    
    // Obtener lista de todas las sierras involucradas
    const sierraIds = [...new Set(afilados.map(a => a.sierra_id))];
    
    // Actualizar todos los afilados
    const { data: updateResult, error: updateError } = await supabase
      .from('afilados')
      .update({
        ultimo_afilado: true,
        updated_at: new Date().toISOString()
      })
      .in('id', afiladoIds);
    
    if (updateError) {
      console.error("Error al actualizar afilados:", updateError);
      return res.status(500).json({
        success: false,
        message: 'Error al actualizar afilados',
        error: updateError.message
      });
    }
    
    // Opcional: Registrar la acción en la tabla de bitácora si existe
    try {
      await supabase
        .from('bitacora')
        .insert([{
          usuario_id: req.user.id,
          accion: 'AFILADO_ULTIMO_AFILADO_MASIVO',
          tabla: 'afilados',
          descripcion: `Marcó ${afiladoIds.length} afilado(s) como último afilado`,
          detalles: JSON.stringify({ afiladoIds, sierraIds }),
          fecha: new Date().toISOString()
        }]);
    } catch (bitacoraError) {
      // Si hay error al registrar en bitácora, solo lo registramos pero no afecta la respuesta
      console.warn("Error al registrar en bitácora:", bitacoraError);
    }
    
    return res.status(200).json({
      success: true,
      message: `Se han marcado ${afiladoIds.length} afilado(s) como último afilado correctamente.`,
      data: {
        actualizados: afiladoIds.length,
        afiladoIds,
        sierraIds
      }
    });
    
  } catch (error) {
    console.error('Error en marcarUltimoAfiladoMasivo:', error);
    next(error);
  }
};

// Exportar todas las funciones al final
module.exports = {
  createAfilado,
  registrarSalida,
  getAfiladosBySierra,
  getAfiladosBySucursal,
  getAfiladosByCliente,
  getAfiladosPendientes,
  getAllAfilados,
  getAfiladoById,
  registrarSalidaMasiva,
  marcarUltimoAfiladoMasivo
};