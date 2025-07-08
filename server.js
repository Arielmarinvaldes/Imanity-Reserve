const express = require('express');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const path = require('path');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');

// Carga las credenciales de tu archivo de cuenta de servicio
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

// Inicializa la app de Firebase
initializeApp({
  credential: cert(serviceAccount)
});

// Obtén referencia a Firestore
const db = getFirestore();

// Inicializa Express ANTES de usar app.use
const app = express();

// Rate limiting: máximo 100 peticiones por IP cada 15 minutos
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, error: "Demasiadas peticiones, intenta más tarde." }
}));

// Solo permite peticiones desde tu dominio de Render
app.use(cors({ origin: 'https://imanity-reserve.onrender.com' }));
app.use(express.json());

// Sirve index.html en la raíz
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// --- Función para crear una nueva reserva ---
async function createWebReservation(reservationData) {
  try {
    let { guestName, partySize, reservationDateTime, guestPhone, needsHighChair } = reservationData;

    // Validar campos obligatorios
    if (!guestName) {
      throw new Error("El nombre es obligatorio.");
    }
    if (!partySize) {
      throw new Error("El número de personas es obligatorio.");
    }
    if (!reservationDateTime) {
      throw new Error("La fecha de reserva es obligatoria.");
    }
    if (!guestPhone) {
      throw new Error("El teléfono es obligatorio.");
    }

    // Validar longitud y formato del nombre (solo letras y espacios, 2-40 caracteres)
    if (
      typeof guestName !== "string" ||
      guestName.length < 2 ||
      guestName.length > 40 ||
      !/^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+$/.test(guestName)
    ) {
      throw new Error("El nombre debe tener entre 2 y 40 letras y solo puede contener letras y espacios.");
    }

    // Validar que partySize sea número y rango razonable
    if (isNaN(partySize) || partySize <= 0 || partySize > 30) {
      throw new Error("El número de personas debe ser un número mayor que 0 y menor que 30.");
    }

    // Validar teléfono: solo números, 7-15 dígitos
    if (!/^\d{7,15}$/.test(guestPhone)) {
      throw new Error("El teléfono debe contener solo números y tener entre 7 y 15 dígitos.");
    }

    // Validar fecha: formato válido y futura
    const dateObj = new Date(reservationDateTime);
    if (isNaN(dateObj.getTime()) || dateObj < new Date()) {
      throw new Error("La fecha de reserva no es válida o es anterior a hoy.");
    }

    // Formatear el nombre: primera letra mayúscula, resto minúsculas
    guestName = guestName
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');

    const newReservation = {
      guestName,
      partySize: parseInt(partySize, 10),
      dateTime: Timestamp.fromDate(dateObj),
      guestPhone,
      needsHighChair: needsHighChair || false,
      status: "Upcoming",
      tableId: ""
    };

    const docRef = await db.collection('reservations').add(newReservation);
    console.log('Reservation created with ID: ', docRef.id);
    return { success: true, reservationId: docRef.id };

  } catch (error) {
    console.error("Error creating reservation: ", error);
    // Solo mostramos un mensaje genérico al usuario
    return { success: false, error: "Error al crear la reserva. Inténtalo de nuevo." };
  }
}

// Endpoint para recibir reservas desde el frontend
app.post('/api/reservar', async (req, res) => {
  const result = await createWebReservation(req.body);
  if (result.success) {
    res.json(result);
  } else {
    res.status(500).json(result);
  }
});

// Usa el puerto asignado por Render o 3000 por defecto
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API listening on port ${PORT}`));