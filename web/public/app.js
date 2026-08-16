const form = document.getElementById('contactForm');
const messageDiv = document.getElementById('message');

// URL del webhook de n8n
const N8N_WEBHOOK_URL = 'http://localhost:5678/webhook/formulario';

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const datos = {
        nombre: document.getElementById('nombre').value,
        email: document.getElementById('email').value,
        numero_whatsapp: document.getElementById('numero_whatsapp').value,
        mensaje: document.getElementById('mensaje').value,
        timestamp: new Date().toISOString()
    };

    const btn = form.querySelector('.btn-submit');
    btn.disabled = true;
    btn.textContent = 'Enviando...';

    try {
        const response = await fetch(N8N_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datos)
        });

        if (response.ok) {
            mostrarMensaje('✅ ¡Gracias! Tu mensaje fue recibido. Te contactaremos pronto.', 'success');
            form.reset();
        } else {
            mostrarMensaje('❌ Error al enviar. Intenta de nuevo.', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarMensaje('❌ Error de conexión. Verifica que n8n esté activo.', 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Enviar Formulario';
    }
});

function mostrarMensaje(texto, tipo) {
    messageDiv.textContent = texto;
    messageDiv.className = 'message ' + tipo;
    setTimeout(() => {
        messageDiv.className = 'message';
    }, 5000);
}
