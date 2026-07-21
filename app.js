// =================================================================
// CONFIGURACIÓN: Pega aquí la URL de tu implementación de Apps Script
// =================================================================
const BASE_URL = "https://script.googleusercontent.com/macros/echo?user_content_key=AUkAhnS5ydNIBa378kGHadBvMJQGkX4tpo3HDnsLfruJVkjMMW2CFl4K2dMgcfFZm3KfNpwPDzQD1SzVM7u91H4t2V3SorWBrVJQDsrT6LGpzE6LBKW_tgGzbXOoS0r6MvcLgW0lVM8ijhqBTw387y-QFyw5Ks9Xce6__YHIWQWx2bdvcLMexA_0c7YEC2qXAGZndjooRfVHx3NVoM7M_s8KFIQiBP7LBpKPo9bbBAZPbuCcpSJ9Z72kZsp6OA_ov4_SVps99OgjMMJrBYd8c-uMNJYXFYP91g&lib=MOv1oNJU2jx4MIDAtiS68U2pk9y82Axy2";

// Variables globales para el control de la inspección
let preguntasData = [];
let areasData = [];
const respuestasUsuario = {};

// Elementos de la interfaz (Pantallas)
const pantallaInicio = document.getElementById('pantalla-inicio');
const pantallaFormulario = document.getElementById('pantalla-formulario');
const pantallaExito = document.getElementById('pantalla-exxito');
const loadingOverlay = document.getElementById('loading-overlay');

// =================================================================
// 1. CARGA INICIAL: Traer Áreas y Preguntas desde Google Sheets
// =================================================================
document.addEventListener('DOMContentLoaded', async () => {
  // Establecer la fecha de hoy por defecto en el selector
  document.getElementById('fecha').valueAsDate = new Date();
  
  mostrarCargando(true);
  try {
    const response = await fetch(BASE_URL);
    const data = await response.json();
    
    if (data.error) throw new Error(data.error);
    
    areasData = data.areas;
    preguntasData = data.preguntas;
    
    // Rellenar el selector de áreas en la pantalla de inicio
    const selectArea = document.getElementById('area');
    selectArea.innerHTML = '<option value="">-- Selecciona un Área --</option>';
    areasData.forEach(area => {
      const option = document.createElement('option');
      option.value = area.nombreArea;
      option.textContent = area.nombreArea;
      selectArea.appendChild(option);
    });
    
    // Activar botón de inicio si todo cargó bien
    document.getElementById('btn-comenzar').disabled = false;
    document.getElementById('btn-comenzar').innerHTML = 'Comenzar Inspección <i class="fa-solid fa-arrow-right"></i>';
    
  } catch (error) {
    alert("Error al conectar con Google Sheets: " + error.message);
    document.getElementById('btn-comenzar').innerText = "Error de conexión";
  } finally {
    mostrarCargando(false);
  }
});

// =================================================================
// 2. LÓGICA DE INICIO Y RENDERIZADO DEL FORMULARIO
// =================================================================
document.getElementById('btn-comenzar').addEventListener('click', () => {
  const fecha = document.getElementById('fecha').value;
  const inspector = document.getElementById('inspector').value.trim();
  const area = document.getElementById('area').value;
  
  if (!fecha || !inspector || !area) {
    alert("Por favor, completa todos los datos iniciales.");
    return;
  }
  
  // Actualizar textos de la interfaz
  document.getElementById('active-area-name').textContent = area;
  
  // Construir el formulario dinámico basado en las preguntas activas
  construirFormulario(area);
  
  // Cambiar de pantalla
  pantallaInicio.classList.add('hidden');
  pantallaFormulario.classList.remove('hidden');
  window.scrollTo(0, 0);
});

function construirFormulario(areaSeleccionada) {
  const contenedor = document.getElementById('contenedor-preguntas');
  contenedor.innerHTML = "";
  
  // Filtrar preguntas que aplican a esta área (o a "Todas")
  const preguntasFiltradas = preguntasData.filter(p => {
    const aplicaA = p.areaAplica.toString();
    
    // Si el criterio aplica a "Todas", lo incluimos directamente
    if (aplicaA.trim().toLowerCase() === "todas") return true;
    
    // Dividimos las áreas por coma, limpiamos los espacios y verificamos si el área seleccionada está en la lista
    const listaAreas = aplicaA.split(',').map(area => area.trim());
    return listaAreas.includes(areaSeleccionada);
  });
  
  // Agrupar preguntas por Categoría
  const categorias = {};
  preguntasFiltradas.forEach(p => {
    if (!categorias[p.categoria]) categorias[p.categoria] = [];
    categorias[p.categoria].push(p);
  });
  
  // Crear el HTML para cada bloque de categoría (Estructura tipo bloque móvil)
  for (const [nombreCat, preguntas] of Object.entries(categorias)) {
    const catBlock = document.createElement('div');
    catBlock.className = 'categoria-block card';
    catBlock.innerHTML = `<h3 class="categoria-titulo">${nombreCat}</h3>`;
    
    preguntas.forEach(p => {
      // Inicializar respuesta en vacío por defecto
      respuestasUsuario[p.idPregunta] = { resultado: "N/A", observaciones: "" };
      
      const pregItem = document.createElement('div');
      pregItem.className = 'pregunta-item';
      pregItem.innerHTML = `
        <p class="pregunta-texto"><strong>${p.idPregunta}:</strong> ${p.criterio}</p>
        <div class="btn-group-eval">
          <button type="button" class="btn-eval c" onclick="evaluar('${p.idPregunta}', '1', this)">C</button>
          <button type="button" class="btn-eval nc" onclick="evaluar('${p.idPregunta}', '0', this)">NC</button>
          <button type="button" class="btn-eval na active" onclick="evaluar('${p.idPregunta}', 'N/A', this)">N/A</button>
        </div>
        <div id="obs-container-${p.idPregunta}" class="obs-container hidden">
          <textarea placeholder="Escribe el hallazgo / observación aquí..." oninput="guardarObs('${p.idPregunta}', this.value)"></textarea>
        </div>
      `;
      catBlock.appendChild(pregItem);
    });
    
    contenedor.appendChild(catBlock);
  }
  calcularPorcentajeEnVivo();
}

// =================================================================
// 3. INTERACCIÓN DEL INSPECTOR (Botones Táctiles)
// =================================================================
window.evaluar = function(idPregunta, valor, boton) {
  // Guardar el resultado seleccionado
  respuestasUsuario[idPregunta].resultado = valor;
  
  // Manejar estados visuales de los botones en el grupo
  const grupo = boton.parentElement;
  grupo.querySelectorAll('.btn-eval').forEach(btn => btn.classList.remove('active'));
  boton.classList.add('active');
  
  // Mostrar u ocultar la caja de observaciones condicionalmente (Solo aparece si es NC / '0')
  const obsContainer = document.getElementById(`obs-container-${idPregunta}`);
  if (valor === '0') {
    obsContainer.classList.remove('hidden');
  } else {
    obsContainer.classList.add('hidden');
    obsContainer.querySelector('textarea').value = "";
    respuestasUsuario[idPregunta].observaciones = "";
  }
  
  calcularPorcentajeEnVivo();
};

window.guardarObs = function(idPregunta, texto) {
  respuestasUsuario[idPregunta].observaciones = texto;
};

function calcularPorcentajeEnVivo() {
  let totalEvaluados = 0;
  let totalConformes = 0;
  
  for (const id in respuestasUsuario) {
    const res = respuestasUsuario[id].resultado;
    if (res === '1') {
      totalEvaluados++;
      totalConformes++;
    } else if (res === '0') {
      totalEvaluados++;
    }
  }
  
  const pct = totalEvaluados > 0 ? Math.round((totalConformes / totalEvaluados) * 100) : 0;
  document.getElementById('live-pct').textContent = `${pct}%`;
}

// =================================================================
// 4. ENVÍO DE DATOS A GOOGLE SHEETS
// =================================================================
document.getElementById('btn-enviar').addEventListener('click', async () => {
  // Validar si hay alguna pregunta marcada como NC que no tenga observación escrita
  for (const id in respuestasUsuario) {
    if (respuestasUsuario[id].resultado === '0' && !respuestasUsuario[id].observaciones.trim()) {
      alert(`Por favor, escribe una observación para la no conformidad detectada en el criterio ${id}.`);
      return;
    }
  }

  if (!confirm("¿Estás seguro de que deseas finalizar y enviar esta autoinspección?")) return;

  mostrarCargando(true);
  
  // Estructurar el paquete JSON tal como lo espera recibir el doPost de Apps Script
  const respuestasPayload = Object.keys(respuestasUsuario).map(id => ({
    idPregunta: id,
    resultado: respuestasUsuario[id].resultado,
    observaciones: respuestasUsuario[id].observaciones
  }));

  const payload = {
    fecha: document.getElementById('fecha').value,
    inspector: document.getElementById('inspector').value.trim(),
    area: document.getElementById('area').value,
    enProduccion: document.querySelector('input[name="enProduccion"]:checked').value,
    respuestas: respuestasPayload
  };

  try {
    const response = await fetch(BASE_URL, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    
    if (result.result === "Éxito") {
      document.getElementById('generated-id').textContent = result.idInspeccion;
      pantallafolrmulario = pantallaFormulario.classList.add('hidden');
      pantallaExito.classList.remove('hidden');
    } else {
      throw new Error(result.error || "Error desconocido");
    }
  } catch (error) {
    alert("Error crítico al guardar la inspección: " + error.message);
  } finally {
    mostrarCargando(false);
  }
});

function mostrarCargando(visible) {
  if (visible) {
    loadingOverlay.classList.remove('hidden');
  } else {
    loadingOverlay.classList.add('hidden');
  }
}