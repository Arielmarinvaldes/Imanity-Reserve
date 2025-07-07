const express = require('express');
const cors = require('cors');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');

// Carga las credenciales desde una variable de entorno (recomendado para Render)
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/reservar', async (req, res) => {
  try {
    const { guestName, partySize, reservationDateTime, guestPhone, needsHighChair } = req.body;
    const newReservation = {
      guestName,
      partySize: parseInt(partySize, 10),
      dateTime: Timestamp.fromDate(new Date(reservationDateTime)),
      guestPhone: guestPhone || "",
      needsHighChair: needsHighChair || false,
      status: "Upcoming",
      tableId: ""
    };
    const docRef = await db.collection('reservations').add(newReservation);
    res.json({ success: true, reservationId: docRef.id });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Usa el puerto asignado por Render o 3000 por defecto
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API listening on port ${PORT}`));