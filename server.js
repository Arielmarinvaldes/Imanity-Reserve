const express = require('express');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const path = require('path');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');

// Carga las credenciales de tu archivo de cuenta de servicio
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

const app = express();

app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, error: "Demasiadas peticiones, intenta más tarde." }
}));

app.use(cors({ origin: 'https://imanity-reserve.onrender.com' }));
app.use(express.json());

// Sirve index.html en la raíz
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Función para crear nueva reserva
async function createWebReservation(restaurantId, reservationData) {
  if (!restaurantId) {
    console.error("Error: Restaurant ID is required.");
    return { success: false, error: "Restaurant ID is missing." };
  }

  try {
    let { guestName, partySize, reservationDateTime, guestPhone, needsHighChair } = reservationData;

    if (!guestName) {
      throw new Error("El nombre es obligatorio.");
    }
    if (!partySize) {
      throw new Error("El número de personas es obligatorio.");
    }
    if (!reservationDateTime) {
      throw new Error("La fecha de reserva es obligatoria.");
    }

    if (
      typeof guestName !== "string" ||
      guestName.length < 2 ||
      guestName.length > 40 ||
      !/^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+$/.test(guestName)
    ) {
      throw new Error("El nombre debe tener entre 2 y 40 letras y solo puede contener letras y espacios.");
    }

    if (isNaN(partySize) || partySize <= 0 || partySize > 30) {
      throw new Error("El número de personas debe ser un número mayor que 0 y menor que 30.");
    }

    if (guestPhone && !/^\d{7,15}$/.test(guestPhone)) {
      throw new Error("El teléfono debe contener solo números y tener entre 7 y 15 dígitos.");
    }

    const dateObj = new Date(reservationDateTime);
    if (isNaN(dateObj.getTime()) || dateObj < new Date()) {
      throw new Error("La fecha de reserva no es válida o es anterior a hoy.");
    }

    guestName = guestName
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');

    const newReservation = {
      guestName,
      partySize: parseInt(partySize, 10),
      dateTime: Timestamp.fromDate(dateObj),
      guestPhone: guestPhone || "",
      needsHighChair: needsHighChair || false,
      status: "Upcoming",
      tableId: ""
    };

    const reservationPath = `restaurants/${restaurantId}/reservations`;
    const docRef = await db.collection(reservationPath).add(newReservation);
    console.log(`Reservation created with ID: ${docRef.id} for restaurant: ${restaurantId}`);
    return { success: true, reservationId: docRef.id };

  } catch (error) {
    console.error("Error creating reservation: ", error);
    return { success: false, error: "Error al crear la reserva. Inténtalo de nuevo." };
  }
}

app.post('/api/reservar', async (req, res) => {
  const { restaurantId, ...reservationData } = req.body;

  if (!restaurantId) {
    return res.status(400).json({ success: false, error: "Restaurant ID is missing." });
  }

  const result = await createWebReservation(restaurantId, reservationData);
  if (result.success) {
    res.json(result);
  } else {
    res.status(500).json(result);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API listening on port ${PORT}`));
