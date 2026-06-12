# =====================================================================
# NÚCLEO ADMIN FRONT: eliminar components y services del dominio educativo
# Ejecutar en la RAÍZ del clon del frontend Angular (donde está src\).
# Uso:  .\nucleo_03_borrar_front.ps1            -> simulacro (no borra)
#       .\nucleo_03_borrar_front.ps1 -Ejecutar  -> borra de verdad
# =====================================================================
param([switch]$Ejecutar)
$base = "src"

# Carpetas completas de componentes del dominio
$carpetas = @(
  "app\components\academico",
  "app\components\asistencia",
  "app\components\calificacion",
  "app\components\casas-docentes",
  "app\components\clases-ia",
  "app\components\docentes",
  "app\components\estudiantes",
  "app\components\servicios",
  "app\components\administracion\datos-estudiantes",
  "app\components\administracion\gestion-medidas",
  "app\components\administracion\menus",
  "app\components\administracion\productos-academico",
  "app\components\administracion\reglas-cobro-automatico",
  "app\components\operaciones\actualizacion-datos-estudiantes",
  "app\components\operaciones\asignacion-onces",
  "app\components\operaciones\disponibilidad-cocina",
  "app\components\operaciones\entrega-alimentacion",
  "app\components\operaciones\evaluacion-desarrollo",
  "app\components\operaciones\galerias",
  "app\components\operaciones\inscripcion-cursos-extra",
  "app\components\operaciones\recordatorio-pagos",
  "app\components\operaciones\recordatorios-generales",
  "app\components\operaciones\registro-medidas",
  "app\components\operaciones\registro-observaciones-informe",
  "app\components\operaciones\seguimiento-asistencia",
  "app\components\reportes\alimentacion",
  "app\components\reportes\calificaciones-estudiante-detalle",
  "app\components\reportes\calificaciones-sprint-estudiantes",
  "app\components\reportes\consultar-calificaciones-pdm-x-estudiante",
  "app\components\reportes\consultar-calificaciones-pdm-x-estudiantes",
  "app\components\reportes\consultar-calificaciones-tareas-sprint",
  "app\components\reportes\dashboard-gerencial",
  "app\components\reportes\historial-actividades",
  "app\components\reportes\monitoreo-sprint",
  "app\components\reportes\reporte-asistencia",
  "app\components\reportes\reporte-cobertura-curricular",
  "app\components\reportes\reporte-cobros",
  "app\components\reportes\reporte-cursos-extra",
  "app\components\reportes\reporte-ejecucion-tareas",
  "app\components\reportes\reporte-estudiantes",
  "app\components\reportes\reporte-malla-curricular",
  "app\components\reportes\reporte-reportes-pago",
  "app\components\reportes\reportes-academicos-estudiante",
  "app\components\reportes\tamizajes"
)

# Services individuales del dominio
$services = @(
  "app\services\actividades-academicas-x-indicadores-logros.service.ts",
  "app\services\actividades-academicas.service.ts",
  "app\services\acudientes.service.ts",
  "app\services\alimentacion.service.ts",
  "app\services\ambientes.service.ts",
  "app\services\area-academica-x-grupo.service.ts",
  "app\services\areas-academicas.service.ts",
  "app\services\asignacion-onces.service.ts",
  "app\services\asistencia-estudiantes.service.ts",
  "app\services\autorizados-recoger-historial.service.ts",
  "app\services\autorizados-recoger.service.ts",
  "app\services\calificacion-context.service.ts",
  "app\services\calificaciones.service.ts",
  "app\services\casas-docentes.service.ts",
  "app\services\categorias-medidas.service.ts",
  "app\services\clasificacion-menus.service.ts",
  "app\services\cobros-automaticos-historial.service.ts",
  "app\services\cocina-disponibilidad.service.ts",
  "app\services\competencias-cognitivas.service.ts",
  "app\services\contratos-matricula-valores.service.ts",
  "app\services\contratos-matricula.service.ts",
  "app\services\convenios-estudiante.service.ts",
  "app\services\cortes-academicos.service.ts",
  "app\services\cuentas-cobrar-x-curso-extra.service.ts",
  "app\services\cursos-extra.service.ts",
  "app\services\dashboard-gerencial.service.ts",
  "app\services\datos-adicionales-x-estudiante.service.ts",
  "app\services\datos-medicos-x-estudiante.service.ts",
  "app\services\dias-x-sprint.service.ts",
  "app\services\docentes-x-cursos-extra.service.ts",
  "app\services\docentes.service.ts",
  "app\services\ead3-evaluaciones.service.ts",
  "app\services\ead3-items.service.ts",
  "app\services\ead3-rangos-edad.service.ts",
  "app\services\ead3-tablas-conversion.service.ts",
  "app\services\ejes-curriculares.service.ts",
  "app\services\entrega-alimentacion.service.ts",
  "app\services\esferas-desarrollo.service.ts",
  "app\services\estados-tareas.service.ts",
  "app\services\estandares-basicos.service.ts",
  "app\services\estudiantes-x-cursos-extra.service.ts",
  "app\services\estudiantes.service.ts",
  "app\services\exportar-pdf-contrato.service.ts",
  "app\services\exportar-pdf-ead3.service.ts",
  "app\services\exportar-pdf-evaluacion.service.ts",
  "app\services\exportar-pdf-malla-curricular.service.ts",
  "app\services\exportar-pdf-observaciones.service.ts",
  "app\services\galeria-imagenes.service.ts",
  "app\services\galerias-x-grupos.service.ts",
  "app\services\galerias.service.ts",
  "app\services\gini.service.ts",
  "app\services\grados-x-grupo.service.ts",
  "app\services\grados.service.ts",
  "app\services\grupos.service.ts",
  "app\services\historial-informes-estudiantes.service.ts",
  "app\services\historial-recordatorios-asistencia.service.ts",
  "app\services\historial-recordatorios-generales.service.ts",
  "app\services\historial-recordatorios-pago.service.ts",
  "app\services\horarios-alimentacion.service.ts",
  "app\services\horarios-cursos-extra.service.ts",
  "app\services\horarios-estudiante.service.ts",
  "app\services\horarios.service.ts",
  "app\services\ia-cobertura-curricular.service.ts",
  "app\services\ia-maquina-actividades.service.ts",
  "app\services\indicadores-logros.service.ts",
  "app\services\informe-estudiante.service.ts",
  "app\services\items-menu.service.ts",
  "app\services\logros.service.ts",
  "app\services\materiales-x-actividad.service.ts",
  "app\services\medidas-x-estudiante.service.ts",
  "app\services\medidas.service.ts",
  "app\services\menu-minutas.service.ts",
  "app\services\menus.service.ts",
  "app\services\motor-cobros-automaticos.service.ts",
  "app\services\objetivos-academicos.service.ts",
  "app\services\observaciones-estudiantes.service.ts",
  "app\services\onces-personas.service.ts",
  "app\services\onces.service.ts",
  "app\services\parametros-calificaciones.service.ts",
  "app\services\porciones.service.ts",
  "app\services\productos-academico.service.ts",
  "app\services\proveedores-x-cursos-extra.service.ts",
  "app\services\reglas-cobro-automatico.service.ts",
  "app\services\reportes-pago.service.ts",
  "app\services\servicios-faltantes.service.ts",
  "app\services\servicios-jardin.service.ts",
  "app\services\sprints.service.ts",
  "app\services\tareas-x-sprints-x-estudiante.service.ts",
  "app\services\tareas-x-sprints.service.ts",
  "app\services\tarifas-cursos-extra.service.ts",
  "app\services\tarifas-grupos.service.ts",
  "app\services\tipos-actividades-academicas.service.ts",
  "app\services\tipos-acudiente.service.ts",
  "app\services\tipos-autorizacion-recoger.service.ts",
  "app\services\tipos-evento-cobro.service.ts",
  "app\services\tipos-importancia-servicio-faltante.service.ts",
  "app\services\tipos-necesidades-especiales.service.ts",
  "app\services\tipos-observaciones-estudiantes.service.ts",
  "app\services\tipos-producto-academico.service.ts",
  "app\services\unidades-medidas-corporales.service.ts",
  "app\services\valores-medidas.service.ts",
  "app\services\valores-parametros-calificaciones.service.ts",
  "app\services\visitas-ninos-necesidades.service.ts",
  "app\services\visitas-ninos.service.ts",
  "app\services\visitas-servicios-gustaron.service.ts",
  "app\services\visitas-servicios-no-tenemos.service.ts"
)

$borrados = 0; $faltantes = 0
foreach ($c in $carpetas) {
  $ruta = Join-Path $base $c
  if (Test-Path $ruta) {
    if ($Ejecutar) { Remove-Item $ruta -Recurse -Force; Write-Host "BORRADA CARPETA  $ruta" -ForegroundColor Red }
    else           { Write-Host "[simulacro] borraria CARPETA  $ruta" -ForegroundColor Yellow }
    $borrados++
  } else { Write-Host "NO EXISTE $ruta" -ForegroundColor DarkGray; $faltantes++ }
}
foreach ($s in $services) {
  $ruta = Join-Path $base $s
  if (Test-Path $ruta) {
    if ($Ejecutar) { Remove-Item $ruta -Force; Write-Host "BORRADO  $ruta" -ForegroundColor Red }
    else           { Write-Host "[simulacro] borraria  $ruta" -ForegroundColor Yellow }
    $borrados++
  } else { Write-Host "NO EXISTE $ruta" -ForegroundColor DarkGray; $faltantes++ }
}
Write-Host ""
if ($Ejecutar) { Write-Host "Eliminados: $borrados | No encontrados: $faltantes" -ForegroundColor Cyan }
else { Write-Host "SIMULACRO: $borrados elementos a borrar ($faltantes no encontrados). Ejecuta con -Ejecutar para aplicar." -ForegroundColor Cyan }