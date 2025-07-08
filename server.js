const express = require('express');
const cors = require('cors');
const path = require('path');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');

// Carga las credenciales de tu archivo de cuenta de servicio
// const serviceAccount = require('./datos-imanity-reserve-firebase-adminsdk-fbsvc-4f33db07ca.json');
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
// Inicializa la app de Firebase
initializeApp({
  credential: cert(serviceAccount)
});

// Obtén referencia a Firestore
const db = getFirestore();

const app = express();
app.use(cors());
app.use(express.json());

// Sirve index.html en la raíz
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// --- Función para crear una nueva reserva ---
async function createWebReservation(reservationData) {
  try {
    const { guestName, partySize, reservationDateTime, guestPhone, needsHighChair } = reservationData;

    const newReservation = {
      guestName: guestName,
      partySize: parseInt(partySize, 10),
      dateTime: Timestamp.fromDate(new Date(reservationDateTime)),
      guestPhone: guestPhone || "",
      needsHighChair: needsHighChair || false,
      status: "Upcoming",
      tableId: ""
    };

    const docRef = await db.collection('reservations').add(newReservation);
    console.log('Reservation created with ID: ', docRef.id);
    return { success: true, reservationId: docRef.id };

  } catch (error) {
    console.error("Error creating reservation: ", error);
    return { success: false, error: error.message };
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